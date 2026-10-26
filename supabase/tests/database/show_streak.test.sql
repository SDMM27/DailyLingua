-- pgTAP tests for migration 20261026000100: profiles.show_streak and save_preferences(p_show_streak).
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000dd', 'authenticated', 'authenticated', 'streak@test.invalid');

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000dd", "role": "authenticated"}', true);
set local role authenticated;

select is((select show_streak from public.profiles), true, 'the streak is shown by default');

select lives_ok(
  $$select public.save_preferences(30, null, null, 'matched', '07:00', 'Europe/Paris',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 2}]', false)$$,
  'save_preferences accepts p_show_streak');
select is((select show_streak from public.profiles), false, 'the streak can be switched off');

select lives_ok(
  $$select public.save_preferences(30, null, null, 'matched', '07:00', 'Europe/Paris',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 2}]')$$,
  'p_show_streak is optional (old clients)');
select is((select show_streak from public.profiles), true, 'omitting p_show_streak shows the streak again');

select * from finish();
rollback;
