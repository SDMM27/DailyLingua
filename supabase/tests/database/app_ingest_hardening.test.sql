-- pgTAP tests for migration 20261118000200 (security fixes of milestone 2, PR 1): save_profile and the time zone
-- once events are ingested (B1), the ceiling of save_game_settings (I4), the bounds of timezone_changes.effective_at
-- (I2) and the index-friendly XP lookup of ingest_batch (I5). Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated', 'h1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000d2', 'authenticated', 'authenticated', 'h2@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000d3', 'authenticated', 'authenticated', 'h3@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000d4', 'authenticated', 'authenticated', 'h4@test.invalid');

create function pg_temp.ingj(p_user uuid, p_body jsonb) returns jsonb
language sql as $$
  select app.ingest_batch(p_user, (select s.seq from app.ingest_state s where s.user_id = p_user), p_body);
$$;
grant execute on function pg_temp.ingj(uuid, jsonb) to service_role;

-- Same signatures, same rights ---------------------------------------------------------------------------------------

select ok(has_function_privilege('authenticated', 'app.save_profile(text, text, text, time without time zone)', 'execute')
  and not has_function_privilege('anon', 'app.save_profile(text, text, text, time without time zone)', 'execute'),
  'save_profile: executable by authenticated, not by anon');
select ok(has_function_privilege('authenticated', 'app.save_game_settings(jsonb)', 'execute')
  and not has_function_privilege('anon', 'app.save_game_settings(jsonb)', 'execute'),
  'save_game_settings: executable by authenticated, not by anon');
select ok(has_function_privilege('service_role', 'app.ingest_batch(uuid, bigint, jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'app.ingest_batch(uuid, bigint, jsonb)', 'execute')
  and not has_function_privilege('anon', 'app.ingest_batch(uuid, bigint, jsonb)', 'execute'),
  'ingest_batch: service_role only');
select is((select count(*)::int from pg_proc
  where oid in ('app.save_profile(text, text, text, time without time zone)'::regprocedure, 'app.save_game_settings(jsonb)'::regprocedure,
                'app.ingest_batch(uuid, bigint, jsonb)'::regprocedure)
    and prosecdef and proconfig = array['search_path=""']), 3,
  'the three functions stay security definer with an empty search_path');

-- B1: save_profile and the time zone ---------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000d1", "role": "authenticated"}', true);
set local role authenticated;
select is((select time_zone from app.save_profile('fr', 'fr', 'Europe/London')), 'Europe/London',
  'before any ingestion, save_profile sets the time zone');
reset role;

set local role service_role;
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000d1', jsonb_build_object('events', jsonb_build_array(
  jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000d101', 'kind', 'session_started',
                     'fingerprint', repeat('a', 32)))))$$, 'a first batch is ingested');
reset role;
select ok((select seq > 0 from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000d1'), 'the sequence has moved');

set local role authenticated;
select results_eq($$select time_zone, native_language, ui_language, reminder_time::text
  from app.save_profile('en', 'de', 'Asia/Tokyo', '07:45')$$,
  $$values ('Europe/London', 'en', 'de', '07:45:00')$$,
  'after an ingestion, the time zone stays and the other fields change');
select throws_ok($$select app.save_profile('en', 'de', 'Nowhere/Land')$$, '22023', null,
  'the received time zone is still validated');
reset role;
select is((select time_zone from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000d1'), 'Europe/London',
  'the stored time zone is untouched');

-- The journal still moves it.
set local role service_role;
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000d1', jsonb_build_object('timezone_changes', jsonb_build_array(
  jsonb_build_object('effective_at', now() - interval '1 hour', 'time_zone', 'Europe/Rome'))))$$, 'a timezone_change event is accepted');
reset role;
select is((select time_zone from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000d1'), 'Europe/Rome',
  'and the profile follows the journal');

-- I4: save_game_settings ceiling ---------------------------------------------------------------------------------------

-- User d2: 50 changes in the last 24 hours (at the limit), plus 10 older ones that do not count.
insert into app.setting_change (user_id, key, value, effective_day, changed_at)
select 'c0000000-0000-4000-8000-0000000000d2', 'ring.tier', '20', current_date, now() - interval '1 hour' from generate_series(1, 50);
insert into app.setting_change (user_id, key, value, effective_day, changed_at)
select 'c0000000-0000-4000-8000-0000000000d2', 'ring.tier', '20', current_date, now() - interval '3 days' from generate_series(1, 10);
-- User d3: 51 changes in the last 24 hours.
insert into app.setting_change (user_id, key, value, effective_day, changed_at)
select 'c0000000-0000-4000-8000-0000000000d3', 'ring.tier', '20', current_date, now() - interval '2 hours' from generate_series(1, 51);
-- User d4: 100 changes, all older than a day.
insert into app.setting_change (user_id, key, value, effective_day, changed_at)
select 'c0000000-0000-4000-8000-0000000000d4', 'ring.tier', '20', current_date, now() - interval '25 hours' from generate_series(1, 100);

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000d2", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select app.save_game_settings('{"ring": {"tier": 30}}')$$, '50 changes in 24 hours: one more is accepted');
select throws_ok($$select app.save_game_settings('{"ring": {"tier": 15}}')$$, '23514', null,
  'then 51 changes in 24 hours: refused');
select is((select (game_settings #>> '{ring,tier}') from app.profile), '30', 'a refused call changes nothing');
reset role;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000d3", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select app.save_game_settings('{"ring": {"tier": 30}}')$$, '23514', null, '51 recent changes: refused');
select throws_ok($$select app.save_game_settings('{"ring": {"tier": 99}}')$$, '22023', null, 'an invalid value is still 22023');
reset role;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000d4", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select app.save_game_settings('{"ring": {"tier": 30}}')$$, 'changes older than 24 hours do not count');
reset role;

-- I2: bounds of timezone_changes.effective_at ---------------------------------------------------------------------------

set local role service_role;
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000d2', jsonb_build_object('timezone_changes', jsonb_build_array(
  jsonb_build_object('effective_at', now() - interval '9 days', 'time_zone', 'Asia/Tokyo'))))$$, '23514', null,
  'a time zone change older than 8 days: 23514');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000d2', jsonb_build_object('timezone_changes', jsonb_build_array(
  jsonb_build_object('effective_at', now() + interval '10 minutes', 'time_zone', 'Asia/Tokyo'))))$$, '23514', null,
  'a time zone change more than 5 minutes ahead: 23514');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000d2', jsonb_build_object('timezone_changes', jsonb_build_array(
  jsonb_build_object('effective_at', now() - interval '7 days', 'time_zone', 'Asia/Tokyo'))))$$,
  'a time zone change 7 days old is accepted');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000d2', jsonb_build_object('timezone_changes', jsonb_build_array(
  jsonb_build_object('effective_at', now() + interval '4 minutes', 'time_zone', 'Asia/Tokyo'))))$$,
  'a time zone change 4 minutes ahead is accepted');
reset role;

-- I5: the XP lookup with a source names the columns the partial indexes serve ---------------------------------------------

select ok(pg_get_functiondef('app.ingest_batch(uuid, bigint, jsonb)'::regprocedure) !~ 'x\.attempt_id is not distinct from',
  'the XP lookup no longer uses is not distinct from on the source columns');
select ok(pg_get_functiondef('app.ingest_batch(uuid, bigint, jsonb)'::regprocedure) ~ 'x\.attempt_id = v_id_attempt'
  and pg_get_functiondef('app.ingest_batch(uuid, bigint, jsonb)'::regprocedure) ~ 'x\.review_log_id = v_id_review',
  'it has one equality branch per source kind');

select * from finish();
rollback;
