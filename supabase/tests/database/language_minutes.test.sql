-- pgTAP tests for migration 20261028000100: user_languages.weight holds minutes per day (10..120)
-- and save_preferences computes profiles.daily_minutes from them.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000ee', 'authenticated', 'authenticated', 'minutes@test.invalid');

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000ee", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$select public.save_preferences(30, null, null, 'matched', '07:00', 'Europe/Paris',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 45},
      {"language": "it", "level": "B1", "target_level": "B2", "focus": "", "weight": 30}]')$$,
  'save_preferences accepts minutes above 10');
select is(
  (select array_agg(weight order by language)::text from public.user_languages),
  '{30,45}',
  'the minutes are stored as given');
select is((select daily_minutes::int from public.profiles), 75, 'daily_minutes is the sum of the languages minutes, not p_daily_minutes');

select throws_ok(
  $$select public.save_preferences(30, null, null, 'matched', '07:00', 'Europe/Paris',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 5}]')$$,
  '23514', null, 'a language with 5 minutes is rejected');
select throws_ok(
  $$select public.save_preferences(30, null, null, 'matched', '07:00', 'Europe/Paris',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 125}]')$$,
  '23514', null, 'a language with more than 120 minutes is rejected');
select is((select daily_minutes::int from public.profiles), 75, 'a rejected save leaves the total unchanged');

select * from finish();
rollback;
