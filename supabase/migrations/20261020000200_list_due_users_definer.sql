-- list_due_mission_users reads auth.users (migration 20261019000200, to skip guests), but it ran
-- as the caller: service_role has no select on auth.users, so the scheduled missions job failed
-- with "permission denied for table users". It now runs as its owner. Execution stays restricted
-- to service_role (revoked from public, anon and authenticated in 20261019000200), and the
-- function only returns user ids and dates.

alter function public.list_due_mission_users(timestamptz, integer, interval, integer) security definer;
