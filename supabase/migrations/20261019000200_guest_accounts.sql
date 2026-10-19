-- Phase A: accounts without e-mail (Supabase anonymous sign-ins), for the free trial.
--
--  1. list_due_mission_users skips anonymous users: the scheduled job spends model money only on
--     people who have an account. A guest gets their mission when they open the app (and the app
--     caps the trial at a few days).
--  2. delete_stale_anonymous_users: removes anonymous users who have not come back for a while.
--     Deleting the auth user cascades to the profile and from there to every table holding user
--     data (all foreign keys are `on delete cascade`). Called by the daily missions job.

create or replace function public.list_due_mission_users(
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

create function public.delete_stale_anonymous_users(
  p_inactive_for interval default interval '30 days',
  p_limit integer default 500
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  -- A guest signs in only once: last_sign_in_at stays at that day. Their activity is the last time
  -- one of their sessions was refreshed (auth.sessions.refreshed_at / updated_at).
  with activity as (
    select u.id,
      greatest(
        u.created_at,
        u.last_sign_in_at,
        (select max(greatest(s.updated_at, s.refreshed_at)) from auth.sessions s where s.user_id = u.id)
      ) as last_seen
    from auth.users u
    where u.is_anonymous
  ), stale as (
    select a.id
    from activity a
    where a.last_seen < now() - p_inactive_for
    order by a.last_seen
    limit greatest(least(p_limit, 5000), 0)
  ), removed as (
    delete from auth.users u using stale where u.id = stale.id returning 1
  )
  select count(*)::integer into v_deleted from removed;
  return v_deleted;
end;
$$;

revoke execute on function public.delete_stale_anonymous_users(interval, integer)
  from public, anon, authenticated;
grant execute on function public.delete_stale_anonymous_users(interval, integer) to service_role;
