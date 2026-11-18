-- pgTAP tests for app.save_game_settings (migration 20261117000400): privileges, closed list of keys,
-- types and bounds, the setting_change journal and its effect day. Run with `npm run db:test`.
-- Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid');

-- The learning day of the first user, read once (a client cannot call learning_day_at).
create temp table today as
select app.learning_day_at(time_zone, now()) as d from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000a1';
grant select on pg_temp.today to authenticated;

-- Privileges ------------------------------------------------------------------------------------------------

select ok(has_function_privilege('authenticated', 'app.save_game_settings(jsonb)', 'execute')
  and not has_function_privilege('anon', 'app.save_game_settings(jsonb)', 'execute'),
  'save_game_settings: executable by authenticated, not by anon');
select ok((select prosecdef from pg_proc where oid = 'app.save_game_settings(jsonb)'::regprocedure),
  'save_game_settings is security definer');
select ok(not has_function_privilege('authenticated', 'app.is_valid_game_setting(text, jsonb)', 'execute')
  and not has_function_privilege('anon', 'app.is_valid_game_setting(text, jsonb)', 'execute'),
  'the validation helper is not executable by a client');

set local role anon;
select throws_ok($$select app.save_game_settings('{}')$$, '42501', null, 'anon cannot call save_game_settings');
reset role;

-- No signed-in user ----------------------------------------------------------------------------------------------

set local role authenticated;
select throws_ok($$select app.save_game_settings('{}')$$, '28000', null, 'no auth.uid(): refused');
reset role;
set local role service_role;
select throws_ok($$select app.save_game_settings('{}')$$, '42501', null, 'service_role is not granted the function (it has no auth.uid())');
reset role;

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;

-- Nominal call --------------------------------------------------------------------------------------------------------

select is((select (app.save_game_settings('{"ring": {"tier": 20}, "xpVisible": false}')).game_settings),
  '{"ring": {"tier": 20}, "xpVisible": false}'::jsonb, 'the settings are stored');
select is((select count(*)::int from app.setting_change), 2, 'one setting_change per changed key');
select is((select count(*)::int from app.setting_change
  where effective_day = (select d from pg_temp.today) + 1), 2,
  'effective the day after the current learning day');
select is((select value from app.setting_change where key = 'ring.tier'), '20'::jsonb, 'the new value is journaled under its dotted key');
select isnt((select app_active_since from app.profile), null, 'the user is now active in the new app');

-- A patch: keys not given stay -------------------------------------------------------------------------------------------

select is((select (app.save_game_settings('{"ring": {"enabled": false}}')).game_settings),
  '{"ring": {"tier": 20, "enabled": false}, "xpVisible": false}'::jsonb, 'a patch keeps the other keys, groups included');
select is((select count(*)::int from app.setting_change), 3, 'only the changed key is journaled');
select is((select count(*)::int from (select app.save_game_settings('{"ring": {"enabled": false}, "xpVisible": false}')) s), 1, 'saving the same values again');
select is((select count(*)::int from app.setting_change), 3, 'journals nothing');

-- Monday for the streak mode and target -------------------------------------------------------------------------------------

select lives_ok($$select app.save_game_settings('{"streak": {"mode": "weekly", "weeklyTarget": 5}}')$$, 'streak mode and target');
select is((select count(*)::int from app.setting_change where key like 'streak.%' and extract(isodow from effective_day) = 1
  and effective_day > (select d from pg_temp.today)
  and effective_day <= (select d from pg_temp.today) + 7), 2,
  'both take effect on the next Monday');
select lives_ok($$select app.save_game_settings('{"streak": {"restDays": [6, 7], "enabled": false}}')$$, 'rest days and streak switch');
select is((select count(*)::int from app.setting_change where key in ('streak.restDays', 'streak.enabled')
  and effective_day = (select d from pg_temp.today) + 1), 2,
  'rest days and the switch apply the next day');

-- The reminder time lives in profile.reminder_time -----------------------------------------------------------------------------

select is((select (app.save_game_settings('{"notifications": {"time": "08:30", "weeklySummary": false}}')).reminder_time),
  '08:30'::time, 'notifications.time goes to profile.reminder_time');
select is((select game_settings #> '{notifications}' from app.profile), '{"weeklySummary": false}'::jsonb,
  'and not to game_settings');
select is((select count(*)::int from app.setting_change where key = 'notifications.time'), 1, 'it is journaled all the same');

-- Closed list: everything else is refused ------------------------------------------------------------------------------------------

select throws_ok($$select app.save_game_settings('{"admin": true}')$$, '22023', null, 'unknown key');
select throws_ok($$select app.save_game_settings('{"ring": {"color": "red"}}')$$, '22023', null, 'unknown key in a group');
select throws_ok($$select app.save_game_settings('{"ring": 15}')$$, '22023', null, 'a group must be an object');
select throws_ok($$select app.save_game_settings('{"xpVisible": {"ring": 1}}')$$, '22023', null, 'a switch cannot be an object');
select throws_ok($$select app.save_game_settings('{"ring": {"tier": 25}}')$$, '22023', null, 'ring.tier outside 10, 15, 20, 30');
select throws_ok($$select app.save_game_settings('{"ring": {"tier": "20"}}')$$, '22023', null, 'ring.tier as a string');
select throws_ok($$select app.save_game_settings('{"streak": {"weeklyTarget": 8}}')$$, '22023', null, 'weeklyTarget above 7');
select throws_ok($$select app.save_game_settings('{"streak": {"weeklyTarget": 2.5}}')$$, '22023', null, 'weeklyTarget not an integer');
select throws_ok($$select app.save_game_settings('{"streak": {"mode": "monthly"}}')$$, '22023', null, 'streak.mode outside the list');
select throws_ok($$select app.save_game_settings('{"streak": {"restDays": [1, 2, 3]}}')$$, '22023', null, 'three rest days');
select throws_ok($$select app.save_game_settings('{"streak": {"restDays": [3, 3]}}')$$, '22023', null, 'a rest day twice');
select throws_ok($$select app.save_game_settings('{"streak": {"restDays": [0]}}')$$, '22023', null, 'weekday 0');
select throws_ok($$select app.save_game_settings('{"sound": {"volume": 4}}')$$, '22023', null, 'sound.volume above 3');
select throws_ok($$select app.save_game_settings('{"notifications": {"time": "25:00"}}')$$, '22023', null, 'notifications.time is HH:mm');
select throws_ok($$select app.save_game_settings('{"celebrations": null}')$$, '22023', null, 'a null value');
select throws_ok($$select app.save_game_settings('[]')$$, '22023', null, 'settings must be an object');
select throws_ok($$select app.save_game_settings(null)$$, '22023', null, 'null settings');

-- Atomicity and isolation ---------------------------------------------------------------------------------------------------------------

select throws_ok($$select app.save_game_settings('{"celebrations": "reduced", "sound": {"volume": 9}}')$$, '22023', null, 'one invalid key refuses the whole call');
select is((select game_settings ->> 'celebrations' from app.profile), null, 'and nothing was written');
reset role;
select is((select game_settings from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000a2'), '{}'::jsonb, 'the other user is untouched');

select * from finish();
rollback;
