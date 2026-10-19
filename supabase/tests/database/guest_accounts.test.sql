-- pgTAP tests for migration 20261019000200: guests (anonymous users) in the daily job, and the
-- cleanup of stale ones. Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

--   guest    anonymous, Paris, 07:00, one language, new account      -> never due
--   member   same, but with an e-mail                                -> due
--   old      anonymous, last sign-in 40 days ago                     -> deleted
--   oldnull  anonymous, never signed in, created 40 days ago         -> deleted
--   fresh    anonymous, last sign-in 5 days ago                      -> kept
--   oldfull  e-mail account, last sign-in 40 days ago                -> kept
--   active   anonymous, signed in 40 days ago, session refreshed 2 days ago -> kept

insert into auth.users (instance_id, id, aud, role, email, is_anonymous, created_at, last_sign_in_at) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', null, true, '2030-05-09 08:00+00', '2030-05-09 08:00+00'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'member@test.invalid', false, '2030-05-09 08:00+00', '2030-05-09 08:00+00'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000e3', 'authenticated', 'authenticated', null, true, now() - interval '60 days', now() - interval '40 days'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000e4', 'authenticated', 'authenticated', null, true, now() - interval '40 days', null),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000e5', 'authenticated', 'authenticated', null, true, now() - interval '60 days', now() - interval '5 days'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000e6', 'authenticated', 'authenticated', 'oldfull@test.invalid', false, now() - interval '60 days', now() - interval '40 days'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000e7', 'authenticated', 'authenticated', null, true, now() - interval '60 days', now() - interval '40 days');

-- A guest signs in once; their activity shows in the refresh of their session.
insert into auth.sessions (id, user_id, created_at, updated_at, refreshed_at) values
  (gen_random_uuid(), 'a0000000-0000-4000-8000-0000000000e7', now() - interval '40 days', now() - interval '2 days', (now() - interval '2 days')::timestamp);

update public.profiles set generation_time = '07:00', time_zone = 'Europe/Paris'
where id::text like 'a0000000-0000-4000-8000-0000000000e_';
-- The profile trigger stamps created_at with now(); align guest and member on their account date
-- so both count as new (active) at p_now and only the guest flag tells them apart.
update public.profiles set created_at = '2030-05-09 08:00+00'
where id in ('a0000000-0000-4000-8000-0000000000e1', 'a0000000-0000-4000-8000-0000000000e2');
insert into public.user_languages (user_id, language, level, target_level)
select id, 'ru', 'B2', 'C1' from public.profiles where id::text like 'a0000000-0000-4000-8000-0000000000e_';
insert into public.missions (user_id, mission_date, budget_minutes, status, generated_at, started_at, generation_attempts)
values ('a0000000-0000-4000-8000-0000000000e3', '2030-05-01', 30, 'ready', '2030-05-01 05:00+00', '2030-05-01 06:00+00', 1);

create temporary table due on commit drop as
  select * from public.list_due_mission_users('2030-05-10 10:00+00');

select ok(not exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000e1'),
  'a guest is never due: they get their mission when they open the app');
select ok(exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000e2'),
  'a user with an e-mail is still due');

-- Cleanup -------------------------------------------------------------------------------------

set local role service_role;
select is(public.delete_stale_anonymous_users(), 2, 'two stale guests are deleted');
reset role;
select ok(not exists (select 1 from auth.users where id in
  ('a0000000-0000-4000-8000-0000000000e3', 'a0000000-0000-4000-8000-0000000000e4')),
  'inactive guests (by last sign-in, or by creation date when they never signed in) are gone');
select is((select count(*)::int from public.profiles where id in
  ('a0000000-0000-4000-8000-0000000000e3', 'a0000000-0000-4000-8000-0000000000e4')), 0,
  'their profile is gone');
select is((select count(*)::int from public.missions where user_id = 'a0000000-0000-4000-8000-0000000000e3'), 0,
  'their data cascades away');
select is((select count(*)::int from auth.users where id in
  ('a0000000-0000-4000-8000-0000000000e5', 'a0000000-0000-4000-8000-0000000000e6')), 2,
  'a recent guest and an inactive full account are kept');
select ok(exists (select 1 from auth.users where id = 'a0000000-0000-4000-8000-0000000000e7'),
  'a guest whose session was refreshed recently is kept, whatever their sign-in date');

-- Privileges ----------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000e5", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.delete_stale_anonymous_users()$$, '42501', null,
  'a user cannot run the cleanup');
reset role;
set local role anon;
select throws_ok($$select public.delete_stale_anonymous_users()$$, '42501', null,
  'anon cannot run the cleanup');
reset role;

select * from finish();
rollback;
