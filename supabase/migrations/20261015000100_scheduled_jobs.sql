-- Phase 6: scheduled jobs (content ingestion and daily missions), run as the service role.
--
--  1. list_due_mission_users: who should get today's mission now. A user is due when, in their own
--     time zone, generation_time has passed, they chose at least one language, they have no ready
--     mission for their local day and generation attempts are left. Users inactive for
--     `p_active_within` are skipped to cap model spending: they still get their mission when they
--     open the app (phase 5). The claim (claim_mission_generation) stays the lock: this list is
--     only a hint, so a user listed twice is never generated twice.
--  2. cron_runs: one row per job run (counters, duration, error), for monitoring. Nobody but the
--     service role can read or write it.

create function public.list_due_mission_users(
  p_now timestamptz default now(),
  p_limit integer default 500,
  p_active_within interval default interval '14 days',
  p_max_attempts integer default 3
) returns table (user_id uuid, mission_date date)
language sql
stable
set search_path = ''
as $$
  select p.id, (p_now at time zone p.time_zone)::date
  from public.profiles p
  where (p_now at time zone p.time_zone)::time >= p.generation_time
    and exists (select 1 from public.user_languages ul where ul.user_id = p.id)
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

create table public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check (job in ('ingest', 'missions')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'partial', 'error')),
  -- Counters only (no user data, no secrets): sources, contents, missions by outcome...
  stats jsonb not null default '{}' check (jsonb_typeof(stats) = 'object'),
  error text check (char_length(error) <= 500),
  check (status = 'running' or finished_at is not null)
);

create index cron_runs_job_started_at_idx on public.cron_runs (job, started_at desc);

-- No policy: RLS denies every row to anon and authenticated; service_role bypasses RLS.
alter table public.cron_runs enable row level security;
revoke all on public.cron_runs from anon, authenticated;
grant select, insert, update, delete on public.cron_runs to service_role;
