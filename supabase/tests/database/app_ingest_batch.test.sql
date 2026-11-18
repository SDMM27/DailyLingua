-- pgTAP tests for app.ingest_batch (migration 20261117000600): rights, optimistic sequence, nominal batch,
-- idempotence, conflicts, atomicity, ownership, safety bounds on XP, derived state replacement.
-- Run with `npm run db:test`. Everything is rolled back.
--
-- Not covered here: two concurrent lots (the advisory lock) need two sessions; pgTAP runs in one.

begin;
create extension if not exists pgtap with schema extensions;
select plan(108);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid');

-- Fixtures: u1 and u2 each own a session, a card, a production with its correction and an error item.
create temp table today as select app.learning_day_at('Europe/Paris', now()) as d;
grant select on pg_temp.today to service_role;

insert into app.session (id, user_id, language, day) values
  ('c0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-0000000000a1', 'it', (select d from today)),
  ('c0000000-0000-4000-8000-000000000032', 'c0000000-0000-4000-8000-0000000000a2', 'it', (select d from today));
insert into app.card (id, user_id, language, kind, front, state, due_at) values
  ('c0000000-0000-4000-8000-000000000021', 'c0000000-0000-4000-8000-0000000000a1', 'it', 'word', 'ciao', 'new', now()),
  ('c0000000-0000-4000-8000-000000000022', 'c0000000-0000-4000-8000-0000000000a2', 'it', 'word', 'mio', 'new', now());
insert into app.production (id, user_id, language, mode, text) values
  ('c0000000-0000-4000-8000-000000000041', 'c0000000-0000-4000-8000-0000000000a1', 'it', 'writing', 'Ciao'),
  ('c0000000-0000-4000-8000-000000000042', 'c0000000-0000-4000-8000-0000000000a2', 'it', 'writing', 'Mio');
insert into app.correction (id, production_id, user_id, feedback, explanation_language) values
  ('c0000000-0000-4000-8000-000000000051', 'c0000000-0000-4000-8000-000000000041', 'c0000000-0000-4000-8000-0000000000a1', '{}', 'fr'),
  ('c0000000-0000-4000-8000-000000000052', 'c0000000-0000-4000-8000-000000000042', 'c0000000-0000-4000-8000-0000000000a2', '{}', 'fr');
insert into app.error_item (id, user_id, correction_id, error_ref, prompt, answer, created_day) values
  ('c0000000-0000-4000-8000-000000000061', 'c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000051', 'e1', '{}', '{}', (select d from today)),
  ('c0000000-0000-4000-8000-000000000062', 'c0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-000000000052', 'e1', '{}', '{}', (select d from today));
insert into app.text (id, language, level_band, density, theme, prompt_version, title, body, word_count, status) values
  ('c0000000-0000-4000-8000-000000000101', 'it', 'B1', 2, 'voyage', 'v1', 'Un viaggio', 'Testo.', 1, 'published');

-- Payloads, kept in a table so that now() (constant in a transaction) makes replays identical.
create temp table pl (name text primary key, body jsonb not null);
grant select on pg_temp.pl to service_role;

-- A nominal batch of the first user, one element of every kind.
insert into pl values ('full', jsonb_build_object(
  'sessions', jsonb_build_array(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000031', 'status', 'completed',
    'started_at', now() - interval '20 minutes', 'completed_at', now())),
  'session_steps', jsonb_build_array(jsonb_build_object('session_id', 'c0000000-0000-4000-8000-000000000031', 'step', 'wake',
    'validated_at', now(), 'proof', jsonb_build_object('cards', 5))),
  'attempts', jsonb_build_array(jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000a001',
    'session_id', 'c0000000-0000-4000-8000-000000000031', 'language', 'it', 'step', 'reading', 'exercise_kind', 'mcq',
    'exercise_ref', 'c0000000-0000-4000-8000-000000000201', 'answer', jsonb_build_object('choice', 'a'),
    'result', jsonb_build_object('xpReason', 'ok'), 'correct', true, 'duration_ms', 4200, 'occurred_at', now() - interval '1 hour')),
  'cards_created', jsonb_build_array(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000023', 'language', 'it',
    'kind', 'word', 'front', 'casa', 'back', 'maison', 'back_language', 'fr', 'context', 'la casa', 'source', 'session',
    'payload', jsonb_build_object(), 'state', 'new', 'due_at', now() + interval '1 day')),
  'reviews', jsonb_build_array(jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000b001',
    'card_id', 'c0000000-0000-4000-8000-000000000021', 'rating', 3, 'mode', 'production', 'reviewed_at', now() - interval '30 minutes',
    'elapsed_days', 2.5, 'scheduled_days', 6, 'card', jsonb_build_object('state', 'review', 'stability', 6.25, 'difficulty', 5.5,
      'due_at', now() + interval '6 days', 'last_review_at', now() - interval '30 minutes', 'reps', 5, 'lapses', 0))),
  'productions', jsonb_build_array(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000043',
    'client_event_id', 'c0000000-0000-4000-8000-00000000c001', 'session_id', 'c0000000-0000-4000-8000-000000000031',
    'language', 'it', 'mode', 'writing', 'task', jsonb_build_object('prompt', 'Racconta'), 'text', 'Ciao a tutti')),
  'rewrites', jsonb_build_array(jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000d001',
    'correction_id', 'c0000000-0000-4000-8000-000000000051', 'sentence_index', 0, 'text', 'Io sono', 'accepted', true)),
  'error_items', jsonb_build_array(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000061', 'reworked_day', (select d from today))),
  'text_reads', jsonb_build_array(jsonb_build_object('text_id', 'c0000000-0000-4000-8000-000000000101', 'first_read_day', (select d from today))),
  'xp', jsonb_build_array(
    jsonb_build_object('source', jsonb_build_object('kind', 'attempt', 'client_event_id', 'c0000000-0000-4000-8000-00000000a001'),
      'language', 'it', 'day', (select d from today), 'amount', 2, 'reason', 'focus.first_try', 'rule_version', 'j2.1',
      'league_eligible', true, 'meta', jsonb_build_object()),
    jsonb_build_object('source', jsonb_build_object('kind', 'review', 'client_event_id', 'c0000000-0000-4000-8000-00000000b001'),
      'language', 'it', 'day', (select d from today), 'amount', 2, 'reason', 'review.production', 'rule_version', 'j2.1',
      'league_eligible', true, 'meta', jsonb_build_object('volet', 'study')),
    jsonb_build_object('source', null, 'language', 'it', 'day', (select d from today), 'amount', 10, 'reason', 'session.complete',
      'rule_version', 'j2.1', 'league_eligible', true, 'meta', jsonb_build_object('ref', 'c0000000-0000-4000-8000-000000000031'))),
  'learning_days', jsonb_build_array(jsonb_build_object('day', (select d from today), 'time_zone', 'Europe/Paris',
    'xp_verified', 14, 'validated', false, 'cause', 'none', 'first_activity_at', now() - interval '1 hour')),
  'streak', jsonb_build_object('current', 3, 'best', 9, 'last_day', (select d from today), 'freezes', 2, 'mode', 'daily',
    'last_repair_day', null, 'freezes_granted_through', (select d from today), 'best_set_on', (select d from today),
    'time_zone_changed_at', null),
  'device_cursors', jsonb_build_array(jsonb_build_object('device_id', 'c0000000-0000-4000-8000-00000000d0d1', 'last_seq', 41, 'last_day', (select d from today))),
  'ui_events', jsonb_build_array(jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000e001', 'name', 'sound_toggled',
    'value', jsonb_build_object('on', true), 'occurred_at', now()))
));

-- Variants of it: the same client event id with another content.
insert into pl select 'conflict_attempt', jsonb_set(body, '{attempts,0,answer}', '{"choice": "b"}') from pl where name = 'full';
insert into pl select 'conflict_review', jsonb_set(body, '{reviews,0,rating}', '1') from pl where name = 'full';
insert into pl select 'conflict_production', jsonb_set(body, '{productions,0,text}', '"Altro testo"') from pl where name = 'full';
insert into pl select 'conflict_rewrite', jsonb_set(body, '{rewrites,0,accepted}', 'false') from pl where name = 'full';
insert into pl select 'conflict_ui', jsonb_set(body, '{ui_events,0,value}', '{"on": false}') from pl where name = 'full';
insert into pl select 'conflict_xp', jsonb_set(body, '{xp,0,amount}', '3') from pl where name = 'full';

-- Calls with the current sequence number of the user.
create function pg_temp.ing(p_user uuid, p_name text) returns jsonb
language sql as $$
  select app.ingest_batch(p_user, (select s.seq from app.ingest_state s where s.user_id = p_user),
    (select body from pg_temp.pl where name = p_name));
$$;
grant execute on function pg_temp.ing(uuid, text) to service_role;
create function pg_temp.ingj(p_user uuid, p_body jsonb) returns jsonb
language sql as $$
  select app.ingest_batch(p_user, (select s.seq from app.ingest_state s where s.user_id = p_user), p_body);
$$;
grant execute on function pg_temp.ingj(uuid, jsonb) to service_role;

-- Rights -------------------------------------------------------------------------------------------------------

select ok((select prosecdef from pg_proc where oid = 'app.ingest_batch(uuid, bigint, jsonb)'::regprocedure),
  'ingest_batch is security definer');
select ok(has_function_privilege('service_role', 'app.ingest_batch(uuid, bigint, jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'app.ingest_batch(uuid, bigint, jsonb)', 'execute')
  and not has_function_privilege('anon', 'app.ingest_batch(uuid, bigint, jsonb)', 'execute'),
  'only service_role can execute it');

set local role anon;
select throws_ok($$select app.ingest_batch('c0000000-0000-4000-8000-0000000000a1', 0, '{}')$$, '42501', null, 'anon: refused');
reset role;
select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select app.ingest_batch('c0000000-0000-4000-8000-0000000000a1', 0, '{}')$$, '42501', null, 'authenticated: refused, even for their own id');
reset role;

set local role service_role;

-- Sequence ---------------------------------------------------------------------------------------------------------

select is(app.ingest_batch('c0000000-0000-4000-8000-0000000000a1', 0, '{}'), '{"seq": 1, "duplicates": []}'::jsonb,
  'an empty batch moves the sequence from 0 to 1');
select throws_ok($$select app.ingest_batch('c0000000-0000-4000-8000-0000000000a1', 0, '{}')$$, '40001', null, 'a stale sequence number: 40001');
select throws_ok($$select app.ingest_batch('c0000000-0000-4000-8000-0000000000a1', 5, '{}')$$, '40001', null, 'a sequence number ahead: 40001');
select is((select seq from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 1::bigint, 'a refused call leaves the sequence alone');
select throws_ok($$select app.ingest_batch('c0000000-0000-4000-8000-000000000999', 0, '{}')$$, '23503', null, 'an unknown user: 23503');

delete from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000a2';
select is(app.ingest_batch('c0000000-0000-4000-8000-0000000000a2', 0, '{}') ->> 'seq', '1', 'a missing ingest_state row is created on the fly');

-- Shape of the call and of the payload ------------------------------------------------------------------------------------

select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', '{"surprise": []}')$$, '22023', null, 'an unknown key is refused');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', '{"attempts": {}}')$$, '22023', null, 'an array key must be an array');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', '{"streak": []}')$$, '22023', null, 'streak must be an object or null');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('ui_events', (select jsonb_agg(1) from generate_series(1, 501))))$$,
  '22023', null, 'more than 500 elements in an array is refused');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('xp', jsonb_build_array(jsonb_build_object('x', repeat('a', 1100000)))))$$,
  '22023', null, 'a payload above 1 MiB is refused');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', '[]')$$, '22023', null, 'the payload must be an object');
select throws_ok($$select app.ingest_batch('c0000000-0000-4000-8000-0000000000a1', 1, null)$$, '22023', null, 'a null payload is refused');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', '{"streak": null}')$$, 'streak null is accepted (state left as it is)');

-- Nominal batch --------------------------------------------------------------------------------------------------------------

select is(pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'full') ->> 'seq', '3', 'the nominal batch is applied');
select is((select count(*)::int from app.attempt where user_id = 'c0000000-0000-4000-8000-0000000000a1' and step = 'reading' and correct), 1, 'attempt written');
select is((select status from app.session where id = 'c0000000-0000-4000-8000-000000000031'), 'completed', 'session completed');
select isnt((select completed_at from app.session where id = 'c0000000-0000-4000-8000-000000000031'), null, 'with its completion instant');
select is((select proof ->> 'cards' from app.session_step where session_id = 'c0000000-0000-4000-8000-000000000031' and step = 'wake'), '5', 'step written with its proof');
select is((select count(*)::int from app.card where id = 'c0000000-0000-4000-8000-000000000023' and source = 'session' and back_language = 'fr'), 1, 'card created from the session');
select is((select state || ':' || reps || ':' || stability from app.card where id = 'c0000000-0000-4000-8000-000000000021'), 'review:5:6.25', 'FSRS state of the reviewed card updated');
select is((select count(*)::int from app.review_log where user_id = 'c0000000-0000-4000-8000-0000000000a1' and origin = 'fsrs' and mode = 'production'), 1, 'review logged');
select is((select text from app.production where id = 'c0000000-0000-4000-8000-000000000043'), 'Ciao a tutti', 'production written');
select is((select accepted from app.rewrite where client_event_id = 'c0000000-0000-4000-8000-00000000d001'), true, 'rewrite written');
select is((select reworked_day from app.error_item where id = 'c0000000-0000-4000-8000-000000000061'), (select d from today), 'error item marked reworked');
select is((select count(*)::int from app.text_read where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 1, 'text read recorded');
select is((select count(*)::int || ':' || sum(amount) from app.xp_ledger where user_id = 'c0000000-0000-4000-8000-0000000000a1'), '3:14', 'three XP lines, 14 XP');
select is((select count(*)::int from app.xp_ledger where attempt_id is not null and reason = 'focus.first_try')
  + (select count(*)::int from app.xp_ledger where review_log_id is not null and reason = 'review.production'), 2,
  'the sources were resolved to the attempt and the review');
select is((select cause || ':' || xp_verified from app.learning_day where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 'none:14', 'learning day written');
select is((select "current" || ':' || best || ':' || freezes from app.streak_state where user_id = 'c0000000-0000-4000-8000-0000000000a1'), '3:9:2', 'streak state replaced');
select is((select last_seq from app.device_cursor where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 41::bigint, 'device cursor written');
select is((select count(*)::int from app.ui_event where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 1, 'interface event written');
select isnt((select app_active_since from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000a1'), null, 'the user is active in the new app');

-- Idempotence: the same batch twice ------------------------------------------------------------------------------------------------

select is(jsonb_array_length(pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'full') -> 'duplicates'), 5,
  'the same batch again: the five client events are listed as duplicates');
select is((select count(*)::int from app.attempt where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 1, 'no second attempt');
select is((select count(*)::int from app.review_log where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 1, 'no second review');
select is((select count(*)::int from app.production where user_id = 'c0000000-0000-4000-8000-0000000000a1' and client_event_id is not null), 1, 'no second production');
select is((select count(*)::int from app.rewrite where user_id = 'c0000000-0000-4000-8000-0000000000a1' and client_event_id is not null), 1, 'no second rewrite');
select is((select count(*)::int from app.ui_event where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 1, 'no second interface event');
select is((select count(*)::int || ':' || sum(amount) from app.xp_ledger where user_id = 'c0000000-0000-4000-8000-0000000000a1'), '3:14',
  'XP is not credited twice, with or without source');
select is((select count(*)::int from app.card where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 2, 'no second card');
select is((select reps from app.card where id = 'c0000000-0000-4000-8000-000000000021'), 5, 'the card is not updated again');
select is((select count(*)::int from app.learning_day where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 1, 'one learning day');
select is((select seq from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 4::bigint, 'the sequence moved all the same');

-- Same client event id, other content: 23505 ------------------------------------------------------------------------------------------

select throws_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'conflict_attempt')$$, '23505', null, 'attempt: same id, other content');
select throws_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'conflict_review')$$, '23505', null, 'review: same id, other content');
select throws_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'conflict_production')$$, '23505', null, 'production: same id, other content');
select throws_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'conflict_rewrite')$$, '23505', null, 'rewrite: same id, other content');
select throws_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'conflict_ui')$$, '23505', null, 'interface event: same id, other content');
select throws_ok($$select pg_temp.ing('c0000000-0000-4000-8000-0000000000a1', 'conflict_xp')$$, '23505', null, 'XP line of a source: same source and reason, other amount');

-- Atomicity: an invalid element cancels the whole batch ------------------------------------------------------------------------------------

select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object(
  'attempts', jsonb_build_array(jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000a002', 'language', 'it',
    'step', 'reading', 'exercise_kind', 'mcq', 'answer', '{}'::jsonb, 'occurred_at', now())),
  'ui_events', jsonb_build_array(jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000e002', 'name', 'ok_event', 'occurred_at', now())),
  'xp', jsonb_build_array(jsonb_build_object('source', jsonb_build_object('kind', 'attempt', 'client_event_id', 'c0000000-0000-4000-8000-00000000ffff'),
    'language', 'it', 'day', (select d from today), 'amount', 1, 'reason', 'focus.first_try'))))$$,
  '23503', null, 'an XP line whose source is unknown: 23503');
select is((select count(*)::int from app.attempt where client_event_id = 'c0000000-0000-4000-8000-00000000a002'), 0, 'the valid attempt before it was cancelled');
select is((select count(*)::int from app.ui_event where client_event_id = 'c0000000-0000-4000-8000-00000000e002'), 0, 'and the valid event too');
select is((select seq from app.ingest_state where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 4::bigint, 'the sequence did not move');

-- Ownership: the second user points to rows of the first ------------------------------------------------------------------------------------------

select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('attempts', jsonb_build_array(jsonb_build_object(
  'client_event_id', 'c0000000-0000-4000-8000-00000000a101', 'session_id', 'c0000000-0000-4000-8000-000000000031', 'language', 'it',
  'step', 'reading', 'exercise_kind', 'mcq', 'answer', '{}'::jsonb, 'occurred_at', now()))))$$,
  '23503', null, 'an attempt on the session of another user: 23503');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('reviews', jsonb_build_array(jsonb_build_object(
  'client_event_id', 'c0000000-0000-4000-8000-00000000b101', 'card_id', 'c0000000-0000-4000-8000-000000000021', 'rating', 3,
  'reviewed_at', now(), 'card', jsonb_build_object('state', 'review', 'due_at', now())))))$$,
  '23503', null, 'a review of the card of another user: 23503');
select is((select state from app.card where id = 'c0000000-0000-4000-8000-000000000021'), 'review', 'and that card was not touched');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('rewrites', jsonb_build_array(jsonb_build_object(
  'client_event_id', 'c0000000-0000-4000-8000-00000000d101', 'correction_id', 'c0000000-0000-4000-8000-000000000051',
  'sentence_index', 0, 'text', 'x'))))$$,
  '23503', null, 'a rewrite of the correction of another user: 23503');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('productions', jsonb_build_array(jsonb_build_object(
  'id', 'c0000000-0000-4000-8000-000000000144', 'client_event_id', 'c0000000-0000-4000-8000-00000000c101',
  'session_id', 'c0000000-0000-4000-8000-000000000031', 'language', 'it', 'mode', 'writing', 'text', 'x'))))$$,
  '23503', null, 'a production attached to the session of another user: 23503');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('sessions', jsonb_build_array(jsonb_build_object(
  'id', 'c0000000-0000-4000-8000-000000000031', 'status', 'abandoned'))))$$,
  '23503', null, 'a status change on the session of another user: 23503');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('session_steps', jsonb_build_array(jsonb_build_object(
  'session_id', 'c0000000-0000-4000-8000-000000000031', 'step', 'reading'))))$$,
  '23503', null, 'a step on the session of another user: 23503');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('error_items', jsonb_build_array(jsonb_build_object(
  'id', 'c0000000-0000-4000-8000-000000000061', 'reworked_day', (select d from today)))))$$,
  '23503', null, 'an error item of another user: 23503');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('xp', jsonb_build_array(jsonb_build_object(
  'source', jsonb_build_object('kind', 'attempt', 'client_event_id', 'c0000000-0000-4000-8000-00000000a001'),
  'day', (select d from today), 'amount', 1, 'reason', 'focus.first_try'))))$$,
  '23503', null, 'an XP line resolved on the attempt of another user: 23503');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('cards_created', jsonb_build_array(jsonb_build_object(
  'id', 'c0000000-0000-4000-8000-000000000021', 'language', 'it', 'kind', 'word', 'front', 'ciao', 'due_at', now()))))$$,
  '23503', null, 'a card created with the id of the card of another user: 23503');
select is((select count(*)::int from app.attempt where user_id = 'c0000000-0000-4000-8000-0000000000a2'), 0, 'nothing was written for the second user');

-- A card created and reviewed in the same batch ---------------------------------------------------------------------------------------------------

select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object(
  'cards_created', jsonb_build_array(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000024', 'language', 'it', 'kind', 'word',
    'front', 'sole', 'source', 'session', 'state', 'new', 'due_at', now())),
  'reviews', jsonb_build_array(jsonb_build_object('client_event_id', 'c0000000-0000-4000-8000-00000000b201',
    'card_id', 'c0000000-0000-4000-8000-000000000024', 'rating', 4, 'reviewed_at', now(),
    'card', jsonb_build_object('state', 'learning', 'stability', 1.5, 'difficulty', 4, 'due_at', now() + interval '1 day',
      'last_review_at', now(), 'reps', 1, 'lapses', 0)))))$$, 'a card created and reviewed in the same batch');
select is((select state from app.card where id = 'c0000000-0000-4000-8000-000000000024'), 'learning', 'its state is the reviewed one');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('cards_created', jsonb_build_array(jsonb_build_object(
  'id', 'c0000000-0000-4000-8000-000000000024', 'language', 'it', 'kind', 'word', 'front', 'sole', 'source', 'session', 'state', 'new', 'due_at', now()))))$$,
  'creating the same card again is ignored');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('cards_created', jsonb_build_array(jsonb_build_object(
  'id', 'c0000000-0000-4000-8000-000000000024', 'language', 'it', 'kind', 'word', 'front', 'luna', 'due_at', now()))))$$,
  '23505', null, 'with another content it fails');

-- Bounds on the attempts (table constraint) -----------------------------------------------------------------------------------------------------------------

select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('attempts', jsonb_build_array(jsonb_build_object(
  'client_event_id', 'c0000000-0000-4000-8000-00000000a201', 'language', 'it', 'step', 'reading', 'exercise_kind', 'mcq', 'answer', '{}'::jsonb,
  'occurred_at', now() - interval '8 days'))))$$, '23514', null, 'an attempt older than 7 days: 23514');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('attempts', jsonb_build_array(jsonb_build_object(
  'client_event_id', 'c0000000-0000-4000-8000-00000000a202', 'language', 'it', 'step', 'reading', 'exercise_kind', 'mcq', 'answer', '{}'::jsonb,
  'occurred_at', now() + interval '10 minutes'))))$$, '23514', null, 'an attempt more than 5 minutes in the future: 23514');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('attempts', jsonb_build_array(jsonb_build_object(
  'client_event_id', 'c0000000-0000-4000-8000-00000000a203', 'language', 'it', 'step', 'reading', 'exercise_kind', 'mcq', 'answer', '{}'::jsonb,
  'occurred_at', now() - interval '6 days'))))$$, 'an attempt of 6 days ago (late, accepted upstream) is accepted');

-- Safety bounds on the XP -------------------------------------------------------------------------------------------------------------------------------------

select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('xp', jsonb_build_array(jsonb_build_object(
  'day', (select d from today) - 4, 'amount', 1, 'reason', 'session.complete'))))$$, '23514', null, 'XP dated 4 days before the server day: 23514');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('xp', jsonb_build_array(jsonb_build_object(
  'day', (select d from today) + 2, 'amount', 1, 'reason', 'session.complete'))))$$, '23514', null, 'XP dated 2 days after the server day: 23514');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('xp', jsonb_build_array(
  jsonb_build_object('day', (select d from today) - 3, 'amount', 1, 'reason', 'session.complete'),
  jsonb_build_object('day', (select d from today) + 1, 'amount', 1, 'reason', 'session.complete'))))$$,
  'the two edges of the window (server day - 3 and + 1) are accepted');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('xp', jsonb_build_array(jsonb_build_object(
  'day', (select d from today), 'amount', 101, 'reason', 'session.complete'))))$$, '23514', null, 'a line above 100 XP: 23514');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('xp', jsonb_build_array(jsonb_build_object(
  'day', (select d from today), 'amount', 0, 'reason', 'session.complete'))))$$, '23514', null, 'a line of 0 XP: 23514');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('xp', jsonb_build_array(jsonb_build_object(
  'day', (select d from today), 'amount', 5, 'reason', 'Bad Reason!'))))$$, '22023', null, 'a reason outside the identifier shape: 22023');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('xp',
  (select jsonb_agg(jsonb_build_object('day', (select d from today) - 2, 'amount', 100, 'reason', 'x.cap', 'meta', jsonb_build_object('i', g)))
   from generate_series(1, 4) g)))$$, '400 XP in a day (four lines of 100) are accepted');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('xp', jsonb_build_array(jsonb_build_object(
  'day', (select d from today) - 2, 'amount', 1, 'reason', 'x.over'))))$$, '23514', null, 'one more XP the same day: 23514 (sum above 400)');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a2', jsonb_build_object('xp',
  (select jsonb_agg(jsonb_build_object('day', (select d from today), 'amount', 100, 'reason', 'x.cap', 'meta', jsonb_build_object('i', g)))
   from generate_series(1, 5) g)))$$, '23514', null, 'five lines of 100 in one batch: 23514');
select is((select coalesce(sum(amount), 0)::int from app.xp_ledger where user_id = 'c0000000-0000-4000-8000-0000000000a2' and day = (select d from today)), 0,
  'and none of them was kept');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('xp', jsonb_build_array(jsonb_build_object(
  'day', (select d from today) - 2, 'amount', 100, 'reason', 'x.cap'))))$$, 'the bound is per user: the first user can still earn the same day');

-- Derived state is replaced ----------------------------------------------------------------------------------------------------------------------------------------

select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('learning_days', jsonb_build_array(
  jsonb_build_object('day', (select d from today), 'time_zone', 'Europe/Paris', 'xp_verified', 84, 'validated', true, 'cause', 'work'))))$$,
  'a learning day already there is replaced');
select is((select validated || ':' || xp_verified || ':' || cause from app.learning_day
  where user_id = 'c0000000-0000-4000-8000-0000000000a1' and day = (select d from today)), 'true:84:work', 'with the new values');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('learning_days', jsonb_build_array(
  jsonb_build_object('day', (select d from today) + 2, 'time_zone', 'Europe/Paris'))))$$, '23514', null, 'a learning day in the future: 23514');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('streak', jsonb_build_object(
  'current', 4, 'best', 9, 'last_day', (select d from today), 'freezes', 1, 'mode', 'weekly')))$$, 'the streak state is replaced');
select is((select "current" || ':' || freezes || ':' || mode || ':' || coalesce(last_repair_day::text, 'none') from app.streak_state
  where user_id = 'c0000000-0000-4000-8000-0000000000a1'), '4:1:weekly:none', 'with the new values, the omitted ones emptied');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('streak', jsonb_build_object('current', 5, 'best', 2)))$$,
  '23514', null, 'a streak whose best is below the current one: 23514');

select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('sessions', jsonb_build_array(
  jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000031', 'status', 'started', 'started_at', now() - interval '3 hours'))))$$,
  'a session status going back is accepted without effect');
select is((select status from app.session where id = 'c0000000-0000-4000-8000-000000000031'), 'completed', 'the session stays completed');
select is((select started_at = now() - interval '20 minutes' from app.session where id = 'c0000000-0000-4000-8000-000000000031'), true, 'and keeps its first start');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('sessions', jsonb_build_array(
  jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000031', 'status', 'finished'))))$$, '22023', null, 'an unknown session status: 22023');

select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object(
  'device_cursors', jsonb_build_array(jsonb_build_object('device_id', 'c0000000-0000-4000-8000-00000000d0d1', 'last_seq', 40, 'last_day', (select d from today) - 1)),
  'error_items', jsonb_build_array(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000061', 'reworked_day', (select d from today) - 1)),
  'text_reads', jsonb_build_array(jsonb_build_object('text_id', 'c0000000-0000-4000-8000-000000000101', 'first_read_day', (select d from today) - 1))))$$,
  'older values for a cursor, an error item and a text read');
select is((select last_seq from app.device_cursor where device_id = 'c0000000-0000-4000-8000-00000000d0d1'), 41::bigint, 'the device cursor never goes back');
select is((select reworked_day from app.error_item where id = 'c0000000-0000-4000-8000-000000000061'), (select d from today), 'the first reworked day stays');
select is((select first_read_day from app.text_read where user_id = 'c0000000-0000-4000-8000-0000000000a1'), (select d from today), 'the first read day stays');

-- Time zones ---------------------------------------------------------------------------------------------------------------------------------------------------------------

select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('timezone_changes', jsonb_build_array(
  jsonb_build_object('effective_at', now() - interval '1 hour', 'time_zone', 'Europe/Rome'))))$$, 'a time zone change that has taken effect');
select is((select time_zone from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 'Europe/Rome', 'the profile follows it');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('timezone_changes', jsonb_build_array(
  jsonb_build_object('effective_at', now() - interval '1 hour', 'time_zone', 'Europe/Rome'))))$$, 'the same change again is ignored');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('timezone_changes', jsonb_build_array(
  jsonb_build_object('effective_at', now() - interval '1 hour', 'time_zone', 'Asia/Tokyo'))))$$, '23505', null, 'another time zone at the same instant: 23505');
select throws_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('timezone_changes', jsonb_build_array(
  jsonb_build_object('effective_at', now(), 'time_zone', 'Mars/Olympus'))))$$, '22023', null, 'an invalid time zone: 22023');
select lives_ok($$select pg_temp.ingj('c0000000-0000-4000-8000-0000000000a1', jsonb_build_object('timezone_changes', jsonb_build_array(
  jsonb_build_object('effective_at', now() + interval '2 minutes', 'time_zone', 'Asia/Tokyo'))))$$, 'a change up to 5 minutes ahead is journaled');
select is((select time_zone from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 'Asia/Tokyo', 'and the profile follows it (clock tolerance)');

reset role;
select * from finish();
rollback;
