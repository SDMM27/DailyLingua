-- pgTAP tests for migration 20261028000200: user_languages.days (ISO weekdays a language is worked),
-- save_preferences storing them and computing daily_minutes as the busiest weekday, and
-- list_due_mission_users skipping users with no language on their local weekday.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated', 'days@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000d2', 'authenticated', 'authenticated', 'friday@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000d3', 'authenticated', 'authenticated', 'monwed@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000d4', 'authenticated', 'authenticated', 'two@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000d5', 'authenticated', 'authenticated', 'tokyo@test.invalid');

-- Column and check ----------------------------------------------------------------------------

select is(extract(isodow from date '2030-05-10')::int, 5, 'the reference day 2030-05-10 is a Friday (ISO weekday 5)');

insert into public.user_languages (user_id, language, level, target_level)
values ('a0000000-0000-4000-8000-0000000000d1', 'ru', 'B2', 'C1');
select is(
  (select days::text from public.user_languages where user_id = 'a0000000-0000-4000-8000-0000000000d1'),
  '{1,2,3,4,5,6,7}',
  'a language is worked every day by default');

select lives_ok(
  $$update public.user_languages set days = '{1,3,5}' where user_id = 'a0000000-0000-4000-8000-0000000000d1'$$,
  'a subset of days is accepted');
select throws_ok(
  $$update public.user_languages set days = '{}' where user_id = 'a0000000-0000-4000-8000-0000000000d1'$$,
  '23514', null, 'no day at all is rejected');
select throws_ok(
  $$update public.user_languages set days = '{0}' where user_id = 'a0000000-0000-4000-8000-0000000000d1'$$,
  '23514', null, 'weekday 0 is rejected');
select throws_ok(
  $$update public.user_languages set days = '{1,8}' where user_id = 'a0000000-0000-4000-8000-0000000000d1'$$,
  '23514', null, 'weekday 8 is rejected');
select throws_ok(
  $$update public.user_languages set days = '{1,1}' where user_id = 'a0000000-0000-4000-8000-0000000000d1'$$,
  '23514', null, 'a duplicated weekday is rejected');
select throws_ok(
  $$update public.user_languages set days = null where user_id = 'a0000000-0000-4000-8000-0000000000d1'$$,
  '23502', null, 'null days are rejected');

-- save_preferences ----------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000d1", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$select public.save_preferences(30, null, null, 'matched', '07:00', 'Europe/Paris',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 45, "days": [1, 2, 3]},
      {"language": "it", "level": "B1", "target_level": "B2", "focus": "", "weight": 30, "days": [3, 4]}]')$$,
  'save_preferences accepts days');
select is(
  (select array_agg(language || ':' || days::text order by language) from public.user_languages),
  array['it:{3,4}', 'ru:{1,2,3}'],
  'the days are stored as given');
select is((select daily_minutes::int from public.profiles), 75,
  'daily_minutes is the busiest weekday (Wednesday: 45 + 30), not the sum of all languages');

select lives_ok(
  $$select public.save_preferences(30, null, null, 'matched', '07:00', 'Europe/Paris',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 45, "days": [1, 2, 3]},
      {"language": "it", "level": "B1", "target_level": "B2", "focus": "", "weight": 30, "days": [4, 5]},
      {"language": "es", "level": "A2", "target_level": "B1", "focus": "", "weight": 10}]')$$,
  'a language sent without days is accepted');
select is(
  (select days::text from public.user_languages where language = 'es'),
  '{1,2,3,4,5,6,7}',
  'a new language without days is worked every day');
select is((select daily_minutes::int from public.profiles), 55,
  'daily_minutes counts the new language on every day (Wednesday: 45 + 10)');

select lives_ok(
  $$select public.save_preferences(30, null, null, 'matched', '07:00', 'Europe/Paris',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 45},
      {"language": "it", "level": "B1", "target_level": "B2", "focus": "", "weight": 30, "days": [4, 5]}]')$$,
  'an existing language sent without days keeps its own');
select is(
  (select days::text from public.user_languages where language = 'ru'),
  '{1,2,3}',
  'the days of an existing language are unchanged when not sent');

select throws_ok(
  $$select public.save_preferences(30, null, null, 'matched', '07:00', 'Europe/Paris',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 45, "days": []}]')$$,
  '23514', null, 'an empty list of days is rejected');

reset role;

-- list_due_mission_users ----------------------------------------------------------------------
-- 2030-05-10 18:00 UTC is Friday 20:00 in Paris and Saturday 03:00 in Tokyo.
--   friday   Paris, one language on Friday                  -> due
--   monwed   Paris, one language on Monday and Wednesday    -> rest day, not due
--   two      Paris, a language on Monday and one on Friday  -> due
--   tokyo    Tokyo, one language on Friday only             -> Saturday there: not due

update public.profiles set generation_time = '07:00', time_zone = 'Europe/Paris', created_at = '2030-05-09 08:00+00'
where id::text like 'a0000000-0000-4000-8000-0000000000d_';
update public.profiles set time_zone = 'Asia/Tokyo' where id = 'a0000000-0000-4000-8000-0000000000d5';
delete from public.user_languages where user_id = 'a0000000-0000-4000-8000-0000000000d1';

insert into public.user_languages (user_id, language, level, target_level, days) values
  ('a0000000-0000-4000-8000-0000000000d2', 'ru', 'B2', 'C1', '{5}'),
  ('a0000000-0000-4000-8000-0000000000d3', 'ru', 'B2', 'C1', '{1,3}'),
  ('a0000000-0000-4000-8000-0000000000d4', 'ru', 'B2', 'C1', '{1}'),
  ('a0000000-0000-4000-8000-0000000000d4', 'it', 'B1', 'B2', '{5}'),
  ('a0000000-0000-4000-8000-0000000000d5', 'ru', 'B2', 'C1', '{5}');

create temporary table due on commit drop as
  select * from public.list_due_mission_users('2030-05-10 18:00+00');

select ok(exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000d2' and mission_date = '2030-05-10'),
  'a user with a language on their local weekday is due');
select ok(not exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000d3'),
  'a user whose languages do not work that weekday is not due (rest day)');
select ok(exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000d4'),
  'one language on the weekday is enough');
select ok(not exists (select 1 from due where user_id = 'a0000000-0000-4000-8000-0000000000d5'),
  'the weekday is the local one: Saturday in Tokyo is a rest day for a Friday language');

select * from finish();
rollback;
