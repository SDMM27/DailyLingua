-- pgTAP tests for migration 20261118000100 (lot W): app.ingest_event, ingest_state.memo, app.event_rate and
-- app.claim_event_rate, the new keys of app.ingest_batch (events, memo, 14-day purge), and the packet columns of
-- app.text (writing_task, listening_segment). Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(72);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'w1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'w2@test.invalid');

-- A call with the current sequence number of the user.
create function pg_temp.ingj(p_user uuid, p_body jsonb) returns jsonb
language sql as $$
  select app.ingest_batch(p_user, (select s.seq from app.ingest_state s where s.user_id = p_user), p_body);
$$;
grant execute on function pg_temp.ingj(uuid, jsonb) to service_role;

-- Rights ---------------------------------------------------------------------------------------------------------

select is(
  (select count(*)::int from pg_class t
   where t.relnamespace = 'app'::regnamespace and t.relname in ('ingest_event', 'event_rate')
     and (has_any_column_privilege('anon', t.oid, 'select, insert, update, references')
       or has_any_column_privilege('authenticated', t.oid, 'select, insert, update, references')
       or has_table_privilege('authenticated', t.oid, 'delete'))),
  0, 'ingest_event and event_rate: no privilege for anon or authenticated, not even a read');
select is((select count(*)::int from pg_tables where schemaname = 'app' and tablename in ('ingest_event', 'event_rate') and rowsecurity),
  2, 'ingest_event and event_rate have row level security');
select is((select count(*)::int from pg_policies where schemaname = 'app' and tablename in ('ingest_event', 'event_rate')),
  0, 'and no policy');
select ok(has_table_privilege('service_role', 'app.ingest_event', 'select, insert, update, delete')
  and has_table_privilege('service_role', 'app.event_rate', 'select, insert, update, delete'),
  'service_role reads and writes both');
select ok((select prosecdef from pg_proc where oid = 'app.claim_event_rate(uuid, integer, integer)'::regprocedure),
  'claim_event_rate is security definer');
select ok(has_function_privilege('service_role', 'app.claim_event_rate(uuid, integer, integer)', 'execute')
  and not has_function_privilege('authenticated', 'app.claim_event_rate(uuid, integer, integer)', 'execute')
  and not has_function_privilege('anon', 'app.claim_event_rate(uuid, integer, integer)', 'execute'),
  'only service_role can execute claim_event_rate');
select ok(has_function_privilege('service_role', 'app.ingest_batch(uuid, bigint, jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'app.ingest_batch(uuid, bigint, jsonb)', 'execute')
  and not has_function_privilege('anon', 'app.ingest_batch(uuid, bigint, jsonb)', 'execute'),
  'the new version of ingest_batch keeps its revocations');
select is((select prosecdef and proconfig = array['search_path=""'] from pg_proc where oid = 'app.ingest_batch(uuid, bigint, jsonb)'::regprocedure),
  true, 'and stays security definer with an empty search_path');

set local role anon;
select throws_ok($$select app.claim_event_rate('c0000000-0000-4000-8000-0000000000b1', 1, 10)$$, '42501', null, 'anon: claim_event_rate refused');
reset role;
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000b1", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select app.claim_event_rate('c0000000-0000-4000-8000-0000000000b1', 1, 10)$$, '42501', null, 'authenticated: claim_event_rate refused');
select throws_ok($$select count(*) from app.ingest_event$$, '42501', null, 'authenticated: ingest_event unreadable');
select throws_ok($$select count(*) from app.event_rate$$, '42501', null, 'authenticated: event_rate unreadable');
reset role;

set local role service_role;

-- Ledger: events ----------------------------------------------------------------------------------------------------

select is(pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', jsonb_build_object('events', jsonb_build_array(
  jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000f001', 'kind', 'reading_progress', 'fingerprint', '00112233445566778899aabbccddeeff'),
  jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000f002', 'kind', 'session_started', 'fingerprint', 'ffeeddccbbaa99887766554433221100')))),
  '{"seq": 1, "duplicates": []}'::jsonb, 'two events are written to the ledger');
select is((select count(*)::int from app.ingest_event where user_id = 'c0000000-0000-4000-8000-0000000000b1'), 2, 'two ledger rows');
select is((select fingerprint from app.ingest_event where client_event_id = 'c0000000-0000-4000-8000-00000000f001'),
  '00112233445566778899aabbccddeeff', 'with their fingerprint');
select is(pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', jsonb_build_object('events', jsonb_build_array(
  jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000f001', 'kind', 'reading_progress', 'fingerprint', '00112233445566778899aabbccddeeff')))),
  '{"seq": 2, "duplicates": []}'::jsonb, 'the same event with the same fingerprint is ignored');
select is((select count(*)::int from app.ingest_event where user_id = 'c0000000-0000-4000-8000-0000000000b1'), 2, 'and nothing is added');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', jsonb_build_object('events', jsonb_build_array(
  jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000f001', 'kind', 'reading_progress', 'fingerprint', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'))))$$,
  '23505', null, 'the same event with another fingerprint: 23505');
select is((select seq from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000b1'), 2::bigint, 'a refused batch leaves the sequence alone');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', jsonb_build_object(
  'events', jsonb_build_array(
    jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000f003', 'kind', 'ui_event', 'fingerprint', '0123456789abcdef0123456789abcdef'),
    jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000f001', 'kind', 'reading_progress', 'fingerprint', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')),
  'memo', jsonb_build_object('v', 1)))$$, '23505', null, 'a conflicting event cancels the whole batch');
select is((select count(*)::int from app.ingest_event where client_event_id = 'c0000000-0000-4000-8000-00000000f003'), 0, 'its sibling event is not kept');
select is((select memo from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000b1'), '{}'::jsonb, 'nor the memo');

select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', jsonb_build_object('events', jsonb_build_array(
  jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000f004', 'kind', 'ui_event', 'fingerprint', 'XYZ'))))$$,
  '23514', null, 'a fingerprint that is not 32 hex characters: 23514');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', jsonb_build_object('events', jsonb_build_array(
  jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000f004', 'kind', 'Bad Kind', 'fingerprint', '0123456789abcdef0123456789abcdef'))))$$,
  '23514', null, 'a kind outside [a-z_]: 23514');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', jsonb_build_object('events', jsonb_build_array(
  jsonb_build_object('kind', 'ui_event', 'fingerprint', '0123456789abcdef0123456789abcdef'))))$$,
  '22023', null, 'an event without client_event_id: 22023');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', jsonb_build_object('events', (select jsonb_agg(1) from generate_series(1, 501))))$$,
  '22023', null, 'more than 500 events: 22023');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', '{"events": {}}')$$, '22023', null, 'events must be an array');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', '{"surprise": []}')$$, '22023', null, 'an unknown key is still refused');

-- A user's ledger is its own: the same client event id for another user is a new row.
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b2', jsonb_build_object('events', jsonb_build_array(
  jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000f001', 'kind', 'ui_event', 'fingerprint', 'cccccccccccccccccccccccccccccccc'))))$$,
  'the ledger is per user');

-- Ledger: purge after 14 days -----------------------------------------------------------------------------------------

insert into app.ingest_event (user_id, client_event_id, kind, fingerprint, received_at) values
  ('c0000000-0000-4000-8000-0000000000b1', 'c0000000-0000-4000-8000-00000000f101', 'ui_event', '0123456789abcdef0123456789abcdef', now() - interval '15 days'),
  ('c0000000-0000-4000-8000-0000000000b1', 'c0000000-0000-4000-8000-00000000f102', 'ui_event', '0123456789abcdef0123456789abcdef', now() - interval '13 days'),
  ('c0000000-0000-4000-8000-0000000000b2', 'c0000000-0000-4000-8000-00000000f103', 'ui_event', '0123456789abcdef0123456789abcdef', now() - interval '20 days');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', '{}')$$, 'a batch purges the ledger');
select is((select array_agg(client_event_id::text order by client_event_id) from app.ingest_event where user_id = 'c0000000-0000-4000-8000-0000000000b1'
  and client_event_id in ('c0000000-0000-4000-8000-00000000f101', 'c0000000-0000-4000-8000-00000000f102')),
  array['c0000000-0000-4000-8000-00000000f102'], 'the line of 15 days is deleted, the one of 13 days kept');
select is((select count(*)::int from app.ingest_event where client_event_id = 'c0000000-0000-4000-8000-00000000f103'), 1,
  'the lines of another user are not purged by this user''s batch');

-- Memo ---------------------------------------------------------------------------------------------------------------

select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', '{"memo": {"v": 1, "days": {}}}')$$, 'a memo object is accepted');
select is((select memo from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000b1'), '{"v": 1, "days": {}}'::jsonb, 'it replaces the memo');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', '{"memo": {"v": 1, "days": {"2030-01-01": {}}}}')$$, 'another memo');
select is((select memo from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000b1'), '{"v": 1, "days": {"2030-01-01": {}}}'::jsonb, 'replaces, not merges');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', '{"memo": null}')$$, 'a null memo is accepted');
select is((select memo from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000b1'), '{"v": 1, "days": {"2030-01-01": {}}}'::jsonb, 'and leaves the memo unchanged');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', '{}')$$, 'a batch without memo');
select is((select memo from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000b1'), '{"v": 1, "days": {"2030-01-01": {}}}'::jsonb, 'leaves the memo unchanged too');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', '{"memo": []}')$$, '22023', null, 'a memo that is an array: 22023');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', '{"memo": "x"}')$$, '22023', null, 'a memo that is a string: 22023');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', jsonb_build_object('memo', jsonb_build_object('pad', repeat('x', 262144))))$$,
  '22023', null, 'a memo above 256 KiB: 22023');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000b1', jsonb_build_object('memo', jsonb_build_object('pad', repeat('x', 260000))))$$,
  'a memo just under the bound is accepted');
select throws_ok($$update app.ingest_state set memo = '[]' where user_id = 'c0000000-0000-4000-8000-0000000000b1'$$, '23514', null, 'the table refuses a memo that is not an object');
select throws_ok($$update app.ingest_state set memo = jsonb_build_object('pad', repeat('x', 262144)) where user_id = 'c0000000-0000-4000-8000-0000000000b1'$$,
  '23514', null, 'and one above 256 KiB');

-- Rate of events ------------------------------------------------------------------------------------------------------

select is(app.claim_event_rate('c0000000-0000-4000-8000-0000000000b1', 30, 50), true, 'a first claim within the limit is granted');
select is(app.claim_event_rate('c0000000-0000-4000-8000-0000000000b1', 20, 50), true, 'a second one reaching the limit exactly is granted');
select is(app.claim_event_rate('c0000000-0000-4000-8000-0000000000b1', 1, 50), false, 'one more is refused');
select is((select events from app.event_rate where user_id = 'c0000000-0000-4000-8000-0000000000b1' and window_start = date_trunc('hour', now())),
  50, 'and the counter did not move');
select is(app.claim_event_rate('c0000000-0000-4000-8000-0000000000b2', 50, 50), true, 'the counter is per user');
select is(app.claim_event_rate('c0000000-0000-4000-8000-0000000000b2', 1, 100), true, 'a higher limit lets a refused user through again');

insert into app.event_rate (user_id, window_start, events) values
  ('c0000000-0000-4000-8000-0000000000b1', date_trunc('hour', now()) - interval '3 hours', 600),
  ('c0000000-0000-4000-8000-0000000000b1', date_trunc('hour', now()) - interval '1 hour', 600);
select is(app.claim_event_rate('c0000000-0000-4000-8000-0000000000b1', 1, 50), false, 'an older window does not count in the current one');
select is((select array_agg(extract(epoch from date_trunc('hour', now()) - window_start)::int order by window_start desc)
  from app.event_rate where user_id = 'c0000000-0000-4000-8000-0000000000b1'), array[0, 3600], 'lines older than 2 hours are deleted');

select throws_ok($$select app.claim_event_rate('c0000000-0000-4000-8000-0000000000b1', 0, 10)$$, '22023', null, 'count 0: 22023');
select throws_ok($$select app.claim_event_rate('c0000000-0000-4000-8000-0000000000b1', 51, 10)$$, '22023', null, 'count 51: 22023');
select throws_ok($$select app.claim_event_rate('c0000000-0000-4000-8000-0000000000b1', 1, 0)$$, '22023', null, 'limit 0: 22023');
select throws_ok($$select app.claim_event_rate('c0000000-0000-4000-8000-0000000000b1', 1, 10001)$$, '22023', null, 'limit 10001: 22023');
select lives_ok($$select app.claim_event_rate('c0000000-0000-4000-8000-0000000000b2', 50, 10000)$$, 'the upper bounds are accepted');

-- app.text: packet columns ----------------------------------------------------------------------------------------------

insert into app.text (id, language, level_band, density, theme, prompt_version, title, body, word_count, status) values
  ('c0000000-0000-4000-8000-0000000001b1', 'it', 'B1', 2, 'voyage', 'v1', 'Un viaggio', 'Testo.', 1, 'published');
select lives_ok($$update app.text set writing_task = 'Racconta', listening_segment = '{"from": 0, "to": 3}' where id = 'c0000000-0000-4000-8000-0000000001b1'$$,
  'a writing task and a listening segment are accepted');
select lives_ok($$update app.text set listening_segment = '{"from": 2, "to": 2}' where id = 'c0000000-0000-4000-8000-0000000001b1'$$, 'from equal to to is accepted');
select lives_ok($$update app.text set writing_task = null, listening_segment = null where id = 'c0000000-0000-4000-8000-0000000001b1'$$, 'both are nullable');
select throws_ok($$update app.text set writing_task = '' where id = 'c0000000-0000-4000-8000-0000000001b1'$$, '23514', null, 'an empty writing task: 23514');
select throws_ok($$update app.text set writing_task = repeat('x', 401) where id = 'c0000000-0000-4000-8000-0000000001b1'$$, '23514', null, 'a writing task of 401 characters: 23514');
select lives_ok($$update app.text set writing_task = repeat('x', 400) where id = 'c0000000-0000-4000-8000-0000000001b1'$$, 'and of 400 is accepted');
select throws_ok($$update app.text set listening_segment = '{"from": 3, "to": 1}' where id = 'c0000000-0000-4000-8000-0000000001b1'$$, '23514', null, 'from after to: 23514');
select throws_ok($$update app.text set listening_segment = '{"from": -1, "to": 1}' where id = 'c0000000-0000-4000-8000-0000000001b1'$$, '23514', null, 'a negative bound: 23514');
select throws_ok($$update app.text set listening_segment = '{"from": 0, "to": 1, "x": 1}' where id = 'c0000000-0000-4000-8000-0000000001b1'$$, '23514', null, 'an extra key: 23514');
select throws_ok($$update app.text set listening_segment = '{"from": 0}' where id = 'c0000000-0000-4000-8000-0000000001b1'$$, '23514', null, 'a missing key: 23514');
select throws_ok($$update app.text set listening_segment = '{"from": "a", "to": 1}' where id = 'c0000000-0000-4000-8000-0000000001b1'$$, '23514', null, 'a bound that is not a number: 23514');
select throws_ok($$update app.text set listening_segment = '{"from": 0.5, "to": 1}' where id = 'c0000000-0000-4000-8000-0000000001b1'$$, '23514', null, 'a bound that is not an integer: 23514');
select throws_ok($$update app.text set listening_segment = '[0, 1]' where id = 'c0000000-0000-4000-8000-0000000001b1'$$, '23514', null, 'an array instead of an object: 23514');

reset role;
select * from finish();
rollback;
