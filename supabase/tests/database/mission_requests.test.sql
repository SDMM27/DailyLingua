-- pgTAP tests for migration 20261029000200: mission_requests (the domain chosen for the next
-- mission) is read-only for its owner and written through set_mission_request, which checks the
-- language, the date window (tomorrow to +7 days, in the user's time zone) and that the day's
-- mission does not exist yet. Run with `npm run db:test`. Everything is rolled back.
--
-- "Today" is the real one in Europe/Paris (the default time zone of a profile), so the dates below
-- are written relative to it.

begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'mr-a@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'mr-b@test.invalid');

insert into public.user_languages (user_id, language, level, target_level) values
  ('a0000000-0000-4000-8000-0000000000e1', 'ru', 'B2', 'C1'),
  ('a0000000-0000-4000-8000-0000000000e1', 'it', 'B1', 'B2'),
  ('b0000000-0000-4000-8000-0000000000e1', 'ru', 'B2', 'C1');

-- A mission already exists for A in 3 days; B has a request of their own.
insert into public.missions (user_id, mission_date, budget_minutes, status, generated_at)
values ('a0000000-0000-4000-8000-0000000000e1', (now() at time zone 'Europe/Paris')::date + 3, 30, 'failed', null);
insert into public.mission_requests (user_id, mission_date, language, topic) values
  ('b0000000-0000-4000-8000-0000000000e1', (now() at time zone 'Europe/Paris')::date + 2, 'ru', 'sport'),
  ('a0000000-0000-4000-8000-0000000000e1', (now() at time zone 'Europe/Paris')::date - 40, 'ru', 'culture'),
  ('a0000000-0000-4000-8000-0000000000e1', (now() at time zone 'Europe/Paris')::date - 5, 'ru', 'histoire');

select throws_ok(
  $$insert into public.mission_requests (user_id, mission_date, language, topic)
    values ('a0000000-0000-4000-8000-0000000000e1', (now() at time zone 'Europe/Paris')::date + 1, 'ru', 'bricolage')$$,
  '23514', null, 'a topic outside the twelve domains is rejected by the table');

-- The owner reads, never writes ---------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.mission_requests), 2, 'the owner reads their rows only');
select throws_ok(
  $$insert into public.mission_requests (user_id, mission_date, language, topic)
    values ('a0000000-0000-4000-8000-0000000000e1', (now() at time zone 'Europe/Paris')::date + 1, 'ru', 'sport')$$,
  '42501', null, 'the owner cannot insert directly');
select throws_ok(
  $$update public.mission_requests set topic = 'sport'$$,
  '42501', null, 'nor update directly');
select throws_ok(
  $$delete from public.mission_requests$$,
  '42501', null, 'nor delete directly');

-- set_mission_request ---------------------------------------------------------------------------

select lives_ok(
  $$select public.set_mission_request('ru', (now() at time zone 'Europe/Paris')::date + 1, 'sport')$$,
  'tomorrow is accepted');
select lives_ok(
  $$select public.set_mission_request('it', (now() at time zone 'Europe/Paris')::date + 7, 'cinéma')$$,
  'so is 7 days ahead');
select is(
  (select topic from public.mission_requests where language = 'ru' and mission_date = (now() at time zone 'Europe/Paris')::date + 1),
  'sport', 'the request is stored');

select lives_ok(
  $$select public.set_mission_request('ru', (now() at time zone 'Europe/Paris')::date + 1, 'culture')$$,
  'asking again for the same language and day is accepted');
select is(
  (select array_agg(topic) from public.mission_requests where language = 'ru' and mission_date = (now() at time zone 'Europe/Paris')::date + 1),
  array['culture'], 'it replaces the previous request (one row per language and day)');

select throws_ok(
  $$select public.set_mission_request('es', (now() at time zone 'Europe/Paris')::date + 1, 'sport')$$,
  'P0002', null, 'a language the user does not study is refused');
select throws_ok(
  $$select public.set_mission_request('ru', (now() at time zone 'Europe/Paris')::date, 'sport')$$,
  '22023', null, 'today is refused');
select throws_ok(
  $$select public.set_mission_request('ru', (now() at time zone 'Europe/Paris')::date - 1, 'sport')$$,
  '22023', null, 'a past day is refused');
select throws_ok(
  $$select public.set_mission_request('ru', (now() at time zone 'Europe/Paris')::date + 8, 'sport')$$,
  '22023', null, '8 days ahead is refused');
select throws_ok(
  $$select public.set_mission_request('ru', null, 'sport')$$,
  '22023', null, 'a missing date is refused');
select throws_ok(
  $$select public.set_mission_request('ru', (now() at time zone 'Europe/Paris')::date + 3, 'sport')$$,
  'DL003', 'mission_already_generated', 'a day that already has a mission (whatever its status) is refused');
select throws_ok(
  $$select public.set_mission_request('ru', (now() at time zone 'Europe/Paris')::date + 3, null)$$,
  'DL003', 'mission_already_generated', 'and so is removing the request of that day');

select lives_ok(
  $$select public.set_mission_request('ru', (now() at time zone 'Europe/Paris')::date + 1, null)$$,
  'a null topic is accepted');
select is(
  (select count(*)::int from public.mission_requests where language = 'ru' and mission_date = (now() at time zone 'Europe/Paris')::date + 1),
  0, 'it removes the request');

select throws_ok(
  $$select public.set_mission_request('ru', (now() at time zone 'Europe/Paris')::date + 1, 'bricolage')$$,
  '23514', null, 'a topic outside the twelve domains is refused');

-- The successful calls above purged what was older than 30 days, and only that.
select is(
  (select array_agg(topic order by topic) from public.mission_requests where mission_date < (now() at time zone 'Europe/Paris')::date),
  array['histoire'], 'requests older than 30 days are purged, recent past ones are kept');

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
select is((select count(*)::int from public.mission_requests), 1, 'another user sees only their own request');

-- Not callable without signing in ---------------------------------------------------------------

reset role;
set local role anon;
select throws_ok(
  $$select public.set_mission_request('ru', (now() at time zone 'Europe/Paris')::date + 1, 'sport')$$,
  '42501', null, 'the anonymous role cannot call the function');
reset role;

-- A request goes with its language --------------------------------------------------------------

delete from public.user_languages where user_id = 'a0000000-0000-4000-8000-0000000000e1' and language = 'it';
select is(
  (select count(*)::int from public.mission_requests where user_id = 'a0000000-0000-4000-8000-0000000000e1' and language = 'it'),
  0, 'removing a language removes its requests');

select * from finish();
rollback;
