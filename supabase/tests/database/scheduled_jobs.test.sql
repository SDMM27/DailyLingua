-- pgTAP tests for migration 20261015000100: users due for a mission, and the cron_runs log.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Users (the profile is created by trigger) ---------------------------------------------------
--   due      Paris, 07:00, one language, active (new account)          -> due
--   tokyo    Tokyo, 07:00: already the next day there, past 07:00      -> due for the next day
--   late     Paris, 20:00                                               -> not yet
--   nolang   Paris, 07:00, no language                                  -> never
--   idle     Paris, created 60 days ago, nothing started                -> skipped (inactive)
--   back     Paris, created 60 days ago, mission started 3 days ago     -> due
--   ready    Paris, today's mission ready                               -> not due
--   failed   Paris, today's mission failed once                         -> due (retry)
--   spent    Paris, today's mission failed 3 times                      -> not due

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'due@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'tokyo@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000f3', 'authenticated', 'authenticated', 'late@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000f4', 'authenticated', 'authenticated', 'nolang@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000f5', 'authenticated', 'authenticated', 'idle@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000f6', 'authenticated', 'authenticated', 'back@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000f7', 'authenticated', 'authenticated', 'ready@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000f8', 'authenticated', 'authenticated', 'failed@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000f9', 'authenticated', 'authenticated', 'spent@test.invalid');

-- The reference instant: 2030-05-10 10:00 UTC = 12:00 in Paris, 19:00 in Tokyo.
update public.profiles set generation_time = '07:00', time_zone = 'Europe/Paris', created_at = '2030-05-09 08:00+00'
where id::text like 'a0000000-0000-4000-8000-0000000000f_';
update public.profiles set time_zone = 'Asia/Tokyo' where id = 'a0000000-0000-4000-8000-0000000000f2';
update public.profiles set generation_time = '20:00' where id = 'a0000000-0000-4000-8000-0000000000f3';
update public.profiles set created_at = '2030-03-10 08:00+00'
where id in ('a0000000-0000-4000-8000-0000000000f5', 'a0000000-0000-4000-8000-0000000000f6');

insert into public.user_languages (user_id, language, level, target_level)
select id, 'ru', 'B2', 'C1' from public.profiles
where id::text like 'a0000000-0000-4000-8000-0000000000f_' and id <> 'a0000000-0000-4000-8000-0000000000f4';

insert into public.missions (user_id, mission_date, budget_minutes, status, generated_at, started_at, generation_attempts) values
  ('a0000000-0000-4000-8000-0000000000f6', '2030-05-07', 30, 'ready', '2030-05-07 05:00+00', '2030-05-07 06:00+00', 1),
  ('a0000000-0000-4000-8000-0000000000f7', '2030-05-10', 30, 'ready', '2030-05-10 05:00+00', null, 1),
  ('a0000000-0000-4000-8000-0000000000f8', '2030-05-10', 30, 'failed', null, null, 1),
  ('a0000000-0000-4000-8000-0000000000f9', '2030-05-10', 30, 'failed', null, null, 3);

create temporary table due on commit drop as
  select * from public.list_due_mission_users('2030-05-10 10:00+00');

select ok(exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000f1' and mission_date = '2030-05-10'),
  'a user past their generation time is due for their local day');
select ok(exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000f2' and mission_date = '2030-05-10'),
  'the local day follows the user''s time zone');
select ok(not exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000f3'),
  'a user before their generation time is not due');
select ok(not exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000f4'),
  'a user without language is not due');
select ok(not exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000f5'),
  'an inactive user is skipped');
select ok(exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000f6'),
  'an old account that started a mission recently is due');
select ok(not exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000f7'),
  'a user whose mission is ready is not due');
select ok(exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000f8'),
  'a failed mission with attempts left is due again');
select ok(not exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000f9'),
  'a mission without attempts left is not due');

-- Tokyo at 2030-05-09 23:00 UTC is 08:00 on the 10th; Paris is 01:00 on the 10th.
select is(
  (select array_agg(user_id::text order by user_id) from public.list_due_mission_users('2030-05-09 23:00+00')
   where user_id::text like 'a0000000-0000-4000-8000-0000000000f_'),
  array['a0000000-0000-4000-8000-0000000000f2'],
  'just after midnight, only the users whose generation time has passed are due');
select is(
  (select count(*)::int from public.list_due_mission_users('2030-05-10 10:00+00', 2)), 2, 'the limit is applied');

-- Privileges ----------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select * from public.list_due_mission_users()$$, '42501', null,
  'a user cannot list due users');
select throws_ok($$select * from public.cron_runs$$, '42501', null, 'a user cannot read cron runs');
select throws_ok($$insert into public.cron_runs (job) values ('ingest')$$, '42501', null,
  'a user cannot write cron runs');
reset role;

set local role service_role;
insert into public.cron_runs (job) values ('missions');
select is((select status from public.cron_runs where job = 'missions'), 'running', 'the service role logs a run');
select throws_ok($$update public.cron_runs set status = 'ok' where job = 'missions'$$, '23514', null,
  'a finished run needs finished_at');
reset role;

select * from finish();
rollback;
