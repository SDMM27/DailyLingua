-- pgTAP tests for the game tables of milestone 2 (migration 20261117000300): xp_ledger additions,
-- learning_day, setting_change, streak_state additions, timezone_change, device_cursor, ingest_state,
-- ui_event, the learning day function. Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(55);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid');

-- Structure ------------------------------------------------------------------------------------------------

select is((select count(*)::int from pg_tables where schemaname = 'app'
  and tablename in ('learning_day', 'setting_change', 'timezone_change', 'device_cursor', 'ingest_state', 'ui_event') and rowsecurity),
  6, 'RLS is enabled on the six new tables');
select ok(not has_function_privilege('authenticated', 'app.learning_day_at(text, timestamptz)', 'execute')
  and not has_function_privilege('anon', 'app.learning_day_at(text, timestamptz)', 'execute')
  and has_function_privilege('service_role', 'app.learning_day_at(text, timestamptz)', 'execute'),
  'learning_day_at is executable by service_role only');

-- Learning day function (the day starts at 04:00 local time) ----------------------------------------------------

select is(app.learning_day_at('Europe/Paris', '2030-01-01 02:59:59+00'), '2029-12-31'::date, '03:59:59 in Paris still belongs to the day before');
select is(app.learning_day_at('Europe/Paris', '2030-01-01 03:00:00+00'), '2030-01-01'::date, '04:00:00 in Paris opens the day');
select is(app.learning_day_at('America/Los_Angeles', '2030-01-01 11:59:59+00'), '2029-12-31'::date, '03:59:59 in Los Angeles: the day before');
select is(app.learning_day_at('America/Los_Angeles', '2030-01-01 12:00:00+00'), '2030-01-01'::date, '04:00 in Los Angeles: the new day');
select is(app.learning_day_at('Pacific/Auckland', '2029-12-31 15:00:00+00'), '2030-01-01'::date, 'a zone far east: 04:00 local');
select is(app.learning_day_at('Europe/Paris', '2030-03-31 02:30:00+00'), '2030-03-31'::date, 'the spring change of time does not shift the rule');

-- ingest_state: created by the signup trigger, backfilled for existing accounts ---------------------------------------

select is((select seq from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 0::bigint,
  'the signup trigger creates ingest_state at 0');
delete from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000a1';
insert into app.ingest_state (user_id)
select p.user_id from app.profile p
on conflict (user_id) do nothing;
select is((select count(*)::int from app.ingest_state where user_id in
  ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a2')), 2,
  'the backfill statement restores the row of an existing account and is rerunnable');

-- xp_ledger ------------------------------------------------------------------------------------------------------

set local role service_role;
select lives_ok($$insert into app.xp_ledger (user_id, language, day, amount, reason)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-01', 10, 'session.complete')$$, 'a line without source');
select is((select rule_version from app.xp_ledger where reason = 'session.complete'), 'j2.1', 'rule_version defaults to j2.1');
select is((select league_eligible from app.xp_ledger where reason = 'session.complete'), true, 'league_eligible defaults to true');
select throws_ok($$insert into app.xp_ledger (user_id, language, day, amount, reason)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-01', 10, 'session.complete')$$, '23505', null,
  'the same line without source is refused a second time');
select lives_ok($$insert into app.xp_ledger (user_id, language, day, amount, reason, meta)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-01', 10, 'session.complete', '{"ref": "other"}')$$,
  'with another meta it is another line');
select lives_ok($$insert into app.xp_ledger (user_id, language, day, amount, reason)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-02', 10, 'session.complete')$$, 'the same line on another day');
select lives_ok($$insert into app.xp_ledger (user_id, language, day, amount, reason)
  values ('c0000000-0000-4000-8000-0000000000a2', 'it', '2030-01-01', 10, 'session.complete')$$, 'the same line for another user');
select throws_ok($$insert into app.xp_ledger (user_id, day, amount, reason, rule_version)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01', 1, 'x', '')$$, '23514', null, 'an empty rule version is refused');
select throws_ok($$update app.xp_ledger set league_eligible = false$$, '42501', 'xp_ledger is append-only', 'the ledger stays append-only');

-- learning_day -------------------------------------------------------------------------------------------------------

select lives_ok($$insert into app.learning_day (user_id, day, time_zone, xp_verified, validated, cause, first_activity_at)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01', 'Europe/Paris', 84, true, 'work', now())$$, 'a learning day');
select lives_ok($$update app.learning_day set cause = 'repair' where day = '2030-01-01'$$, 'it can be rewritten (derived)');
select throws_ok($$insert into app.learning_day (user_id, day, time_zone, cause)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-02', 'Europe/Paris', 'holiday')$$, '23514', null, 'cause is a closed list');
select throws_ok($$insert into app.learning_day (user_id, day, time_zone)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-02', 'Mars/Olympus')$$, '22023', null, 'the time zone is validated');
select throws_ok($$insert into app.learning_day (user_id, day, time_zone, xp_verified)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-02', 'Europe/Paris', 401)$$, '23514', null, 'xp_verified stays within the daily bound');
select lives_ok($$insert into app.learning_day (user_id, day, time_zone, cause)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-03', 'Europe/Paris', 'travel'),
         ('c0000000-0000-4000-8000-0000000000a1', '2030-01-04', 'Europe/Paris', 'off'),
         ('c0000000-0000-4000-8000-0000000000a1', '2030-01-05', 'Europe/Paris', 'freeze'),
         ('c0000000-0000-4000-8000-0000000000a1', '2030-01-06', 'Europe/Paris', 'rest'),
         ('c0000000-0000-4000-8000-0000000000a1', '2030-01-07', 'Europe/Paris', 'session'),
         ('c0000000-0000-4000-8000-0000000000a1', '2030-01-08', 'Europe/Paris', 'none')$$, 'the eight causes are accepted');
select throws_ok($$insert into app.learning_day (user_id, day, time_zone)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01', 'Europe/Paris')$$, '23505', null, 'one row per user and day');

-- setting_change (append-only) ---------------------------------------------------------------------------------------------

select lives_ok($$insert into app.setting_change (user_id, key, value, effective_day)
  values ('c0000000-0000-4000-8000-0000000000a1', 'ring.tier', '20', '2030-01-02')$$, 'a setting change');
select throws_ok($$update app.setting_change set value = '30'$$, '42501', 'setting_change is append-only', 'it cannot be updated');
select throws_ok($$delete from app.setting_change$$, '42501', 'setting_change is append-only', 'nor deleted');
select throws_ok($$insert into app.setting_change (user_id, key, value, effective_day)
  values ('c0000000-0000-4000-8000-0000000000a1', 'ring tier!', '20', '2030-01-02')$$, '23514', null, 'the key has a closed shape');

-- streak_state additions --------------------------------------------------------------------------------------------------------

select lives_ok($$update app.streak_state set current = 3, best = 9, last_repair_day = '2030-01-01',
  freezes_granted_through = '2030-01-06', best_set_on = '2029-12-01', time_zone_changed_at = now()
  where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$, 'the four new columns are writable by service_role');
select is((select last_repair_day from app.streak_state where user_id = 'c0000000-0000-4000-8000-0000000000a1'), '2030-01-01'::date, 'and read back');

-- timezone_change (append-only) -----------------------------------------------------------------------------------------------------

select lives_ok($$insert into app.timezone_change (user_id, effective_at, time_zone)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01 10:00+00', 'Europe/Rome')$$, 'a time zone change');
select throws_ok($$insert into app.timezone_change (user_id, effective_at, time_zone)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-02 10:00+00', 'Europe/Atlantis')$$, '22023', null, 'its time zone is validated');
select throws_ok($$insert into app.timezone_change (user_id, effective_at, time_zone)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01 10:00+00', 'Europe/Paris')$$, '23505', null, 'one change per instant');
select throws_ok($$update app.timezone_change set time_zone = 'Europe/Paris'$$, '42501', 'timezone_change is append-only', 'it cannot be updated');
select throws_ok($$delete from app.timezone_change$$, '42501', 'timezone_change is append-only', 'nor deleted');

-- device_cursor ----------------------------------------------------------------------------------------------------------------------

select lives_ok($$insert into app.device_cursor (user_id, device_id, last_seq, last_day)
  values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000d1', 41, '2030-01-01')$$, 'a device cursor');
select throws_ok($$insert into app.device_cursor (user_id, device_id, last_seq)
  values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000d1', 42)$$, '23505', null, 'one cursor per user and device');
select throws_ok($$insert into app.device_cursor (user_id, device_id, last_seq)
  values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000d2', -1)$$, '23514', null, 'a sequence number is not negative');

-- ui_event (append-only) ----------------------------------------------------------------------------------------------------------------

select lives_ok($$insert into app.ui_event (user_id, name, value, occurred_at, client_event_id)
  values ('c0000000-0000-4000-8000-0000000000a1', 'sound_toggled', '{"on": true}', now(), 'c0000000-0000-4000-8000-0000000000e1')$$, 'an interface event');
select throws_ok($$insert into app.ui_event (user_id, name, occurred_at, client_event_id)
  values ('c0000000-0000-4000-8000-0000000000a1', 'Sound-Toggled', now(), 'c0000000-0000-4000-8000-0000000000e2')$$, '23514', null, 'the name has a closed shape');
select throws_ok($$insert into app.ui_event (user_id, name, value, occurred_at, client_event_id)
  values ('c0000000-0000-4000-8000-0000000000a1', 'big', jsonb_build_object('x', repeat('a', 2100)), now(), 'c0000000-0000-4000-8000-0000000000e3')$$,
  '23514', null, 'a value is at most 2 KB');
select throws_ok($$insert into app.ui_event (user_id, name, occurred_at, client_event_id)
  values ('c0000000-0000-4000-8000-0000000000a1', 'sound_toggled', now(), 'c0000000-0000-4000-8000-0000000000e1')$$, '23505', null, 'the client event id is unique per user');
select throws_ok($$update app.ui_event set name = 'x'$$, '42501', 'ui_event is append-only', 'it cannot be updated');
select throws_ok($$delete from app.ui_event$$, '42501', 'ui_event is append-only', 'nor deleted');
reset role;

-- Rows of the second user, to check isolation below.
insert into app.learning_day (user_id, day, time_zone) values ('c0000000-0000-4000-8000-0000000000a2', '2030-01-01', 'Europe/Paris');
insert into app.device_cursor (user_id, device_id, last_seq) values ('c0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-0000000000d9', 1);

-- Clients --------------------------------------------------------------------------------------------------------------------------------

set local role anon;
select throws_ok($$select count(*) from app.learning_day$$, '42501', null, 'anon cannot read learning_day');
select throws_ok($$select app.learning_day_at('Europe/Paris', now())$$, '42501', null, 'anon cannot call learning_day_at');
reset role;

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from app.learning_day), 7, 'learning_day: own rows only');
select is((select count(*)::int from app.device_cursor), 1, 'device_cursor: own row only');
select is((select count(*)::int from app.setting_change) + (select count(*)::int from app.timezone_change) + (select count(*)::int from app.ui_event),
  3, 'setting_change, timezone_change, ui_event: own rows');
select throws_ok($$select count(*) from app.ingest_state$$, '42501', null, 'ingest_state is unreadable by a client');
select throws_ok($$insert into app.learning_day (user_id, day, time_zone) values ('c0000000-0000-4000-8000-0000000000a1', '2031-01-01', 'Europe/Paris')$$,
  '42501', null, 'a client cannot write learning_day');
select throws_ok($$update app.streak_state set best = 99$$, '42501', null, 'nor streak_state');
select throws_ok($$insert into app.ui_event (user_id, name, occurred_at, client_event_id)
  values ('c0000000-0000-4000-8000-0000000000a1', 'x', now(), gen_random_uuid())$$, '42501', null, 'nor ui_event');
reset role;

select * from finish();
rollback;
