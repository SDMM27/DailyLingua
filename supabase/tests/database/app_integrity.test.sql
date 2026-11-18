-- pgTAP tests for the composite keys of `app` (a row cannot point to the parent of another user) and
-- for the bounds and triggers added by migration 20261112000700. Run with `npm run db:test`.
-- Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

insert into auth.users (instance_id, id, aud, role, email, is_anonymous) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid', true),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid', false);

-- u2 owns a list, a card, a session, an attempt, a review, a production and a correction.
insert into app.card_list (id, user_id, language, name) values
  ('c0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-0000000000a2', 'it', 'liste u2');
insert into app.card (id, user_id, language, kind, front, state, due_at) values
  ('c0000000-0000-4000-8000-000000000021', 'c0000000-0000-4000-8000-0000000000a2', 'it', 'word', 'ciao', 'new', now()),
  ('c0000000-0000-4000-8000-000000000022', 'c0000000-0000-4000-8000-0000000000a1', 'it', 'word', 'mio', 'new', now());
insert into app.session (id, user_id, language, day) values
  ('c0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-0000000000a2', 'it', '2030-01-01'),
  ('c0000000-0000-4000-8000-000000000032', 'c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-01');
insert into app.attempt (id, user_id, session_id, language, step, exercise_kind, answer, client_event_id, occurred_at)
overriding system value values
  (9001, 'c0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-000000000031', 'it', 'q', 'mcq', '{}', gen_random_uuid(), now());
insert into app.review_log (id, user_id, card_id, rating, reviewed_at, origin)
overriding system value values
  (9002, 'c0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-000000000021', 3, now(), 'fsrs');
insert into app.production (id, user_id, language, mode, text) values
  ('c0000000-0000-4000-8000-000000000041', 'c0000000-0000-4000-8000-0000000000a2', 'it', 'writing', 'Ciao'),
  ('c0000000-0000-4000-8000-000000000042', 'c0000000-0000-4000-8000-0000000000a1', 'it', 'writing', 'Mio'),
  ('c0000000-0000-4000-8000-000000000043', 'c0000000-0000-4000-8000-0000000000a2', 'it', 'writing', 'Senza correzione');
insert into app.correction (id, production_id, user_id, feedback, explanation_language) values
  ('c0000000-0000-4000-8000-000000000051', 'c0000000-0000-4000-8000-000000000041', 'c0000000-0000-4000-8000-0000000000a2', '{}', 'fr');

-- Cross-user references are refused, whoever writes ---------------------------------------------------------

select throws_ok($$insert into app.card (user_id, language, kind, front, state, due_at, list_id)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', 'word', 'x', 'new', now(), 'c0000000-0000-4000-8000-000000000011')$$,
  '23503', null, 'a card cannot join the list of another user');
select throws_ok($$insert into app.card (user_id, language, kind, front, state, due_at, list_id)
  values ('c0000000-0000-4000-8000-0000000000a2', 'es', 'word', 'x', 'new', now(), 'c0000000-0000-4000-8000-000000000011')$$,
  '23503', null, 'nor a list of another language');
select throws_ok($$insert into app.review_log (user_id, card_id, rating, reviewed_at, origin)
  values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000021', 3, now(), 'fsrs')$$,
  '23503', null, 'a review cannot point to the card of another user');
select throws_ok($$insert into app.attempt (user_id, session_id, language, step, exercise_kind, answer, client_event_id, occurred_at)
  values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000031', 'it', 'q', 'mcq', '{}', gen_random_uuid(), now())$$,
  '23503', null, 'an attempt cannot point to the session of another user');
select throws_ok($$insert into app.attempt (user_id, session_id, language, step, exercise_kind, answer, client_event_id, occurred_at)
  values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000032', 'es', 'q', 'mcq', '{}', gen_random_uuid(), now())$$,
  '23503', null, 'nor to a session of another language');
select throws_ok($$insert into app.xp_ledger (user_id, day, amount, reason, attempt_id)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01', 5, 'x', 9001)$$,
  '23503', null, 'XP cannot be earned on the attempt of another user');
select throws_ok($$insert into app.xp_ledger (user_id, day, amount, reason, review_log_id)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01', 5, 'x', 9002)$$,
  '23503', null, 'nor on the review of another user');
select throws_ok($$insert into app.production (user_id, language, session_id, mode, text)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', 'c0000000-0000-4000-8000-000000000031', 'writing', 'x')$$,
  '23503', null, 'a production cannot point to the session of another user');
select throws_ok($$insert into app.correction (production_id, user_id, feedback, explanation_language)
  values ('c0000000-0000-4000-8000-000000000043', 'c0000000-0000-4000-8000-0000000000a1', '{}', 'fr')$$,
  '23503', null, 'a correction cannot point to the production of another user');
select throws_ok($$insert into app.rewrite (correction_id, user_id, sentence_index, text)
  values ('c0000000-0000-4000-8000-000000000051', 'c0000000-0000-4000-8000-0000000000a1', 0, 'x')$$,
  '23503', null, 'a rewrite cannot point to the correction of another user');

set local role service_role;
select throws_ok($$insert into app.review_log (user_id, card_id, rating, reviewed_at, origin)
  values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000021', 3, now(), 'fsrs')$$,
  '23503', null, 'service_role is held by the same keys');
reset role;

-- Own links work, and what they do on deletion ------------------------------------------------------------

select lives_ok($$insert into app.card (id, user_id, language, kind, front, state, due_at, list_id) values
  ('c0000000-0000-4000-8000-000000000023', 'c0000000-0000-4000-8000-0000000000a2', 'it', 'word', 'x', 'new', now(),
   'c0000000-0000-4000-8000-000000000011')$$, 'a card can join the list of its owner');
select lives_ok($$delete from app.card_list where id = 'c0000000-0000-4000-8000-000000000011'$$, 'a list can be deleted');
select is((select list_id from app.card where id = 'c0000000-0000-4000-8000-000000000023'), null,
  'its cards stay, without a list');
select lives_ok($$delete from app.session where id = 'c0000000-0000-4000-8000-000000000032'$$,
  'a session without attempts can be deleted');
select lives_ok($$delete from app.production where id = 'c0000000-0000-4000-8000-000000000041'$$,
  'a production can be deleted');
select is((select count(*)::int from app.correction where id = 'c0000000-0000-4000-8000-000000000051'), 0,
  'its correction goes with it');

-- Bounds ------------------------------------------------------------------------------------------------------

select lives_ok($$insert into app.xp_ledger (user_id, day, amount, reason, attempt_id)
  values ('c0000000-0000-4000-8000-0000000000a2', '2030-01-01', 100, 'quiz', 9001)$$, 'XP up to 100 is accepted');
select throws_ok($$insert into app.xp_ledger (user_id, day, amount, reason)
  values ('c0000000-0000-4000-8000-0000000000a2', '2030-01-01', 101, 'big')$$, '23514', null, 'more than 100 XP is refused');
select throws_ok($$insert into app.xp_ledger (user_id, day, amount, reason, attempt_id)
  values ('c0000000-0000-4000-8000-0000000000a2', '2030-01-01', 5, 'quiz', 9001)$$, '23505', null,
  'the same attempt cannot earn the same XP twice');
select throws_ok($$insert into app.xp_ledger (user_id, day, amount, reason, review_log_id) values
  ('c0000000-0000-4000-8000-0000000000a2', '2030-01-01', 5, 'review', 9002),
  ('c0000000-0000-4000-8000-0000000000a2', '2030-01-01', 5, 'review', 9002)$$, '23505', null,
  'nor the same review');
select throws_ok($$insert into app.attempt (user_id, language, step, exercise_kind, answer, client_event_id, occurred_at)
  values ('c0000000-0000-4000-8000-0000000000a2', 'it', 'q', 'mcq', '{}', gen_random_uuid(), now() + interval '1 day')$$,
  '23514', null, 'an attempt dated in the future is refused');
select throws_ok($$insert into app.attempt (user_id, language, step, exercise_kind, answer, client_event_id, occurred_at)
  values ('c0000000-0000-4000-8000-0000000000a2', 'it', 'q', 'mcq', '{}', gen_random_uuid(), now() - interval '8 days')$$,
  '23514', null, 'and one older than a week');
select throws_ok($$insert into app.attempt (user_id, language, step, exercise_kind, answer, client_event_id, occurred_at, duration_ms)
  values ('c0000000-0000-4000-8000-0000000000a2', 'it', 'q', 'mcq', '{}', gen_random_uuid(), now(), 3600001)$$,
  '23514', null, 'an attempt lasting more than an hour is refused');
select throws_ok($$insert into app.attempt (user_id, language, step, exercise_kind, answer, client_event_id, occurred_at)
  values ('c0000000-0000-4000-8000-0000000000a2', 'it', 'q', 'mcq', to_jsonb(repeat('x', 20001)), gen_random_uuid(), now())$$,
  '23514', null, 'a huge answer is refused');
select throws_ok($$update app.streak_state set "current" = -1 where user_id = 'c0000000-0000-4000-8000-0000000000a2'$$,
  '23514', null, 'a negative streak is refused');
select throws_ok($$update app.streak_state set "current" = 5, best = 3 where user_id = 'c0000000-0000-4000-8000-0000000000a2'$$,
  '23514', null, 'a best streak below the current one is refused');
select lives_ok($$update app.streak_state set "current" = 3, best = 3 where user_id = 'c0000000-0000-4000-8000-0000000000a2'$$,
  'consistent streak values are accepted');
select throws_ok($$insert into app.card (user_id, language, kind, front, state, due_at)
  values ('c0000000-0000-4000-8000-0000000000a2', 'it', 'word', repeat('x', 501), 'new', now())$$,
  '23514', null, 'a card front over 500 characters is refused');
select throws_ok($$insert into app.card (user_id, language, kind, front, back, state, due_at)
  values ('c0000000-0000-4000-8000-0000000000a2', 'it', 'word', 'x', repeat('x', 1001), 'new', now())$$,
  '23514', null, 'a card back over 1000 characters is refused');

-- Guest conversion and enrollment reactivation ----------------------------------------------------------------

select is((select is_guest from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000a1'), true,
  'a guest starts as a guest');
update auth.users set is_anonymous = false where id = 'c0000000-0000-4000-8000-0000000000a1';
select is((select is_guest from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000a1'), false,
  'a guest who converts their account is no longer a guest in app');
update auth.users set email = 'changed@test.invalid' where id = 'c0000000-0000-4000-8000-0000000000a1';
select is((select is_guest from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000a1'), false,
  'another update of the account leaves it alone');

insert into app.enrollment (user_id, language, daily_minutes, active)
values ('c0000000-0000-4000-8000-0000000000a2', 'es', 20, false);
update app.profile set native_language = 'es' where user_id = 'c0000000-0000-4000-8000-0000000000a2';
select throws_ok($$update app.enrollment set active = true where user_id = 'c0000000-0000-4000-8000-0000000000a2'$$,
  '23514', null, 'an enrollment cannot be reactivated in the native language');
select lives_ok($$update app.enrollment set daily_minutes = 25 where user_id = 'c0000000-0000-4000-8000-0000000000a2'$$,
  'an inactive enrollment stays editable');

select * from finish();
rollback;
