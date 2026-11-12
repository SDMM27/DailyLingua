-- pgTAP tests for the `app` schema (migrations 20261112000100 to 500): privileges, row level security,
-- function hardening. Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

-- Two users, one row each in every table that holds user data --------------------------------------
-- (the profile and the streak state are created by the signup trigger)

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid');

insert into app.enrollment (user_id, language, daily_minutes)
select id, 'it', 20 from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.skill_estimate (user_id, language, skill, level_value, uncertainty, source)
select id, 'it', 'reading', 2.5, 0.5, 'legacy' from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.card_list (user_id, language, name)
select id, 'it', 'liste' from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.card (user_id, language, kind, front, state, due_at)
select id, 'it', 'word', 'ciao', 'new', now() from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.review_log (user_id, card_id, rating, reviewed_at, origin)
select user_id, id, 3, now(), 'fsrs' from app.card where user_id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.session (user_id, language, day)
select id, 'it', '2030-01-01' from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.attempt (user_id, session_id, language, step, exercise_kind, answer, client_event_id, occurred_at)
select user_id, id, 'it', 'quiz', 'mcq', '{}', gen_random_uuid(), now() from app.session where user_id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.study_day (user_id, day, origin)
select id, '2030-01-01', 'session' from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.production (user_id, language, mode, text)
select id, 'it', 'writing', 'Ciao' from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.correction (production_id, user_id, feedback, explanation_language)
select id, user_id, '{}', 'fr' from app.production where user_id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.rewrite (correction_id, user_id, sentence_index, text)
select id, user_id, 0, 'Ciao!' from app.correction where user_id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.assessment_result (user_id, language, kind, taken_at, payload)
select id, 'it', 'placement', now(), '{}' from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.xp_ledger (user_id, day, amount, reason)
select id, '2030-01-01', 10, 'test' from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.quota_usage (user_id, day, kind, used)
select id, '2030-01-01', 'ai', 1 from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.legacy_record (user_id, legacy_table, legacy_id, payload)
select id, 'feedback', id::text, '{}' from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a_';
insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id, user_id)
select 't', 'i', 'a', 'x', id from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a1';
insert into app.ai_call (purpose, model, user_id)
select 'test', 'm', id from auth.users where id::text like 'c0000000-0000-4000-8000-0000000000a_';

-- Structure -----------------------------------------------------------------------------------------

select is((select count(*)::int from pg_tables where schemaname = 'app' and not rowsecurity), 0,
  'row level security is enabled on every table of app');
select is((select count(*)::int from pg_tables where schemaname = 'app'), 20,
  'app has its 20 tables');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app' and not exists (
     select 1 from unnest(coalesce(p.proconfig, '{}')) c where c = 'search_path=""')),
  0, 'every function of app has an empty search_path');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app'
     and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
     and p.proname <> 'save_profile'),
  0, 'save_profile is the only function of app that clients can execute');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app' and p.proname in ('migrate_user', 'migrate_all', 'verify_migration')
     and has_function_privilege('service_role', p.oid, 'execute')),
  3, 'the migration functions are executable by service_role');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app' and p.proname in ('migrate_user', 'migrate_all', 'verify_migration')
     and not p.prosecdef),
  0, 'the migration functions are security definer');

-- anon -----------------------------------------------------------------------------------------------

select ok(not has_schema_privilege('anon', 'app', 'usage'), 'anon has no usage on schema app');
select is(
  (select count(*)::int from pg_class t
   where t.relnamespace = 'app'::regnamespace and t.relkind = 'r'
     and (has_any_column_privilege('anon', t.oid, 'select, insert, update, references')
       or has_table_privilege('anon', t.oid, 'delete') or has_table_privilege('anon', t.oid, 'truncate'))),
  0, 'anon has no privilege on any table of app');

set local role anon;
select throws_ok($$select count(*) from app.language$$, '42501', null, 'anon cannot read app.language');
select throws_ok($$select app.save_profile('fr', 'fr', 'Europe/Paris')$$, '42501', null, 'anon cannot call save_profile');
reset role;

-- authenticated: never a write privilege ---------------------------------------------------------------

select is(
  (select count(*)::int from pg_class t
   where t.relnamespace = 'app'::regnamespace and t.relkind = 'r'
     and has_any_column_privilege('authenticated', t.oid, 'insert, update, references')),
  0, 'authenticated has no INSERT or UPDATE privilege, not even on a column, in any table of app');
select is(
  (select count(*)::int from pg_class t
   where t.relnamespace = 'app'::regnamespace and t.relkind = 'r'
     and (has_table_privilege('authenticated', t.oid, 'delete')
       or has_table_privilege('authenticated', t.oid, 'truncate'))),
  0, 'authenticated cannot DELETE or TRUNCATE in any table of app');
select is(
  (select count(*)::int from pg_class t
   where t.relnamespace = 'app'::regnamespace and t.relkind = 'r'
     and has_table_privilege('service_role', t.oid, 'truncate')),
  0, 'service_role cannot TRUNCATE either');
select is(
  (select count(*)::int from pg_class t
   where t.relnamespace = 'app'::regnamespace and t.relkind = 'r'
     and not has_table_privilege('service_role', t.oid, 'select, insert, update, delete')),
  0, 'service_role can read and write every table');
select is(
  (select array_agg(t.relname::text order by t.relname) from pg_class t
   where t.relnamespace = 'app'::regnamespace and t.relkind = 'r'
     and not has_table_privilege('authenticated', t.oid, 'select')),
  array['ai_call', 'legacy_map', 'legacy_record'], 'authenticated can read every table except ai_call, legacy_map and legacy_record');

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;

select throws_ok($$insert into app.card (user_id, language, kind, front, state, due_at)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', 'word', 'x', 'new', now())$$,
  '42501', null, 'a user cannot insert a card');
select throws_ok($$update app.card set front = 'x'$$, '42501', null, 'a user cannot update a card');
select throws_ok($$delete from app.card$$, '42501', null, 'a user cannot delete a card');
select throws_ok($$delete from app.review_log$$, '42501', null, 'a user cannot delete from the review journal');
select throws_ok($$update app.profile set ui_language = 'en'$$, '42501', null, 'a user cannot update their profile directly');
select throws_ok($$select count(*) from app.ai_call$$, '42501', null, 'ai_call is unreadable by a client');
select throws_ok($$select count(*) from app.legacy_map$$, '42501', null, 'legacy_map is unreadable by a client');
select throws_ok($$select count(*) from app.legacy_record$$, '42501', null, 'legacy_record is unreadable by a client');
select throws_ok($$select app.migrate_all()$$, '42501', null, 'a user cannot run the migration');

-- Each user reads their own rows only (exactly one row per user per table was inserted).
select is((select count(*)::int from app.language), 20, 'the 20 languages are readable');
select is((select count(*)::int from app.profile), 1, 'profile: own row only');
select is((select count(*)::int from app.enrollment), 1, 'enrollment: own row only');
select is((select count(*)::int from app.skill_estimate), 1, 'skill_estimate: own row only');
select is((select count(*)::int from app.card_list), 1, 'card_list: own row only');
select is((select count(*)::int from app.card), 1, 'card: own row only');
select is((select count(*)::int from app.review_log), 1, 'review_log: own row only');
select is((select count(*)::int from app.session), 1, 'session: own row only');
select is((select count(*)::int from app.attempt), 1, 'attempt: own row only');
select is((select count(*)::int from app.study_day), 1, 'study_day: own row only');
select is(
  (select count(*)::int from app.production) + (select count(*)::int from app.correction)
  + (select count(*)::int from app.rewrite) + (select count(*)::int from app.assessment_result),
  4, 'production, correction, rewrite, assessment_result: own row only');
select is(
  (select count(*)::int from app.xp_ledger) + (select count(*)::int from app.streak_state)
  + (select count(*)::int from app.quota_usage),
  3, 'xp_ledger, streak_state, quota_usage: own row only');
select is((select count(*)::int from app.card where user_id <> 'c0000000-0000-4000-8000-0000000000a1'), 0,
  'no row of another user is visible');

reset role;
select * from finish();
rollback;
