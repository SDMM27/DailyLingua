-- pgTAP tests for app.unit_progress, app.unit_test and the unit arrays of app.ingest_batch (migration 20261124000100):
-- privileges and RLS isolation, no direct client write, format constraints, upsert semantics (steps merged, best
-- score and attempts never down, passed_at set once), journal idempotence and uniqueness, account deletion.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid');

create temp table pl (name text primary key, body jsonb not null);
grant select on pg_temp.pl to service_role;

-- A first batch: the unit started (one step), a failed test.
insert into pl values ('first', jsonb_build_object(
  'unit_progress', jsonb_build_array(jsonb_build_object('unit_id', 'it-a1-01-saluer', 'language', 'it',
    'version', '0123456789ab', 'steps', jsonb_build_object('l1:dialogue', '2026-11-20T09:00:00.000Z'),
    'best_score', 7, 'test_attempts', 1, 'passed_at', null, 'passed_version', null)),
  'unit_tests', jsonb_build_array(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000701',
    'unit_id', 'it-a1-01-saluer', 'version', '0123456789ab', 'client_event_id', 'c0000000-0000-4000-8000-00000000f001',
    'score', 7, 'passed', false, 'missed', jsonb_build_array('q1', 'q2', 'q3')))
));
-- A second batch, on a new version: the same step at another instant, a new step, a pass.
insert into pl values ('pass', jsonb_build_object(
  'unit_progress', jsonb_build_array(jsonb_build_object('unit_id', 'it-a1-01-saluer', 'language', 'it',
    'version', 'abcdefabcdef', 'steps', jsonb_build_object('l1:dialogue', '2026-11-21T09:00:00.000Z', 'l1:key_phrases', '2026-11-21T09:05:00.000Z'),
    'best_score', 9, 'test_attempts', 2, 'passed_at', '2026-11-21T09:10:00.000Z', 'passed_version', 'abcdefabcdef')),
  'unit_tests', jsonb_build_array(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000702',
    'unit_id', 'it-a1-01-saluer', 'version', 'abcdefabcdef', 'client_event_id', 'c0000000-0000-4000-8000-00000000f002',
    'score', 9, 'passed', true, 'missed', jsonb_build_array('q4')))
));
-- A stale writer: lower score and attempts, a later pass, no steps.
insert into pl values ('stale', jsonb_build_object(
  'unit_progress', jsonb_build_array(jsonb_build_object('unit_id', 'it-a1-01-saluer', 'language', 'it',
    'version', 'abcdefabcdef', 'steps', jsonb_build_object(), 'best_score', 3, 'test_attempts', 1,
    'passed_at', '2026-11-22T09:10:00.000Z', 'passed_version', '999999999999'))
));
insert into pl select 'conflict_test', jsonb_set(body, '{unit_tests,0,score}', '8') from pl where name = 'pass';
insert into pl select 'reused_id', jsonb_set(body, '{unit_tests,0,client_event_id}', '"c0000000-0000-4000-8000-00000000f009"')
  from pl where name = 'first';
insert into pl values ('bad_steps', jsonb_build_object(
  'unit_progress', jsonb_build_array(jsonb_build_object('unit_id', 'ru-a1-01-saluer', 'language', 'ru',
    'version', '0123456789ab', 'steps', jsonb_build_object('l9:dialogue', '2026-11-20T09:00:00.000Z'),
    'best_score', null, 'test_attempts', 0, 'passed_at', null, 'passed_version', null)),
  'unit_tests', jsonb_build_array(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000799',
    'unit_id', 'ru-a1-01-saluer', 'version', '0123456789ab', 'client_event_id', 'c0000000-0000-4000-8000-00000000f099',
    'score', 2, 'passed', false, 'missed', jsonb_build_array()))
));

create function pg_temp.ing(p_user uuid, p_name text) returns jsonb
language sql as $$
  select app.ingest_batch(p_user, (select s.seq from app.ingest_state s where s.user_id = p_user),
    (select body from pg_temp.pl where name = p_name));
$$;
grant execute on function pg_temp.ing(uuid, text) to service_role;

-- Structure and privileges ------------------------------------------------------------------------------------------

select ok((select bool_and(rowsecurity) from pg_tables where schemaname = 'app' and tablename in ('unit_progress', 'unit_test'))
  and (select count(*) from pg_tables where schemaname = 'app' and tablename in ('unit_progress', 'unit_test')) = 2,
  'unit_progress and unit_test exist with row level security');
select ok(has_table_privilege('authenticated', 'app.unit_progress', 'select') and has_table_privilege('authenticated', 'app.unit_test', 'select'),
  'authenticated can read both tables');
select ok(not has_table_privilege('authenticated', 'app.unit_progress', 'insert, update, delete, truncate')
  and not has_table_privilege('authenticated', 'app.unit_test', 'insert, update, delete, truncate')
  and not has_any_column_privilege('authenticated', 'app.unit_progress', 'insert, update')
  and not has_any_column_privilege('authenticated', 'app.unit_test', 'insert, update'),
  'authenticated has no write privilege, not even on a column');
select ok(not has_table_privilege('anon', 'app.unit_progress', 'select, insert, update, delete')
  and not has_table_privilege('anon', 'app.unit_test', 'select, insert, update, delete'),
  'anon has no privilege');
select ok(has_table_privilege('service_role', 'app.unit_progress', 'select, insert, update, delete')
  and has_table_privilege('service_role', 'app.unit_test', 'select, insert, update, delete'),
  'service_role reads and writes');
select is((select count(*)::int from pg_policies where schemaname = 'app' and tablename in ('unit_progress', 'unit_test')
  and cmd = 'SELECT' and roles = '{authenticated}'), 2, 'one select policy per table, for authenticated');
select is((select count(*)::int from pg_policies where schemaname = 'app' and tablename in ('unit_progress', 'unit_test')
  and cmd <> 'SELECT'), 0, 'no write policy');
select ok(not has_function_privilege('authenticated', 'app.is_valid_unit_steps(jsonb)', 'execute')
  and not has_function_privilege('anon', 'app.is_valid_unit_steps(jsonb)', 'execute'),
  'the steps validator is not executable by clients');
select ok((select prosecdef from pg_proc where oid = 'app.ingest_batch(uuid, bigint, jsonb)'::regprocedure)
  and (select proconfig from pg_proc where oid = 'app.ingest_batch(uuid, bigint, jsonb)'::regprocedure) = array['search_path=""'],
  'ingest_batch stays security definer with an empty search_path');
select ok(has_function_privilege('service_role', 'app.ingest_batch(uuid, bigint, jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'app.ingest_batch(uuid, bigint, jsonb)', 'execute')
  and not has_function_privilege('anon', 'app.ingest_batch(uuid, bigint, jsonb)', 'execute'),
  'only service_role can execute ingest_batch');

-- Format constraints (as the owner) -------------------------------------------------------------------------------------

select throws_ok($$insert into app.unit_progress (user_id, unit_id, language, version)
  values ('c0000000-0000-4000-8000-0000000000a1', 'Saluer', 'it', '0123456789ab')$$, '23514', null, 'a malformed unit id is refused');
select throws_ok($$insert into app.unit_progress (user_id, unit_id, language, version)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it-a1-01-saluer', 'it', '0123456789AB')$$, '23514', null, 'a malformed version is refused');
select throws_ok($$insert into app.unit_progress (user_id, unit_id, language, version)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it-a1-01-saluer', 'ru', '0123456789ab')$$, '23514', null, 'a language other than the prefix of the unit is refused');
select throws_ok($$insert into app.unit_progress (user_id, unit_id, language, version, best_score)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it-a1-01-saluer', 'it', '0123456789ab', 11)$$, '23514', null, 'a best score above 10 is refused');
select throws_ok($$insert into app.unit_progress (user_id, unit_id, language, version, steps)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it-a1-01-saluer', 'it', '0123456789ab', '{"l1:dialogue": "yesterday"}')$$, '23514', null, 'a step without an instant is refused');
select throws_ok($$insert into app.unit_progress (user_id, unit_id, language, version, steps)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it-a1-01-saluer', 'it', '0123456789ab', '[]')$$, '23514', null, 'steps that are not an object are refused');
select throws_ok($$insert into app.unit_progress (user_id, unit_id, language, version, passed_at)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it-a1-01-saluer', 'it', '0123456789ab', now())$$, '23514', null, 'passed_at without passed_version is refused');
select throws_ok($$insert into app.unit_test (id, user_id, unit_id, version, client_event_id, score, passed)
  values (gen_random_uuid(), 'c0000000-0000-4000-8000-0000000000a1', 'it-a1-01-saluer', '0123456789ab', gen_random_uuid(), 11, true)$$,
  '23514', null, 'a test score above 10 is refused');

-- ingest_batch: insert, then upsert semantics ------------------------------------------------------------------------------

set local role service_role;
select lives_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'first')$$, 'a first batch writes the progress and the test');
reset role;
select results_eq($$select version, steps, best_score::int, test_attempts, passed_at from app.unit_progress
  where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$,
  $$values ('0123456789ab', '{"l1:dialogue": "2026-11-20T09:00:00.000Z"}'::jsonb, 7, 1, null::timestamptz)$$,
  'the progress row is inserted as sent');
select results_eq($$select score::int, passed, missed from app.unit_test where id = 'c0000000-0000-4000-8000-000000000701'$$,
  $$values (7, false, '{q1,q2,q3}'::text[])$$, 'the test row is inserted as sent');

set local role service_role;
select is((select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'first') -> 'duplicates'),
  '["c0000000-0000-4000-8000-00000000f001"]'::jsonb, 'a replayed test row is a duplicate, not an error');
select lives_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'pass')$$, 'a second batch upserts the progress');
reset role;
select results_eq($$select version, steps, best_score::int, test_attempts, passed_at, passed_version from app.unit_progress
  where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$,
  $$values ('abcdefabcdef', '{"l1:dialogue": "2026-11-20T09:00:00.000Z", "l1:key_phrases": "2026-11-21T09:05:00.000Z"}'::jsonb, 9, 2,
    '2026-11-21T09:10:00.000Z'::timestamptz, 'abcdefabcdef')$$,
  'steps are merged (a recorded step keeps its instant), the score and the attempts rise, passed_at is set');

set local role service_role;
select lives_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'stale')$$, 'a stale batch is accepted');
reset role;
select results_eq($$select steps, best_score::int, test_attempts, passed_at, passed_version from app.unit_progress
  where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$,
  $$values ('{"l1:dialogue": "2026-11-20T09:00:00.000Z", "l1:key_phrases": "2026-11-21T09:05:00.000Z"}'::jsonb, 9, 2,
    '2026-11-21T09:10:00.000Z'::timestamptz, 'abcdefabcdef')$$,
  'nothing goes back: steps kept, best score and attempts kept, passed_at and passed_version never overwritten');
select ok((select count(*) from app.unit_test where user_id = 'c0000000-0000-4000-8000-0000000000a1') = 2, 'two test rows');

set local role service_role;
select throws_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'conflict_test')$$, '23505', null,
  'a test client_event_id reused with another content is refused');
select throws_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'reused_id')$$, '23505', null,
  'a test id reused under another event is refused');
select throws_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a2', 'first')$$, '23505', null,
  'a test id (or event) of another account is refused');
select throws_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'bad_steps')$$, '23514', null,
  'a malformed steps object is refused');
reset role;
select is((select count(*)::int from app.unit_test where unit_id = 'ru-a1-01-saluer'), 0,
  'a refused batch writes nothing (the test of the same batch is rolled back)');
select is((select count(*)::int from app.unit_progress where user_id = 'c0000000-0000-4000-8000-0000000000a2'), 0,
  'the refused batch of the other account wrote nothing');
select throws_ok($$insert into app.unit_test (id, user_id, unit_id, version, client_event_id, score, passed)
  values (gen_random_uuid(), 'c0000000-0000-4000-8000-0000000000a2', 'it-a1-01-saluer', '0123456789ab',
          'c0000000-0000-4000-8000-00000000f001', 5, false)$$, '23505', null, 'client_event_id is unique across the table');
select throws_ok($$update app.unit_test set score = 10 where id = 'c0000000-0000-4000-8000-000000000701'$$, '42501', null,
  'unit_test is append-only');

-- RLS: each account reads its own rows, writes nothing ---------------------------------------------------------------------

insert into app.unit_progress (user_id, unit_id, language, version)
  values ('c0000000-0000-4000-8000-0000000000a2', 'ru-a1-01-saluer', 'ru', '0123456789ab');

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a2", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from app.unit_progress), 1, 'u2 reads its own progress only');
select is((select count(*)::int from app.unit_test), 0, 'u2 reads no test of u1');
select throws_ok($$insert into app.unit_progress (user_id, unit_id, language, version)
  values ('c0000000-0000-4000-8000-0000000000a2', 'it-a1-01-saluer', 'it', '0123456789ab')$$, '42501', null, 'u2 cannot insert progress');
select throws_ok($$update app.unit_progress set best_score = 10$$, '42501', null, 'u2 cannot update its progress');
select throws_ok($$delete from app.unit_progress$$, '42501', null, 'u2 cannot delete its progress');
select throws_ok($$insert into app.unit_test (id, user_id, unit_id, version, client_event_id, score, passed)
  values (gen_random_uuid(), 'c0000000-0000-4000-8000-0000000000a2', 'it-a1-01-saluer', '0123456789ab', gen_random_uuid(), 10, true)$$,
  '42501', null, 'u2 cannot insert a test');
reset role;
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from app.unit_test), 2, 'u1 reads its two tests');
reset role;

-- Account deletion ---------------------------------------------------------------------------------------------------------

delete from auth.users where id = 'c0000000-0000-4000-8000-0000000000a1';
select is((select count(*)::int from app.unit_progress where user_id = 'c0000000-0000-4000-8000-0000000000a1')
  + (select count(*)::int from app.unit_test where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 0,
  'the rows of a deleted account go with it');
select is((select count(*)::int from app.unit_progress where user_id = 'c0000000-0000-4000-8000-0000000000a2'), 1,
  'the other account keeps its rows');

select * from finish();
rollback;
