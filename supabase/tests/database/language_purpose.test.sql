-- pgTAP tests for migration 20261015000300: user_languages.purpose and save_preferences.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000cc', 'authenticated', 'authenticated', 'purpose@test.invalid');

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000cc", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$select public.save_preferences(30, array['histoire'], array['article'], 'matched', '07:00', 'Europe/Paris',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 2, "purpose": "professional"},
      {"language": "it", "level": "B1", "target_level": "B2", "focus": "", "weight": 1}]')$$,
  'save_preferences accepts goals with and without purpose');

select is(
  (select purpose from public.user_languages where language = 'ru'),
  'professional', 'a given purpose is persisted');
select is(
  (select purpose from public.user_languages where language = 'it'),
  'general', 'an omitted purpose is stored as general');

-- Saving again without purpose resets an existing row to general.
select lives_ok(
  $$select public.save_preferences(30, array['histoire'], array['article'], 'matched', '07:00', 'Europe/Paris',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 2},
      {"language": "it", "level": "B1", "target_level": "B2", "focus": "", "weight": 1, "purpose": "exam"}]')$$,
  'goals can be saved again');
select is(
  (select string_agg(language || ':' || purpose, ',' order by language) from public.user_languages),
  'it:exam,ru:general', 'update writes the purpose, defaulting to general');

select throws_ok(
  $$update public.user_languages set purpose = 'hobby' where language = 'ru'$$,
  '23514', null, 'an unknown purpose violates the check constraint');

select * from finish();
rollback;
