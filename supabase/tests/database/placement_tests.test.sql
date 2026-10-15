-- pgTAP tests for migration 20261015000500: placement_tests and record_placement_test.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000dd', 'authenticated', 'authenticated', 'placement-a@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000dd', 'authenticated', 'authenticated', 'placement-b@test.invalid');

-- A studies Russian (B1) and Italian (A2); B studies Russian too.
insert into public.user_languages (user_id, language, level, target_level) values
  ('a0000000-0000-4000-8000-0000000000dd', 'ru', 'B1', 'C1'),
  ('a0000000-0000-4000-8000-0000000000dd', 'it', 'A2', 'B1'),
  ('b0000000-0000-4000-8000-0000000000dd', 'ru', 'A1', 'B1');

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000dd", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$select public.record_placement_test('ru', 'completed', 'everyday', 'B1', 'B2', 'medium', 'B1',
    '[{"itemId": "ru-e-b1-1", "choice": 0, "correct": true}]', '2026-10-15')$$,
  'a completed test is recorded');
select is(
  (select estimated_level || '/' || chosen_level || '/' || confidence from public.placement_tests where language = 'ru'),
  'B2/B1/medium', 'the row keeps the estimate and the chosen level');
select is(
  (select level from public.user_languages where language = 'ru'),
  'B1', 'the current level is the chosen one');

select lives_ok(
  $$select public.record_placement_test('ru', 'completed', 'professional', 'B1', 'C1', 'high', 'C1',
    '[{"itemId": "ru-p-b1-1", "choice": 1, "correct": true}]', '2026-10-15')$$,
  'a test can be taken again');
select is(
  (select level from public.user_languages where language = 'ru'),
  'C1', 'the level follows the latest completed test');

select lives_ok(
  $$select public.record_placement_test('it', 'skipped', null, null, null, null, null, null, null)$$,
  'a skipped test is recorded');
select is(
  (select level from public.user_languages where language = 'it'),
  'A2', 'a skipped test leaves the level unchanged');

select throws_ok(
  $$select public.record_placement_test('es', 'skipped', null, null, null, null, null, null, null)$$,
  'P0002', null, 'a language the user does not study is refused');

select throws_ok(
  $$select public.record_placement_test('ru', 'completed', 'everyday', 'B1', null, 'high', 'B1',
    '[]', '2026-10-15')$$,
  '23514', null, 'a completed test without estimate violates the check constraint');
select throws_ok(
  $$select public.record_placement_test('ru', 'skipped', 'everyday', null, null, null, null, null, null)$$,
  '23514', null, 'a skipped test with a variant violates the check constraint');

select is((select count(*)::int from public.placement_tests), 3, 'the user reads their own rows');

select throws_ok(
  $$update public.placement_tests set chosen_level = 'C2'$$,
  '42501', null, 'a user cannot update a test');
select throws_ok(
  $$delete from public.placement_tests$$,
  '42501', null, 'a user cannot delete a test');

-- B sees nothing of A's tests.
select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-4000-8000-0000000000dd", "role": "authenticated"}', true);
select is((select count(*)::int from public.placement_tests), 0, 'a user cannot read the tests of another user');

select * from finish();
rollback;
