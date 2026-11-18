-- Schema `app`, milestone 2, block S4: push subscriptions, notification log and content reports.
-- Nothing in `public` is modified. Spec: docs/refonte/specs/j2-architecture.md section 3.5 and section 7,
-- docs/refonte/specs/j2-pr1-lots.md (lot S4).
--
-- Client-callable functions (auth.uid() only, closed validation): save_push_subscription,
-- delete_push_subscription, report_content. Everything else is written by service_role.

-- Push subscriptions ----------------------------------------------------------------------------------------

create table app.push_subscription (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000 and endpoint like 'https://%'),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  failures integer not null default 0 check (failures >= 0)
);

create index push_subscription_user_idx on app.push_subscription (user_id);

alter table app.push_subscription enable row level security;
-- By column: the keys of the subscription are never readable by a client.
grant select (id, user_id, endpoint, user_agent, created_at, last_success_at, failures)
  on app.push_subscription to authenticated;
create policy "push_subscription: owner can read" on app.push_subscription
  for select to authenticated using (user_id = (select auth.uid()));

-- Closed list of push services: the server must never relay a request to an arbitrary address (SSRF).
-- https only, the host is one of the listed services (port 443 or none), no user information.
create function app.is_allowed_push_endpoint(p_endpoint text) returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_host text;
begin
  if p_endpoint is null or char_length(p_endpoint) > 1000
     or p_endpoint !~ '^https://[a-z0-9.-]+(:443)?/[^[:space:]\\]*$' then
    return false;
  end if;
  v_host := substring(p_endpoint from '^https://([a-z0-9.-]+)');
  return v_host in ('web.push.apple.com', 'fcm.googleapis.com', 'updates.push.services.mozilla.com')
    or v_host ~ '^[a-z0-9-]+\.notify\.windows\.com$';
end;
$$;

create function app.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not app.is_allowed_push_endpoint(p_endpoint) then
    raise exception 'push endpoint not allowed' using errcode = '22023';
  end if;
  if p_p256dh is null or p_p256dh !~ '^[A-Za-z0-9_-]{1,200}$'
     or p_auth is null or p_auth !~ '^[A-Za-z0-9_-]{1,100}$' then
    raise exception 'invalid push keys' using errcode = '22023';
  end if;

  -- Serialises concurrent calls of the same user (the limit below).
  perform 1 from app.profile p where p.user_id = uid for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  -- The endpoint belongs to a browser: when it is already known (another account signed in on the same
  -- browser, or a renewed subscription) it is handed to the current user.
  if not exists (select 1 from app.push_subscription s where s.endpoint = p_endpoint)
     and (select count(*) from app.push_subscription s where s.user_id = uid) >= 10 then
    raise exception 'at most 10 push subscriptions per user' using errcode = '23514';
  end if;

  insert into app.push_subscription as s (user_id, endpoint, p256dh, auth, user_agent)
  values (uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
  set user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      failures = 0
  returning s.id into v_id;

  perform app.mark_active(uid);
  return v_id;
end;
$$;

-- Deletes a subscription of the current user. Returns whether a row was deleted.
create function app.delete_push_subscription(p_endpoint text) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_n integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_endpoint is null or char_length(p_endpoint) > 1000 then
    raise exception 'invalid endpoint' using errcode = '22023';
  end if;

  delete from app.push_subscription s where s.user_id = uid and s.endpoint = p_endpoint;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

-- Notification log -----------------------------------------------------------------------------------------------

create table app.notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('daily', 'weekly_summary')),
  template text not null check (char_length(template) between 1 and 80),
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  status text not null default 'sent' check (status in ('sent', 'failed', 'expired')),
  -- A kind is sent once a day: two concurrent runs of the reminder job cannot both send.
  unique (user_id, day, kind)
);

alter table app.notification_log enable row level security;
grant select on app.notification_log to authenticated;
create policy "notification_log: owner can read" on app.notification_log
  for select to authenticated using (user_id = (select auth.uid()));

-- Content reports ---------------------------------------------------------------------------------------------------

create table app.content_report (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_kind text not null check (target_kind in ('text', 'text_item', 'error_item', 'correction')),
  target_id text not null check (char_length(target_id) between 1 and 100),
  reason text not null check (reason in ('wrong_answer', 'unnatural', 'offensive', 'other')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index content_report_user_idx on app.content_report (user_id, created_at);

alter table app.content_report enable row level security;
grant select on app.content_report to authenticated;
create policy "content_report: owner can read" on app.content_report
  for select to authenticated using (user_id = (select auth.uid()));

-- Reports a text, an item of a published text, or an error item or correction of the user. At most 20 reports
-- per learning day. Errors: 28000 no signed-in user; 22023 invalid parameter; 23503 target unknown or not
-- visible to the user; 23514 daily limit reached.
create function app.report_content(
  p_target_kind text,
  p_target_id text,
  p_reason text,
  p_note text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_tz text;
  v_today date;
  v_target uuid;
  v_found boolean;
  v_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_target_kind is null or p_target_kind <> all (array['text', 'text_item', 'error_item', 'correction'])
     or p_reason is null or p_reason <> all (array['wrong_answer', 'unnatural', 'offensive', 'other'])
     or p_target_id is null
     or p_target_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or (p_note is not null and char_length(p_note) > 500) then
    raise exception 'invalid report' using errcode = '22023';
  end if;
  v_target := p_target_id::uuid;

  -- Serialises concurrent reports of the same user (the daily limit).
  select p.time_zone into v_tz from app.profile p where p.user_id = uid for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  -- The target must be something the user can see.
  v_found := case p_target_kind
    when 'text' then exists (select 1 from app.text t where t.id = v_target and t.status = 'published')
    when 'text_item' then exists (
      select 1 from app.text_item i join app.text t on t.id = i.text_id
      where i.id = v_target and t.status = 'published')
    when 'error_item' then exists (select 1 from app.error_item e where e.id = v_target and e.user_id = uid)
    else exists (select 1 from app.correction c where c.id = v_target and c.user_id = uid)
  end;
  if not v_found then
    raise exception 'unknown report target' using errcode = '23503';
  end if;

  v_today := app.learning_day_at(v_tz, now());
  if (select count(*) from app.content_report r
      where r.user_id = uid and app.learning_day_at(v_tz, r.created_at) = v_today) >= 20 then
    raise exception 'at most 20 reports per day' using errcode = '23514';
  end if;

  insert into app.content_report (user_id, target_kind, target_id, reason, note)
  values (uid, p_target_kind, v_target::text, p_reason, p_note)
  returning id into v_id;

  perform app.mark_active(uid);
  return v_id;
end;
$$;

-- Privileges of the functions ---------------------------------------------------------------------------------------------

revoke execute on function app.is_allowed_push_endpoint(text) from public, anon, authenticated;
grant execute on function app.is_allowed_push_endpoint(text) to service_role;

revoke execute on function app.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function app.save_push_subscription(text, text, text, text) to authenticated;
revoke execute on function app.delete_push_subscription(text) from public, anon;
grant execute on function app.delete_push_subscription(text) to authenticated;
revoke execute on function app.report_content(text, text, text, text) from public, anon;
grant execute on function app.report_content(text, text, text, text) to authenticated;

grant select, insert, update, delete on all tables in schema app to service_role;
grant usage, select on all sequences in schema app to service_role;
