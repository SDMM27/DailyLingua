-- Languages on chosen weekdays (phase M2): user_languages.days lists the ISO weekdays
-- (1 = Monday … 7 = Sunday) on which a language is worked. A weekday without any language is a
-- rest day: no mission.
--
--  * user_languages.days smallint[], default every day (rows saved before this keep working
--    every day), with a check: one-dimensional, 1 to 7 values, each between 1 and 7, no duplicate.
--    A check cannot hold a subquery, so the test lives in a small immutable function.
--  * save_preferences takes `days` in each goal (absent = every day on insert, unchanged on
--    update) and computes profiles.daily_minutes as the busiest weekday: the largest sum, over
--    the seven weekdays, of the minutes (weight) of the goals worked that day. The body is
--    otherwise that of 20261028000100_language_minutes.sql.
--  * list_due_mission_users only lists a user with a language worked on their local weekday, so
--    the scheduled job makes no model call on a rest day. `create or replace` resets the function's
--    attributes: security definer (20261020000200), search_path and grants are stated again.
--    The body is otherwise that of 20261019000200_guest_accounts.sql.

create function public.is_valid_weekdays(p_days smallint[]) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_days is not null
    and array_ndims(p_days) = 1
    and cardinality(p_days) between 1 and 7
    and p_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    and cardinality(p_days) = (select count(distinct d) from unnest(p_days) as d);
$$;

alter table public.user_languages
  add column days smallint[] not null default '{1,2,3,4,5,6,7}',
  add constraint user_languages_days_check check (public.is_valid_weekdays(days));

create or replace function public.save_preferences(
  p_daily_minutes integer,
  p_topics text[],
  p_content_types text[],
  p_difficulty text,
  p_generation_time time,
  p_time_zone text,
  p_goals jsonb,
  p_show_streak boolean default true
) returns void
language plpgsql
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  profile_topics text[];
  profile_content_types text[];
  all_days constant smallint[] := '{1,2,3,4,5,6,7}';
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(p_goals) is distinct from 'array' or jsonb_array_length(p_goals) not between 1 and 4 then
    raise exception 'between 1 and 4 languages are required' using errcode = '23514';
  end if;

  -- Top-level topics / content types are only sent by old clients; without them the profile keeps its own.
  -- p_daily_minutes is ignored (clients still send it for the signature's sake): daily_minutes is
  -- recomputed at the end, once the languages are saved, as the busiest weekday's total.
  update public.profiles
  set topics = coalesce(p_topics, topics),
      content_types = coalesce(p_content_types, content_types),
      difficulty = p_difficulty,
      generation_time = p_generation_time,
      time_zone = p_time_zone,
      show_streak = coalesce(p_show_streak, show_streak)
  where id = uid
  returning topics, content_types into profile_topics, profile_content_types;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  -- Removed languages first, so the 4-language limit is never exceeded on the way.
  delete from public.user_languages ul
  where ul.user_id = uid
    and ul.language not in (select g.language from jsonb_to_recordset(p_goals) as g (language text));

  -- Update before insert: the "max 4 languages" trigger fires before ON CONFLICT is resolved,
  -- so an upsert of an existing language would be rejected for a user who already has four.
  update public.user_languages ul
  set level = g.level, target_level = g.target_level, focus = coalesce(g.focus, ''), weight = g.weight,
      days = coalesce(g.days, ul.days),
      purpose = coalesce(g.purpose, 'general'),
      topics = coalesce(g.topics, ul.topics),
      content_types = coalesce(g.content_types, ul.content_types)
  from jsonb_to_recordset(p_goals) as g (
    language text, level text, target_level text, focus text, weight integer, days smallint[], purpose text,
    topics text[], content_types text[]
  )
  where ul.user_id = uid and ul.language = g.language;

  insert into public.user_languages (user_id, language, level, target_level, focus, weight, days, purpose, topics, content_types)
  select uid, g.language, g.level, g.target_level, coalesce(g.focus, ''), g.weight, coalesce(g.days, all_days),
         coalesce(g.purpose, 'general'), coalesce(g.topics, profile_topics), coalesce(g.content_types, profile_content_types)
  from jsonb_to_recordset(p_goals) as g (
    language text, level text, target_level text, focus text, weight integer, days smallint[], purpose text,
    topics text[], content_types text[]
  )
  where not exists (
    select 1 from public.user_languages ul where ul.user_id = uid and ul.language = g.language
  );

  -- Busiest weekday: the largest sum, over the seven weekdays, of the minutes of the languages
  -- worked that day (a language whose days were not sent keeps the ones it had).
  update public.profiles
  set daily_minutes = (
    select max(day_total) from (
      select coalesce(sum(ul.weight), 0)::integer as day_total
      from generate_series(1, 7) as d
      left join public.user_languages ul on ul.user_id = uid and ul.days @> array[d::smallint]
      group by d
    ) as totals
  )
  where id = uid;
end;
$$;

revoke execute on function public.save_preferences(integer, text[], text[], text, time, text, jsonb, boolean)
  from public, anon;
grant execute on function public.save_preferences(integer, text[], text[], text, time, text, jsonb, boolean)
  to authenticated;

create or replace function public.list_due_mission_users(
  p_now timestamptz default now(),
  p_limit integer default 500,
  p_active_within interval default interval '14 days',
  p_max_attempts integer default 3
) returns table (user_id uuid, mission_date date)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, (p_now at time zone p.time_zone)::date
  from public.profiles p
  where (p_now at time zone p.time_zone)::time >= p.generation_time
    -- At least one language is worked on the user's local weekday (else it is a rest day).
    and exists (
      select 1 from public.user_languages ul
      where ul.user_id = p.id
        and extract(isodow from (p_now at time zone p.time_zone)::date)::smallint = any (ul.days)
    )
    -- Guests (anonymous users) only get a mission when they open the app.
    and not exists (select 1 from auth.users u where u.id = p.id and u.is_anonymous)
    -- Active: account created recently, or a mission started recently.
    and (
      p.created_at >= p_now - p_active_within
      or exists (
        select 1 from public.missions am
        where am.user_id = p.id and am.started_at >= p_now - p_active_within
      )
    )
    and not exists (
      select 1 from public.missions m
      where m.user_id = p.id
        and m.mission_date = (p_now at time zone p.time_zone)::date
        and (m.status = 'ready' or m.generation_attempts >= p_max_attempts)
    )
  order by p.generation_time, p.id
  limit greatest(least(p_limit, 5000), 0);
$$;

revoke execute on function public.list_due_mission_users(timestamptz, integer, interval, integer)
  from public, anon, authenticated;
grant execute on function public.list_due_mission_users(timestamptz, integer, interval, integer) to service_role;
