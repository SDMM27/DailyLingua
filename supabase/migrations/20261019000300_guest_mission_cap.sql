-- Phase A hardening: a global cap on the missions prepared for guests (anonymous users).
--
-- Each guest mission calls the language model. The per-guest trial limit does not bound the total
-- if many anonymous accounts are created, so the app can refuse new guest missions once this count
-- reaches GUEST_DAILY_MISSION_CAP (see src/lib/generation/server.ts).

create index missions_created_at_idx on public.missions (created_at);

-- Missions of guests created over the last `p_window` (a mission row is created when its
-- generation starts, so this counts generations, not only finished missions).
create function public.count_recent_guest_missions(
  p_window interval default interval '24 hours'
) returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.missions m
  join auth.users u on u.id = m.user_id
  where m.created_at >= now() - p_window
    and u.is_anonymous;
$$;

revoke execute on function public.count_recent_guest_missions(interval) from public, anon, authenticated;
grant execute on function public.count_recent_guest_missions(interval) to service_role;
