-- pgTAP tests for migration 20261015000400: reviews of written productions are read-only for
-- their owner, written by the service role, and limited to 3 attempts per session.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000ef', 'authenticated', 'authenticated', 'wf-a@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000ef', 'authenticated', 'authenticated', 'wf-b@test.invalid');

insert into public.sources (id, name, homepage_url)
values ('50000000-0000-4000-8000-0000000000ef', 'WF source', 'https://wf.example.com');
insert into public.contents (id, source_id, language, content_type, title, url, difficulty, duration_minutes, summary)
values ('c0000000-0000-4000-8000-0000000000ef', '50000000-0000-4000-8000-0000000000ef', 'it', 'article', 'IT',
        'https://wf.example.com/it', 'B1', 5, 's');
insert into public.missions (id, user_id, mission_date, budget_minutes, status, generated_at) values
  ('d0000000-0000-4000-8000-0000000000ef', 'a0000000-0000-4000-8000-0000000000ef', '2030-03-01', 30, 'ready', now()),
  ('d0000000-0000-4000-8000-0000000000fe', 'b0000000-0000-4000-8000-0000000000ef', '2030-03-01', 30, 'ready', now());
insert into public.mission_sessions (id, mission_id, user_id, position, language, content_id, production) values
  ('e0000000-0000-4000-8000-0000000000ef', 'd0000000-0000-4000-8000-0000000000ef', 'a0000000-0000-4000-8000-0000000000ef', 0, 'it', 'c0000000-0000-4000-8000-0000000000ef', '{"mode": "writing", "prompt": "p", "hints": []}'),
  ('e0000000-0000-4000-8000-0000000000fe', 'd0000000-0000-4000-8000-0000000000fe', 'b0000000-0000-4000-8000-0000000000ef', 0, 'it', 'c0000000-0000-4000-8000-0000000000ef', '{"mode": "writing", "prompt": "p", "hints": []}');

-- Service role: claims attempts and stores the review.
set local role service_role;

select is(public.claim_writing_feedback_attempt('e0000000-0000-4000-8000-0000000000ef', 'a0000000-0000-4000-8000-0000000000ef'),
  1::smallint, 'the first attempt is counted');
select is(public.claim_writing_feedback_attempt('e0000000-0000-4000-8000-0000000000ef', 'a0000000-0000-4000-8000-0000000000ef'),
  2::smallint, 'then the second');
select is(public.claim_writing_feedback_attempt('e0000000-0000-4000-8000-0000000000ef', 'a0000000-0000-4000-8000-0000000000ef'),
  3::smallint, 'then the third');
select is(public.claim_writing_feedback_attempt('e0000000-0000-4000-8000-0000000000ef', 'a0000000-0000-4000-8000-0000000000ef'),
  null::smallint, 'a fourth attempt is refused');
select is(public.claim_writing_feedback_attempt('e0000000-0000-4000-8000-0000000000ef', 'b0000000-0000-4000-8000-0000000000ef'),
  null::smallint, 'another user cannot claim on that session');
select throws_ok(
  $$select public.claim_writing_feedback_attempt('e0000000-0000-4000-8000-0000000000fe', 'a0000000-0000-4000-8000-0000000000ef')$$,
  '23503', null, 'nor start counting on the session of someone else');

update public.writing_feedback
set body = 'Il mio testo', feedback = '{"strength": "s"}', model = 'm', prompt_version = 'v', reviewed_at = now()
where session_id = 'e0000000-0000-4000-8000-0000000000ef';
select throws_ok(
  $$update public.writing_feedback set feedback = null where session_id = 'e0000000-0000-4000-8000-0000000000ef'$$,
  '23514', null, 'a text and its review go together');

-- The owner can read, never write.
reset role;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000ef", "role": "authenticated"}', true);
set local role authenticated;

select is((select body from public.writing_feedback), 'Il mio testo', 'the owner reads their review');
select throws_ok(
  $$update public.writing_feedback set attempts = 0$$,
  '42501', null, 'the owner cannot reset the attempt counter');
select throws_ok(
  $$insert into public.writing_feedback (session_id, user_id) values ('e0000000-0000-4000-8000-0000000000fe', 'a0000000-0000-4000-8000-0000000000ef')$$,
  '42501', null, 'nor insert a review');
select throws_ok(
  $$select public.claim_writing_feedback_attempt('e0000000-0000-4000-8000-0000000000ef', 'a0000000-0000-4000-8000-0000000000ef')$$,
  '42501', null, 'nor claim attempts themselves');

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-4000-8000-0000000000ef", "role": "authenticated"}', true);
select is((select count(*)::int from public.writing_feedback), 0, 'another user sees nothing');

-- Deleting the session deletes the review.
reset role;
delete from public.mission_sessions where id = 'e0000000-0000-4000-8000-0000000000ef';
select is((select count(*)::int from public.writing_feedback), 0, 'the review goes with its session');

select * from finish();
rollback;
