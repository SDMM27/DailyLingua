-- Opt-in settings and the reminder job. Existing notification rows remain readable.
alter table app.profile add column reminder_reset_at timestamptz;
alter table app.notification_log add column delivery_mode text not null default 'daily'
  check (delivery_mode in ('daily', 'weekly'));
create index notification_delivery_history on app.notification_log (user_id, sent_at desc) where status = 'sent';
create index profile_reminders_enabled on app.profile (user_id)
  where game_settings #>> '{notifications,enabled}' = 'true' and reminder_time is not null;

-- A daily and a weekly message cannot each reserve the same day, even in concurrent runs.
-- Existing historical rows may contain both kinds, so enforce the new key on reservations.
alter table app.notification_log add column reserved boolean not null default false;
create unique index notification_one_reservation_per_day on app.notification_log (user_id, day) where reserved;

-- Keep the existing RPC but require proof of the existing subscription when a different
-- account on the same browser takes it over. Knowing the endpoint alone is insufficient.
create or replace function app.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  existing app.push_subscription;
  result uuid;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not app.is_allowed_push_endpoint(p_endpoint) or
     p_p256dh is null or p_p256dh !~ '^[A-Za-z0-9_-]{1,200}$' or
     p_auth is null or p_auth !~ '^[A-Za-z0-9_-]{1,100}$' then
    raise exception 'invalid push subscription' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_endpoint, 6841));
  perform 1 from app.profile p where p.user_id = uid for update;
  if not found then raise exception 'profile not found' using errcode = 'P0002'; end if;
  select * into existing from app.push_subscription s where s.endpoint = p_endpoint for update;
  if existing.user_id is distinct from uid then
    if existing.user_id is not null and (existing.p256dh <> p_p256dh or existing.auth <> p_auth) then
      raise exception 'invalid push subscription' using errcode = '22023';
    end if;
    if (select count(*) from app.push_subscription s where s.user_id = uid) >= 10 then
      raise exception 'at most 10 push subscriptions per user' using errcode = '23514';
    end if;
  end if;
  insert into app.push_subscription as s (user_id, endpoint, p256dh, auth, user_agent)
  values (uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh,
    auth = excluded.auth, user_agent = excluded.user_agent, failures = 0,
    last_success_at = case when s.user_id = excluded.user_id then s.last_success_at end
  returning id into result;
  perform app.mark_active(uid);
  return result;
end;
$$;

create function app.configure_reminder(
  p_enabled boolean, p_time text, p_weekly_summary boolean,
  p_endpoint text default null, p_p256dh text default null, p_auth text default null,
  p_user_agent text default null, p_reset boolean default false
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  enabled_ boolean;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_enabled is null or p_weekly_summary is null or p_reset is null or
     p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'invalid reminder settings' using errcode = '22023';
  end if;

  if p_endpoint is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_endpoint, 6841));
  end if;
  select coalesce(p.game_settings #>> '{notifications,enabled}' = 'true', false)
    into enabled_ from app.profile p where p.user_id = uid for update;
  if not found then raise exception 'profile not found' using errcode = 'P0002'; end if;

  if p_enabled and p_endpoint is not null then
    perform app.save_push_subscription(p_endpoint, p_p256dh, p_auth, p_user_agent);
  elsif p_enabled and not exists (select 1 from app.push_subscription s where s.user_id = uid) then
    raise exception 'push subscription required' using errcode = '22023';
  elsif not p_enabled and p_endpoint is not null then
    perform app.delete_push_subscription(p_endpoint);
  end if;

  perform app.save_game_settings(jsonb_build_object('notifications',
    jsonb_build_object('enabled', p_enabled, 'time', p_time, 'weeklySummary', p_weekly_summary)));
  if p_enabled and (p_reset or not enabled_) then
    update app.profile set reminder_reset_at = clock_timestamp() where user_id = uid;
  end if;
end;
$$;
revoke execute on function app.configure_reminder(boolean, text, boolean, text, text, text, text, boolean) from public, anon;
grant execute on function app.configure_reminder(boolean, text, boolean, text, text, text, text, boolean) to authenticated;

-- Select using the accepted profile zone. Attribute a slot to its scheduled learning day,
-- even when cron reaches the slot on the other side of midnight or the 04:00 boundary.
create function app.reminders_due(p_at timestamptz, p_after uuid default null, p_only uuid default null)
returns table (
  user_id uuid, day date, locale text, delivery_mode text, template text,
  daily_minutes smallint, active_days integer, rewrites integer
)
language sql stable set search_path = ''
as $$
  select p.user_id, c.day, p.ui_language, m.mode,
    case when m.mode = 'weekly' and h.weekly_count = 0 then 'weekly_first'
         when w.summary then 'weekly_summary'
         when h.previous_template = 'session' then 'session_alternate' else 'session' end,
    e.daily_minutes, w.active_days, w.rewrites
  from app.profile p
  cross join lateral (
    select p_at at time zone p.time_zone as local_at
  ) local
  cross join lateral (
    select floor(extract(epoch from local.local_at::time) / 60)::integer as minute,
           floor(extract(epoch from p.reminder_time) / 60)::integer as chosen
  ) t
  cross join lateral (
    select (t.minute - t.chosen + 1440) % 1440 as delay_minutes
  ) slot
  cross join lateral (
    select (local.local_at - slot.delay_minutes * interval '1 minute' - interval '4 hours')::date as day
  ) c
  cross join lateral (
    select en.daily_minutes from app.enrollment en where en.user_id = p.user_id and en.active
    order by en.created_at, en.language limit 1
  ) e
  cross join lateral (
    select count(*) filter (where a.delivery_mode = 'daily' and a.day > coalesce(a.reset_day, '-infinity'::date)) as daily_ignored,
           count(*) filter (where a.delivery_mode = 'weekly' and a.day > coalesce(a.reset_day, '-infinity'::date)) as weekly_ignored,
           count(*) filter (where a.delivery_mode = 'weekly') as weekly_count,
           (array_agg(a.template order by a.sent_at desc, a.id desc))[1] as previous_template
    from (
      select recent.*, max(recent.day) filter (where recent.engaged) over () as reset_day
      from (
        select l.id, l.day, l.sent_at, l.delivery_mode, l.template,
               l.opened_at is not null or exists (
                 select 1 from app.session s where s.user_id = l.user_id and s.day = l.day
                   and s.started_at is not null
               ) as engaged
        from app.notification_log l
        where l.user_id = p.user_id and l.status = 'sent' and l.day < c.day
          and l.sent_at >= coalesce(p.reminder_reset_at, '-infinity'::timestamptz)
        order by l.sent_at desc, l.id desc
        limit 8
      ) recent
    ) a
  ) h
  cross join lateral (select case when h.daily_ignored >= 5 or h.weekly_count > 0 then 'weekly' else 'daily' end as mode) m
  cross join lateral (
    select (select count(*)::integer from app.learning_day d where d.user_id = p.user_id
             and d.day between c.day - 6 and c.day and d.first_activity_at is not null) as active_days,
           (select count(*)::integer from app.rewrite r where r.user_id = p.user_id and r.accepted
             and r.created_at >= (((c.day - 6)::timestamp + interval '4 hours') at time zone p.time_zone)) as rewrites
  ) counts
  cross join lateral (
    select counts.*, extract(isodow from c.day) = 7 and counts.active_days > 0
      and p.game_settings #>> '{notifications,weeklySummary}' is distinct from 'false' as summary
  ) w
  where (p_after is null or p.user_id > p_after)
    and (p_only is null or p.user_id = p_only)
    and p.game_settings #>> '{notifications,enabled}' = 'true'
    and p.reminder_time is not null
    and slot.delay_minutes <= 30
    and (t.chosen >= 1290 or t.chosen < 480 or t.minute < 1290)
    and h.weekly_ignored < 3
    and (m.mode = 'daily' or extract(isodow from c.day) = 7)
    and not coalesce((
      select sc.value @> jsonb_build_array(extract(isodow from c.day)::integer)
      from app.setting_change sc
      where sc.user_id = p.user_id and sc.key = 'streak.restDays' and sc.effective_day <= c.day
      order by sc.effective_day desc, sc.changed_at desc, sc.id desc limit 1
    ), false)
    and (w.summary or not exists (
      select 1 from app.learning_day d where d.user_id = p.user_id and d.day = c.day and d.validated
    ))
    and (w.summary or not exists (
      select 1 from app.session s where s.user_id = p.user_id and s.day = c.day
        and s.started_at between p_at - interval '2 hours' and p_at
    ))
    and exists (select 1 from app.push_subscription s where s.user_id = p.user_id)
    and not exists (select 1 from app.notification_log l where l.user_id = p.user_id and l.day = c.day)
  order by p.user_id
  limit 100;
$$;
revoke execute on function app.reminders_due(timestamptz, uuid, uuid) from public, anon, authenticated;
grant execute on function app.reminders_due(timestamptz, uuid, uuid) to service_role;

create function app.claim_reminder(
  p_user_id uuid, p_day date, p_at timestamptz, p_template text, p_mode text
) returns table (log_id bigint, subscription_id uuid, endpoint text, p256dh text, auth text)
language sql volatile set search_path = ''
as $$
  with current_profile as materialized (
    select p.user_id from app.profile p
    where p.user_id = p_user_id and p.game_settings #>> '{notifications,enabled}' = 'true'
    for update
  ), chosen as materialized (
    select s.* from app.push_subscription s join current_profile p on p.user_id = s.user_id
    where app.is_allowed_push_endpoint(s.endpoint)
      and s.p256dh ~ '^B[A-Za-z0-9_-]{86}$' and s.auth ~ '^[A-Za-z0-9_-]{22}$'
    order by s.last_success_at desc nulls last, s.created_at desc, s.id limit 1
  ), claimed as (
    insert into app.notification_log (user_id, day, kind, template, sent_at, status, delivery_mode, reserved)
    select p_user_id, p_day, case when p_template = 'weekly_summary' then 'weekly_summary' else 'daily' end,
      p_template, p_at, 'failed', p_mode, true
    from chosen
    where exists (
      select 1 from app.reminders_due(p_at, null, p_user_id) d
      where d.day = p_day and d.template = p_template and d.delivery_mode = p_mode
    )
    on conflict do nothing
    returning id
  )
  select c.id, s.id, s.endpoint, s.p256dh, s.auth from claimed c cross join chosen s;
$$;
revoke execute on function app.claim_reminder(uuid, date, timestamptz, text, text) from public, anon, authenticated;
grant execute on function app.claim_reminder(uuid, date, timestamptz, text, text) to service_role;

create function app.mark_reminder_opened(p_log_id bigint) returns void
language sql security definer set search_path = ''
as $$
  update app.notification_log
  set opened_at = coalesce(opened_at, clock_timestamp())
  where id = p_log_id and user_id = (select auth.uid()) and reserved;
$$;
revoke execute on function app.mark_reminder_opened(bigint) from public, anon;
grant execute on function app.mark_reminder_opened(bigint) to authenticated;
