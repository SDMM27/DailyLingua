-- pgTAP tests for the append-only journals of `app` (review_log, attempt, xp_ledger): nobody can
-- change or delete a row, not even service_role; the rows go away with their parent or their owner.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'owner@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'other@test.invalid');

insert into app.card (id, user_id, language, kind, front, state, due_at) values
  ('c0000000-0000-4000-8000-0000000000c1', 'c0000000-0000-4000-8000-0000000000b1', 'it', 'word', 'ciao', 'new', now()),
  ('c0000000-0000-4000-8000-0000000000c2', 'c0000000-0000-4000-8000-0000000000b1', 'it', 'word', 'grazie', 'new', now()),
  ('c0000000-0000-4000-8000-0000000000c3', 'c0000000-0000-4000-8000-0000000000b2', 'it', 'word', 'prego', 'new', now());
insert into app.review_log (user_id, card_id, rating, reviewed_at, origin)
select user_id, id, 3, now(), 'fsrs' from app.card;
insert into app.session (id, user_id, language, day) values
  ('c0000000-0000-4000-8000-0000000000d1', 'c0000000-0000-4000-8000-0000000000b1', 'it', '2030-01-01');
insert into app.attempt (user_id, session_id, language, step, exercise_kind, answer, client_event_id, occurred_at) values
  ('c0000000-0000-4000-8000-0000000000b1', 'c0000000-0000-4000-8000-0000000000d1', 'it', 'quiz', 'mcq', '{}', gen_random_uuid(), now()),
  ('c0000000-0000-4000-8000-0000000000b1', null, 'it', 'quiz', 'mcq', '{}', gen_random_uuid(), now());
insert into app.xp_ledger (user_id, day, amount, reason, attempt_id, review_log_id)
select b.user_id, '2030-01-01', 5, 'attempt', a.id, null
from app.attempt a join (select 'c0000000-0000-4000-8000-0000000000b1'::uuid as user_id) b on true
where a.session_id is not null;
insert into app.xp_ledger (user_id, day, amount, reason, review_log_id)
select user_id, '2030-01-01', 5, 'review', id from app.review_log where card_id = 'c0000000-0000-4000-8000-0000000000c2';
insert into app.xp_ledger (user_id, day, amount, reason)
values ('c0000000-0000-4000-8000-0000000000b1', '2030-01-01', 5, 'plain');

-- Updates and deletes fail, even for service_role --------------------------------------------------

set local role service_role;
select throws_ok($$update app.review_log set rating = 1$$, '42501', 'review_log is append-only', 'review_log cannot be updated');
select throws_ok($$delete from app.review_log where user_id = 'c0000000-0000-4000-8000-0000000000b1'$$,
  '42501', 'review_log is append-only', 'review_log cannot be deleted from');
select throws_ok($$update app.attempt set correct = true$$, '42501', 'attempt is append-only', 'attempt cannot be updated');
select throws_ok($$delete from app.attempt where session_id is null$$, '42501', 'attempt is append-only',
  'attempt cannot be deleted from');
select throws_ok($$update app.xp_ledger set amount = 100$$, '42501', 'xp_ledger is append-only', 'xp_ledger cannot be updated');
select throws_ok($$delete from app.xp_ledger where reason = 'plain'$$, '42501', 'xp_ledger is append-only',
  'xp_ledger cannot be deleted from');
select throws_ok($$truncate app.review_log cascade$$, '42501', null, 'the journals cannot be truncated');
reset role;

select throws_ok($$update app.review_log set rating = 1$$, '42501', 'review_log is append-only',
  'not even the owner of the table (postgres) can update the journal');
select is((select count(*)::int from app.review_log where user_id::text like 'c0000000-0000-4000-8000-0000000000b_'), 3,
  'no journal row was lost');

-- A parent cannot disappear and take the journal with it ---------------------------------------------

set local role service_role;
select throws_ok($$delete from app.card where id = 'c0000000-0000-4000-8000-0000000000c2'$$, '23503', null,
  'a card with a review history cannot be deleted');
select throws_ok($$delete from app.session where id = 'c0000000-0000-4000-8000-0000000000d1'$$, '23503', null,
  'a session with attempts cannot be deleted');
select lives_ok($$update app.card set deleted_at = now() where id = 'c0000000-0000-4000-8000-0000000000c2'$$,
  'a card is removed by marking it deleted');
reset role;
select is((select count(*)::int from app.review_log where card_id = 'c0000000-0000-4000-8000-0000000000c2'), 1,
  'its reviews are still there');
select is((select count(*)::int from app.xp_ledger where user_id = 'c0000000-0000-4000-8000-0000000000b1'
           and reason in ('review', 'attempt')), 2, 'and so is the XP that came from them');

-- Rows go away with their owner ----------------------------------------------------------------------

select is((select count(*)::int from app.xp_ledger where user_id = 'c0000000-0000-4000-8000-0000000000b1'), 3,
  'before the deletion of the account: the XP rows are there');
select lives_ok($$delete from auth.users where id = 'c0000000-0000-4000-8000-0000000000b1'$$,
  'an account can be deleted');
select is(
  (select count(*)::int from app.review_log where user_id = 'c0000000-0000-4000-8000-0000000000b1')
  + (select count(*)::int from app.attempt where user_id = 'c0000000-0000-4000-8000-0000000000b1')
  + (select count(*)::int from app.xp_ledger where user_id = 'c0000000-0000-4000-8000-0000000000b1')
  + (select count(*)::int from app.card where user_id = 'c0000000-0000-4000-8000-0000000000b1')
  + (select count(*)::int from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000b1')
  + (select count(*)::int from app.streak_state where user_id = 'c0000000-0000-4000-8000-0000000000b1'),
  0, 'everything of the account cascaded away, journals included');
select is((select count(*)::int from app.review_log where user_id = 'c0000000-0000-4000-8000-0000000000b2'), 1,
  'the other account keeps its journal');

select * from finish();
rollback;
