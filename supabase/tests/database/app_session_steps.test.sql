-- pgTAP tests for the session additions (migration 20261117000200): format and kind, steps, the
-- `session` card source, the client event id of productions and rewrites, the error of the day (the
-- answer is never readable by a client). Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid');

insert into app.session (id, user_id, language, day) values
  ('c0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-01'),
  ('c0000000-0000-4000-8000-000000000032', 'c0000000-0000-4000-8000-0000000000a2', 'it', '2030-01-01');
insert into app.production (id, user_id, language, mode, text) values
  ('c0000000-0000-4000-8000-000000000041', 'c0000000-0000-4000-8000-0000000000a1', 'it', 'writing', 'Ciao'),
  ('c0000000-0000-4000-8000-000000000042', 'c0000000-0000-4000-8000-0000000000a2', 'it', 'writing', 'Mio');
insert into app.correction (id, production_id, user_id, feedback, explanation_language) values
  ('c0000000-0000-4000-8000-000000000051', 'c0000000-0000-4000-8000-000000000041', 'c0000000-0000-4000-8000-0000000000a1', '{}', 'fr'),
  ('c0000000-0000-4000-8000-000000000052', 'c0000000-0000-4000-8000-000000000042', 'c0000000-0000-4000-8000-0000000000a2', '{}', 'fr');

-- Session: format, kind, served_at ---------------------------------------------------------------------------

select is((select format from app.session where id = 'c0000000-0000-4000-8000-000000000031'), 15::smallint, 'format defaults to 15');
select is((select kind from app.session where id = 'c0000000-0000-4000-8000-000000000031'), 'daily', 'kind defaults to daily');
select is((select served_at from app.session where id = 'c0000000-0000-4000-8000-000000000031'), null, 'served_at is empty until the package is served');

set local role service_role;
select throws_ok($$update app.session set format = 25 where id = 'c0000000-0000-4000-8000-000000000031'$$, '23514', null, 'format is 10, 15, 20 or 30');
select lives_ok($$update app.session set format = 30, served_at = now() where id = 'c0000000-0000-4000-8000-000000000031'$$, 'format 30 and served_at are accepted');
select throws_ok($$update app.session set kind = 'extra' where id = 'c0000000-0000-4000-8000-000000000031'$$, '23514', null, 'kind is a closed list');
select throws_ok($$insert into app.session (user_id, language, day)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-01')$$, '23505', null, 'a second daily session of the same day is refused');
select lives_ok($$insert into app.session (user_id, language, day, kind)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-01', 'catch_up')$$, 'a catch-up session of the same day is accepted');
select throws_ok($$insert into app.session (user_id, language, day, kind)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-01', 'catch_up')$$, '23505', null, 'but only one');
select lives_ok($$insert into app.session (user_id, language, day, kind)
  values ('c0000000-0000-4000-8000-0000000000a1', 'es', '2030-01-01', 'daily')$$, 'another language has its own session');

-- Steps -----------------------------------------------------------------------------------------------------

select lives_ok($$insert into app.session_step (session_id, user_id, language, step, validated_at, proof)
  values ('c0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-0000000000a1', 'it', 'wake', now(), '{"cards": 5}')$$,
  'service_role writes a step');
select lives_ok($$update app.session_step set proof = '{"cards": 6}' where step = 'wake'$$, 'and rewrites it (derived data)');
select throws_ok($$insert into app.session_step (session_id, user_id, language, step)
  values ('c0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-0000000000a1', 'it', 'wake')$$, '23505', null, 'a step exists once per session');
select throws_ok($$insert into app.session_step (session_id, user_id, language, step)
  values ('c0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-0000000000a1', 'it', 'bilan')$$, '23514', null, 'step is a closed list');
select throws_ok($$insert into app.session_step (session_id, user_id, language, step)
  values ('c0000000-0000-4000-8000-000000000032', 'c0000000-0000-4000-8000-0000000000a1', 'it', 'reading')$$, '23503', null,
  'a step cannot point to the session of another user');
select throws_ok($$insert into app.session_step (session_id, user_id, language, step)
  values ('c0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-0000000000a1', 'es', 'reading')$$, '23503', null,
  'nor to a session of another language');
select lives_ok($$insert into app.session_step (session_id, user_id, language, step)
  values ('c0000000-0000-4000-8000-000000000032', 'c0000000-0000-4000-8000-0000000000a2', 'it', 'reading')$$, 'a step of the second user');

-- Card source ---------------------------------------------------------------------------------------------

select lives_ok($$insert into app.card (user_id, language, kind, front, state, due_at, source)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', 'word', 'casa', 'new', now(), 'session')$$, 'a card can come from a session');
select throws_ok($$insert into app.card (user_id, language, kind, front, state, due_at, source)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', 'word', 'casa2', 'new', now(), 'bogus')$$, '23514', null, 'the source stays a closed list');
select lives_ok($$insert into app.card (user_id, language, kind, front, state, due_at, source)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', 'word', 'casa3', 'new', now(), 'mission')$$, 'previous sources still work');

-- Client event ids ---------------------------------------------------------------------------------------------

select lives_ok($$insert into app.production (user_id, language, mode, text, client_event_id)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', 'writing', 'uno', 'c0000000-0000-4000-8000-0000000000e1')$$, 'a production with a client event id');
select throws_ok($$insert into app.production (user_id, language, mode, text, client_event_id)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', 'writing', 'due', 'c0000000-0000-4000-8000-0000000000e1')$$, '23505', null,
  'the client event id of a production is unique per user');
select lives_ok($$insert into app.production (user_id, language, mode, text, client_event_id)
  values ('c0000000-0000-4000-8000-0000000000a2', 'it', 'writing', 'uno', 'c0000000-0000-4000-8000-0000000000e1')$$, 'another user can use the same value');
select lives_ok($$insert into app.production (user_id, language, mode, text) values
  ('c0000000-0000-4000-8000-0000000000a1', 'it', 'writing', 'x'), ('c0000000-0000-4000-8000-0000000000a1', 'it', 'writing', 'y')$$,
  'productions without a client event id are not constrained');
select lives_ok($$insert into app.rewrite (correction_id, user_id, sentence_index, text, client_event_id)
  values ('c0000000-0000-4000-8000-000000000051', 'c0000000-0000-4000-8000-0000000000a1', 0, 'uno', 'c0000000-0000-4000-8000-0000000000e2')$$, 'a rewrite with a client event id');
select throws_ok($$insert into app.rewrite (correction_id, user_id, sentence_index, text, client_event_id)
  values ('c0000000-0000-4000-8000-000000000051', 'c0000000-0000-4000-8000-0000000000a1', 1, 'due', 'c0000000-0000-4000-8000-0000000000e2')$$, '23505', null,
  'the client event id of a rewrite is unique per user');

-- Error of the day -------------------------------------------------------------------------------------------

select lives_ok($$insert into app.error_item (id, user_id, correction_id, error_ref, prompt, answer, created_day)
  values ('c0000000-0000-4000-8000-000000000061', 'c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000051',
          'e1', '{"q": "Corrige"}', '{"a": "Io sono"}', '2030-01-01')$$, 'service_role writes an error item');
select throws_ok($$insert into app.error_item (user_id, correction_id, error_ref, prompt, answer, created_day)
  values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000052', 'e1', '{}', '{}', '2030-01-01')$$, '23503', null,
  'an error item cannot point to the correction of another user');
select throws_ok($$insert into app.error_item (user_id, correction_id, error_ref, prompt, answer, created_day)
  values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000051', 'e1', '{}', '{}', '2030-01-01')$$, '23505', null,
  'an error is drawn once per correction');
reset role;

set local role anon;
select throws_ok($$select count(*) from app.error_item$$, '42501', null, 'anon cannot read error_item');
select throws_ok($$select count(*) from app.session_step$$, '42501', null, 'anon cannot read session_step');
reset role;

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from app.session_step), 1, 'session_step: own rows only');
select is((select count(*)::int from app.error_item where reworked_day is null), 1, 'error_item: own row readable without the answer');
select throws_ok($$select answer from app.error_item$$, '42501', null, 'the answer of an error item is unreadable');
select throws_ok($$select * from app.error_item$$, '42501', null, 'so is select *');
reset role;

select * from finish();
rollback;
