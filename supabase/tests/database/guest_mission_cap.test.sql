-- pgTAP tests for migration 20261019000300: the count behind the global cap on guest missions.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

--   g1   anonymous, mission created now and one created 2 days ago
--   g2   anonymous, mission created now (still generating)
--   m1   e-mail account, mission created now

insert into auth.users (instance_id, id, aud, role, email, is_anonymous) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', null, true),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', null, true),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', 'member-cap@test.invalid', false);

set local role service_role;
create temporary table before_count on commit drop as
  select public.count_recent_guest_missions() as n;
reset role;

insert into public.missions (user_id, mission_date, budget_minutes, status, generated_at, created_at) values
  ('a0000000-0000-4000-8000-0000000000c1', current_date, 30, 'ready', now(), now()),
  ('a0000000-0000-4000-8000-0000000000c1', current_date - 2, 30, 'ready', now() - interval '2 days', now() - interval '2 days'),
  ('a0000000-0000-4000-8000-0000000000c2', current_date, 30, 'generating', null, now()),
  ('a0000000-0000-4000-8000-0000000000c3', current_date, 30, 'ready', now(), now());

set local role service_role;
select is(public.count_recent_guest_missions() - (select n from before_count), 2,
  'counts the guest missions of the last 24 hours, finished or not, and not those of full accounts');
select is(public.count_recent_guest_missions(interval '3 days') - (select n from before_count), 3,
  'the window can be widened');
reset role;

-- Privileges ----------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.count_recent_guest_missions()$$, '42501', null,
  'a user cannot read the count');
reset role;
set local role anon;
select throws_ok($$select public.count_recent_guest_missions()$$, '42501', null,
  'anon cannot read the count');
reset role;

select has_index('public', 'missions', 'missions_created_at_idx', 'missions are indexed by creation time');

select * from finish();
rollback;
