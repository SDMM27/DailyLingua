-- Phase A hardening: the global cap on guest missions, made atomic and tamper-proof.
--
-- 20261019000300 counted the missions of users who are still anonymous. That count went down when a
-- guest account was deleted (its missions cascade away) or upgraded to an e-mail account, and the
-- check ran apart from the mission claim, so concurrent requests could all pass it. Guest mission
-- starts are now recorded in a log that only account-independent cleanup shrinks, and the check and
-- the record happen in one call, serialised by a lock.

drop function public.count_recent_guest_missions(interval);
drop index public.missions_created_at_idx;

-- One row per guest and mission day, kept when the account is deleted or upgraded (no foreign key).
-- Rows older than two days no longer matter for the 24-hour window and are pruned on the way.
create table public.guest_mission_reservations (
  user_id uuid not null,
  mission_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, mission_date)
);

create index guest_mission_reservations_created_at_idx on public.guest_mission_reservations (created_at);

alter table public.guest_mission_reservations enable row level security;
revoke all on public.guest_mission_reservations from anon, authenticated;

-- Reserves the mission of guest `p_user_id` for `p_date`, or returns false when all guests together
-- already reserved `p_cap` missions over the last 24 hours. A day already reserved stays allowed
-- without counting again, so retries of the same mission are free but a deleted account's are not.
create function public.reserve_guest_mission(p_user_id uuid, p_date date, p_cap integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
begin
  -- Serialises reservations: two requests cannot both see the last free slot.
  perform pg_advisory_xact_lock(hashtext('public.reserve_guest_mission'));

  if exists (
    select 1 from public.guest_mission_reservations
    where user_id = p_user_id and mission_date = p_date
  ) then
    return true;
  end if;

  delete from public.guest_mission_reservations where created_at < now() - interval '2 days';

  select count(*)::integer into v_recent
  from public.guest_mission_reservations
  where created_at >= now() - interval '24 hours';
  if v_recent >= p_cap then
    return false;
  end if;

  insert into public.guest_mission_reservations (user_id, mission_date) values (p_user_id, p_date);
  return true;
end;
$$;

revoke execute on function public.reserve_guest_mission(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.reserve_guest_mission(uuid, date, integer) to service_role;
