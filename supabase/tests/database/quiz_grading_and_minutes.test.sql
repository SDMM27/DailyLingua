-- pgTAP tests for migration 20261013000600: server-side quiz grading cannot be bypassed,
-- and completed minutes come from the activities' estimates, not from measured time.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000aa', 'authenticated', 'authenticated', 'grading@test.invalid');

insert into public.sources (id, name, homepage_url)
values ('50000000-0000-4000-8000-0000000000aa', 'Grading source', 'https://grading.example.com');

insert into public.contents (id, source_id, language, content_type, title, url, difficulty, duration_minutes, summary)
values ('c0000000-0000-4000-8000-0000000000aa', '50000000-0000-4000-8000-0000000000aa', 'ru', 'article', 'RU',
        'https://grading.example.com/ru', 'B2', 5, 's');

insert into public.missions (id, user_id, mission_date, budget_minutes, status, generated_at)
values ('d0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-0000000000aa', '2030-02-01', 30, 'ready', now());

insert into public.mission_sessions (id, mission_id, user_id, position, language, content_id, questions, production)
values ('e0000000-0000-4000-8000-0000000000aa', 'd0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-0000000000aa',
        0, 'ru', 'c0000000-0000-4000-8000-0000000000aa',
        '[{"id": "q1", "prompt": "p", "options": ["a", "b", "c"], "answerIndex": 1, "explanation": "e"}]',
        '{"mode": "writing", "prompt": "p", "hints": []}');

insert into public.mission_activities (id, session_id, user_id, position, kind, title, estimated_minutes) values
  ('f0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-0000000000aa', 0, 'reading', 'Read', 8),
  ('f0000000-0000-4000-8000-0000000000a2', 'e0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-0000000000aa', 1, 'comprehension', 'Quiz', 5),
  ('f0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-0000000000aa', 2, 'writing', 'Write', 4);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000aa", "role": "authenticated"}', true);
set local role authenticated;

-- Quiz grading ---------------------------------------------------------------------------------

insert into public.quiz_answers (session_id, user_id, question_id, selected_index)
values ('e0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-0000000000aa', 'q1', 0);

select is(
  (select is_correct from public.quiz_answers where question_id = 'q1'),
  false, 'a wrong answer is graded as incorrect');

update public.quiz_answers set is_correct = true where question_id = 'q1';
select is(
  (select is_correct from public.quiz_answers where question_id = 'q1'),
  false, 'setting is_correct directly is overridden by the grader');

update public.quiz_answers set selected_index = 1 where question_id = 'q1';
select is(
  (select is_correct from public.quiz_answers where question_id = 'q1'),
  true, 'changing the answer regrades it');

-- Completed minutes ----------------------------------------------------------------------------

select is(
  (select completed_minutes from public.mission_stats where mission_id = 'd0000000-0000-4000-8000-0000000000aa'),
  0, 'no completed activity: 0 completed minutes');

-- Ticked activities, no measured time (what the UI does): estimates still count.
insert into public.activity_progress (activity_id, user_id, completed_at) values
  ('f0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-0000000000aa', now()),
  ('f0000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000aa', now());
-- Started but not finished: must not count.
insert into public.activity_progress (activity_id, user_id, completed_at)
values ('f0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-0000000000aa', null);

select is(
  (select completed_minutes from public.mission_stats where mission_id = 'd0000000-0000-4000-8000-0000000000aa'),
  12, 'completed minutes = estimates of completed activities (8 + 4), unfinished ones excluded');
select is(
  (select spent_seconds from public.mission_stats where mission_id = 'd0000000-0000-4000-8000-0000000000aa'),
  0, 'measured time stays separate');

reset role;
select * from finish();
rollback;
