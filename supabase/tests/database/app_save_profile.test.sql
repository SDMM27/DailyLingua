-- pgTAP tests for app.save_profile, the profile and enrollment constraints, and the signup trigger
-- app.handle_new_user. Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

-- Signup trigger ------------------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, is_anonymous) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'member@test.invalid', false),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'other@test.invalid', false),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000e3', 'authenticated', 'authenticated', null, true);

select is((select count(*)::int from app.profile where user_id::text like 'c0000000-0000-4000-8000-0000000000e_'), 3,
  'every new account (member or guest) gets an app profile');
select is((select count(*)::int from app.streak_state where user_id::text like 'c0000000-0000-4000-8000-0000000000e_'), 3,
  'and a streak state');
select is((select count(*)::int from public.profiles where id::text like 'c0000000-0000-4000-8000-0000000000e_'), 3,
  'the public profile trigger still runs');
select is((select is_guest from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000e1'), false,
  'a normal account is not a guest');
select is((select is_guest from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000e3'), true,
  'an anonymous account is a guest');
select results_eq(
  $$select native_language, ui_language, time_zone, reminder_time::text, game_settings::text, legacy_migrated_at is null
    from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000e1'$$,
  $$values ('fr', 'fr', 'Europe/Paris', null, '{}', true)$$,
  'the profile starts with the defaults');
select results_eq(
  $$select "current", best, last_day, freezes, mode from app.streak_state where user_id = 'c0000000-0000-4000-8000-0000000000e1'$$,
  $$values (0, 0, null::date, 0::smallint, 'daily')$$,
  'the streak state starts empty');

select is((select count(*)::int from app.profile where app_active_since is not null
           and user_id::text like 'c0000000-0000-4000-8000-0000000000e_'), 0,
  'nobody is "active in the new app" at signup');

-- Constraints --------------------------------------------------------------------------------------------

select throws_ok($$update app.profile set time_zone = 'Nowhere/Land' where user_id = 'c0000000-0000-4000-8000-0000000000e1'$$,
  '22023', null, 'an unknown time zone is refused');
select throws_ok($$update app.profile set native_language = 'FR' where user_id = 'c0000000-0000-4000-8000-0000000000e1'$$,
  '23514', null, 'a malformed language code is refused');
select throws_ok($$update app.profile set reminder_time = '08:30:15' where user_id = 'c0000000-0000-4000-8000-0000000000e1'$$,
  '23514', null, 'a reminder time with seconds is refused');
select throws_ok($$insert into app.enrollment (user_id, language, daily_minutes)
  values ('c0000000-0000-4000-8000-0000000000e1', 'fr', 20)$$, '23514', null,
  'a user cannot learn their own native language');
select throws_ok($$insert into app.enrollment (user_id, language, daily_minutes)
  values ('c0000000-0000-4000-8000-0000000000e1', 'it', 4)$$, '23514', null, 'fewer than 5 minutes a day is refused');
select throws_ok($$insert into app.enrollment (user_id, language, daily_minutes, days)
  values ('c0000000-0000-4000-8000-0000000000e1', 'it', 20, '{1,1}')$$, '23514', null, 'duplicate weekdays are refused');
select lives_ok($$insert into app.enrollment (user_id, language, daily_minutes, days)
  values ('c0000000-0000-4000-8000-0000000000e1', 'it', 20, '{1,3,5}')$$, 'a valid enrollment is accepted');
select lives_ok($$insert into app.enrollment (user_id, language, daily_minutes, active)
  values ('c0000000-0000-4000-8000-0000000000e1', 'es', 20, false)$$, 'an inactive enrollment is accepted');

-- save_profile --------------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{}', true);
set local role authenticated;
select throws_ok($$select app.save_profile('en', 'en', 'Europe/London')$$, '28000', null,
  'save_profile refuses a call without a signed-in user');
reset role;

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select user_id::text, native_language, ui_language, time_zone, reminder_time::text
    from app.save_profile('en', 'de', 'Europe/London', '08:30')$$,
  $$values ('c0000000-0000-4000-8000-0000000000e1', 'en', 'de', 'Europe/London', '08:30:00')$$,
  'save_profile updates and returns the profile of the caller');
select is((select native_language from app.profile), 'en', 'the change is visible to the caller');
select lives_ok($$select app.save_profile('en', 'en', 'Europe/London')$$, 'the reminder time is optional');
select is((select reminder_time from app.profile), null, 'and an omitted reminder time clears it');
select throws_ok($$select app.save_profile('english', 'fr', 'Europe/Paris')$$, '22023', null,
  'a malformed native language is refused');
select throws_ok($$select app.save_profile('fr', 'F', 'Europe/Paris')$$, '22023', null,
  'a malformed interface language is refused');
select throws_ok($$select app.save_profile('fr', 'fr', 'Nowhere/Land')$$, '22023', null, 'an unknown time zone is refused');
select throws_ok($$select app.save_profile('fr', 'fr', 'Europe/Paris', '08:30:15')$$, '22023', null,
  'a reminder time with seconds is refused');
select throws_ok($$select app.save_profile('it', 'fr', 'Europe/Paris')$$, '23514', null,
  'the native language cannot be a language being learned');
select lives_ok($$select app.save_profile('es', 'fr', 'Europe/Paris')$$,
  'but it can be a language of an inactive enrollment');
reset role;

select results_eq(
  $$select native_language, time_zone from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000e2'$$,
  $$values ('fr', 'Europe/Paris')$$, 'the profile of another user is untouched');

-- app_active_since ----------------------------------------------------------------------------------------

select ok((select app_active_since is not null from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000e1'),
  'save_profile marks the user as active in the new app');
select is((select app_active_since from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000e2'), null,
  'and only that user');
update app.profile set app_active_since = '2031-01-01 00:00+00' where user_id = 'c0000000-0000-4000-8000-0000000000e1';
select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select app.save_profile('es', 'fr', 'Europe/Paris')$$, 'save_profile again');
select throws_ok($$select app.mark_active('c0000000-0000-4000-8000-0000000000e2')$$, '42501', null,
  'a client cannot call mark_active');
reset role;
select is((select app_active_since from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000e1'),
  '2031-01-01 00:00+00'::timestamptz, 'the first activation date is kept');
set local role service_role;
select app.mark_active('c0000000-0000-4000-8000-0000000000e2');
reset role;
select ok((select app_active_since is not null from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000e2'),
  'service_role can mark a user as active');

select * from finish();
rollback;
