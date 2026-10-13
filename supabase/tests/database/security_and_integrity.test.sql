-- pgTAP tests: Row Level Security and data integrity.
-- Run with `npm run db:test` (supabase test db). Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

-- Fixtures (created as the superuser, i.e. what the service role / a migration can do) -------

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'b@test.invalid');

insert into public.sources (id, name, homepage_url)
values ('50000000-0000-4000-8000-000000000001', 'Test source', 'https://example.com');

insert into public.contents (id, source_id, language, content_type, title, url, difficulty, duration_minutes, summary)
values
  ('c0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'ru', 'article', 'RU', 'https://example.com/ru', 'B2', 5, 's'),
  ('c0000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 'it', 'article', 'IT', 'https://example.com/it', 'B2', 5, 's');

insert into public.user_languages (user_id, language, level, target_level, weight)
values ('b0000000-0000-4000-8000-000000000002', 'ru', 'B2', 'C1', 2);

insert into public.missions (id, user_id, mission_date, budget_minutes, status, generated_at) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '2030-01-01', 30, 'ready', now()),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', '2030-01-01', 30, 'ready', now());

insert into public.mission_sessions (id, mission_id, user_id, position, language, content_id, questions, production) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 0, 'ru',
   'c0000000-0000-4000-8000-000000000001',
   '[{"id": "q1", "prompt": "p", "options": ["a", "b", "c"], "answerIndex": 1, "explanation": "e"}]',
   '{"mode": "writing", "prompt": "p", "hints": []}'),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 0, 'ru',
   'c0000000-0000-4000-8000-000000000001',
   '[{"id": "q1", "prompt": "p", "options": ["a", "b", "c"], "answerIndex": 1, "explanation": "e"}]',
   '{"mode": "writing", "prompt": "p", "hints": []}');

insert into public.mission_activities (id, session_id, user_id, position, kind, title, estimated_minutes) values
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 0, 'reading', 'Read', 5),
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 0, 'reading', 'Read', 5),
  ('f0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 1, 'vocabulary', 'Words', 5);

insert into public.activity_progress (activity_id, user_id, completed_at, spent_seconds)
values ('f0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', now(), 300);

insert into public.quiz_answers (session_id, user_id, question_id, selected_index)
values ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'q1', 1);

insert into public.vocabulary_items (id, user_id, language, term, translation, due_on, added_on) values
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'ru', 'мир', 'monde', '2030-01-01', '2030-01-01'),
  ('10000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'ru', 'мир', 'monde', '2030-01-01', '2030-01-01');

insert into public.vocabulary_reviews (user_id, item_id, reviewed_on, grade, box_before, box_after, due_on_after)
values ('b0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '2030-01-01', 'good', 0, 1, '2030-01-02');

-- Helper (rolled back with the rest): number of rows a DML statement affects, as the current role.
create function public.test_rows_affected(statement text) returns integer
language plpgsql as $fn$
declare
  n integer;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
end;
$fn$;

-- Schema-level guarantees ---------------------------------------------------------------------

select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'RLS is enabled on every table of the public schema'
);

select is(
  (select count(*)::int from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon'),
  0,
  'the anon role has no privilege on any public table'
);

select is(
  (select time_zone || '/' || daily_minutes from public.profiles where id = 'a0000000-0000-4000-8000-000000000001'),
  'Europe/Paris/30',
  'a profile is created automatically on signup, in Europe/Paris'
);

select is(
  (select count(*)::int from public.languages where code in ('ru', 'it', 'es', 'de', 'en', 'pt')),
  6,
  'every language of the app registry exists in the languages table'
);

-- One mission per user per day ----------------------------------------------------------------

select throws_ok(
  $$insert into public.missions (user_id, mission_date, budget_minutes)
    values ('a0000000-0000-4000-8000-000000000001', '2030-01-01', 30)$$,
  '23505',
  null,
  'two missions for the same user and the same day are rejected'
);

select lives_ok(
  $$insert into public.missions (user_id, mission_date, budget_minutes)
    values ('a0000000-0000-4000-8000-000000000001', '2030-01-02', 30)$$,
  'the same user can have a mission on another day'
);

select is(
  (select count(*)::int from public.missions where mission_date = '2030-01-01'),
  2,
  'two different users can have a mission on the same day'
);

-- Shared content: URL deduplication and copyright limits ---------------------------------------

select throws_ok(
  $$insert into public.contents (source_id, language, content_type, title, url, difficulty, duration_minutes, summary)
    values ('50000000-0000-4000-8000-000000000001', 'ru', 'article', 'Dup',
            'HTTPS://Example.com/ru/?utm_source=x#top', 'B2', 5, 's')$$,
  '23505',
  null,
  'the same URL with a different case, tracking parameter, slash or fragment is a duplicate'
);

select is(
  public.normalize_url('HTTPS://Example.com/a/b/?b=2&utm_medium=m&a=1#frag'),
  'https://example.com/a/b?a=1&b=2',
  'normalize_url lowercases the host, drops tracking parameters, fragment and trailing slash'
);

select throws_ok(
  $$insert into public.contents (source_id, language, content_type, title, url, difficulty, duration_minutes, summary, excerpt)
    values ('50000000-0000-4000-8000-000000000001', 'ru', 'article', 'Long', 'https://example.com/long', 'B2', 5, 's', repeat('x', 501))$$,
  '23514',
  null,
  'an excerpt longer than 500 characters is rejected (no full copyrighted text)'
);

select throws_ok(
  $$insert into public.mission_sessions (mission_id, user_id, position, language, content_id, production)
    values ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 1, 'it',
            'c0000000-0000-4000-8000-000000000001', '{"mode": "writing", "prompt": "p", "hints": []}')$$,
  '23503',
  null,
  'a session cannot use a content written in another language'
);

-- Language limits and time zone validation -----------------------------------------------------

select lives_ok(
  $$insert into public.user_languages (user_id, language, level, target_level, weight) values
      ('a0000000-0000-4000-8000-000000000001', 'ru', 'B2', 'C1', 1),
      ('a0000000-0000-4000-8000-000000000001', 'it', 'B1', 'B2', 1),
      ('a0000000-0000-4000-8000-000000000001', 'es', 'A2', 'B1', 1),
      ('a0000000-0000-4000-8000-000000000001', 'de', 'A1', 'A2', 1)$$,
  'a user can study 4 languages'
);

select throws_ok(
  $$insert into public.user_languages (user_id, language, level, target_level, weight)
    values ('a0000000-0000-4000-8000-000000000001', 'en', 'B1', 'B2', 1)$$,
  '23514',
  null,
  'a fifth language is rejected'
);

select throws_ok(
  $$insert into public.user_languages (user_id, language, level, target_level, weight)
    values ('b0000000-0000-4000-8000-000000000002', 'ru', 'B1', 'B2', 1)$$,
  '23505',
  null,
  'the same language twice for a user is rejected'
);

select throws_ok(
  $$insert into public.user_languages (user_id, language, level, target_level, weight)
    values ('b0000000-0000-4000-8000-000000000002', 'xx', 'B1', 'B2', 1)$$,
  '23503',
  null,
  'an unknown language code is rejected'
);

select throws_ok(
  $$update public.profiles set time_zone = 'Mars/Phobos' where id = 'a0000000-0000-4000-8000-000000000001'$$,
  '22023',
  null,
  'an unknown time zone is rejected'
);

-- Quiz grading is done by the database ----------------------------------------------------------

select is(
  (select is_correct from public.quiz_answers where session_id = 'e0000000-0000-4000-8000-000000000002'),
  true,
  'an answer matching answerIndex is graded correct by the trigger'
);

select throws_ok(
  $$insert into public.quiz_answers (session_id, user_id, question_id, selected_index)
    values ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'q1', 3)$$,
  '23514',
  null,
  'an answer outside the options range is rejected'
);

select throws_ok(
  $$insert into public.quiz_answers (session_id, user_id, question_id, selected_index)
    values ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'nope', 0)$$,
  '23503',
  null,
  'an answer to an unknown question is rejected'
);

-- User A, signed in ------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.profiles), 1, 'A sees only their own profile');
select is((select count(*)::int from public.missions), 2, 'A sees only their own missions (2030-01-01 and 2030-01-02)');
select is(
  (select count(*)::int from public.mission_sessions where user_id = 'b0000000-0000-4000-8000-000000000002'),
  0, 'A cannot read the sessions of B');
select is(
  (select count(*)::int from public.mission_activities where user_id = 'b0000000-0000-4000-8000-000000000002'),
  0, 'A cannot read the activities of B');
select is(
  (select count(*)::int from public.activity_progress where user_id = 'b0000000-0000-4000-8000-000000000002'),
  0, 'A cannot read the progress of B');
select is(
  (select count(*)::int from public.quiz_answers where user_id = 'b0000000-0000-4000-8000-000000000002'),
  0, 'A cannot read the quiz answers of B');
select is(
  (select count(*)::int from public.user_languages where user_id = 'b0000000-0000-4000-8000-000000000002'),
  0, 'A cannot read the languages of B');
select is(
  (select count(*)::int from public.vocabulary_items where user_id = 'b0000000-0000-4000-8000-000000000002'),
  0, 'A cannot read the vocabulary of B');
select is(
  (select count(*)::int from public.vocabulary_reviews where user_id = 'b0000000-0000-4000-8000-000000000002'),
  0, 'A cannot read the review journal of B');
select is(
  (select count(*)::int from public.mission_stats where user_id = 'b0000000-0000-4000-8000-000000000002'),
  0, 'A cannot read the mission stats of B (security_invoker view)');

select is(
  public.test_rows_affected($$update public.vocabulary_items set translation = 'hacked'
    where user_id = 'b0000000-0000-4000-8000-000000000002'$$),
  0, 'A cannot update the vocabulary of B');
select is(
  public.test_rows_affected($$update public.profiles set daily_minutes = 99
    where id = 'b0000000-0000-4000-8000-000000000002'$$),
  0, 'A cannot update the profile of B');
select is(
  public.test_rows_affected($$delete from public.vocabulary_items
    where user_id = 'b0000000-0000-4000-8000-000000000002'$$),
  0, 'A cannot delete the vocabulary of B');

select throws_ok(
  $$insert into public.vocabulary_items (user_id, language, term, translation, due_on, added_on)
    values ('b0000000-0000-4000-8000-000000000002', 'ru', 'новый', 'nouveau', '2030-01-01', '2030-01-01')$$,
  '42501', null, 'A cannot insert vocabulary on behalf of B');
select throws_ok(
  $$insert into public.activity_progress (activity_id, user_id)
    values ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001')$$,
  '23503', null, 'A cannot record progress on an activity of B');

select lives_ok(
  $$insert into public.activity_progress (activity_id, user_id, completed_at, spent_seconds)
    values ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', now(), 120)$$,
  'A can record progress on their own activity');

-- Shared content is read-only for users; generated missions are service-written ------------------

select is((select count(*)::int from public.contents where source_id = '50000000-0000-4000-8000-000000000001'), 2, 'A can read the shared contents');
select throws_ok(
  $$insert into public.contents (source_id, language, content_type, title, url, difficulty, duration_minutes, summary)
    values ('50000000-0000-4000-8000-000000000001', 'ru', 'article', 'Mine', 'https://example.com/mine', 'B2', 5, 's')$$,
  '42501', null, 'A cannot write into contents');
select throws_ok(
  $$update public.contents set title = 'hacked'$$,
  '42501', null, 'A cannot update contents');
select throws_ok(
  $$insert into public.sources (name, homepage_url) values ('Mine', 'https://mine.example')$$,
  '42501', null, 'A cannot write into sources');
select throws_ok(
  $$insert into public.missions (user_id, mission_date, budget_minutes)
    values ('a0000000-0000-4000-8000-000000000001', '2030-02-01', 30)$$,
  '42501', null, 'A cannot create a mission (generation is done by the service role)');
select throws_ok(
  $$update public.missions set status = 'failed'$$,
  '42501', null, 'A cannot change the generation status of a mission');
select lives_ok(
  $$update public.missions set started_at = now() where mission_date = '2030-01-01'$$,
  'A can mark their own mission as started');
select throws_ok(
  $$update public.vocabulary_reviews set grade = 'again'$$,
  '42501', null, 'the review journal is append-only for users');

-- Anonymous visitors -----------------------------------------------------------------------------

reset role;
set local role anon;
select throws_ok($$select * from public.contents$$, '42501', null, 'anon cannot read contents');
select throws_ok($$select * from public.vocabulary_items$$, '42501', null, 'anon cannot read vocabulary');

reset role;
select * from finish();
rollback;
