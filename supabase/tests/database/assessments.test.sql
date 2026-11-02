-- pgTAP tests for migration 20261102000100: skills assessments are read-only for their owner, started
-- and saved through functions (guests refused, language and dossier checked, listening plays never
-- go down), graded only by the service role (3 attempts per assessment, 5 per UTC day, a refused
-- attempt counts for neither), and production_level survives save_preferences. Migration
-- 20261102000200: completing a grading stores the answers that were graded.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(65);

insert into auth.users (instance_id, id, aud, role, email, is_anonymous) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000a3', 'authenticated', 'authenticated', 'as-a@test.invalid', false),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000a3', 'authenticated', 'authenticated', 'as-b@test.invalid', false),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a3', 'authenticated', 'authenticated', null, true);

insert into public.user_languages (user_id, language, level, target_level) values
  ('a0000000-0000-4000-8000-0000000000a3', 'ru', 'B2', 'C1'),
  ('a0000000-0000-4000-8000-0000000000a3', 'it', 'B1', 'B2'),
  ('a0000000-0000-4000-8000-0000000000a3', 'es', 'A2', 'B1'),
  ('b0000000-0000-4000-8000-0000000000a3', 'ru', 'B2', 'C1'),
  ('c0000000-0000-4000-8000-0000000000a3', 'ru', 'B2', 'C1');

-- A has an assessment in progress for it and a graded one for es; B has one in progress for ru.
insert into public.assessments (id, user_id, language, dossier_id, status, results, graded_at) values
  ('11000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000a3', 'it', 'it-b1-1', 'in_progress', null, null),
  ('12000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000a3', 'es', 'es-a2-1', 'graded',
   '{"reading": null, "listening": null, "writing": null, "speaking": null}', now()),
  ('21000000-0000-4000-8000-0000000000a3', 'b0000000-0000-4000-8000-0000000000a3', 'ru', 'ru-b2-1', 'in_progress', null, null);

-- Table constraints -------------------------------------------------------------------------------

select throws_ok(
  $$insert into public.assessments (user_id, language, dossier_id)
    values ('b0000000-0000-4000-8000-0000000000a3', 'it', 'it-d1-1')$$,
  '23514', null, 'a dossier id must have the expected shape');
select throws_ok(
  $$update public.assessments set status = 'graded' where id = '21000000-0000-4000-8000-0000000000a3'$$,
  '23514', null, 'graded goes with a result');
select throws_ok(
  $$update public.assessments set results = '{}', graded_at = now() where id = '21000000-0000-4000-8000-0000000000a3'$$,
  '23514', null, 'and a result goes with graded');
select throws_ok(
  $$insert into public.assessments (user_id, language, dossier_id)
    values ('b0000000-0000-4000-8000-0000000000a3', 'ru', 'ru-b2-2')$$,
  '23505', null, 'one assessment in progress per user and language');
select throws_ok(
  $$update public.user_languages set production_level = 'D1' where language = 'es'$$,
  '23514', null, 'production_level is a CEFR level');

-- A signed-in learner -----------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000a3", "role": "authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$select public.start_assessment('de', 'de-a1-1')$$,
  'P0002', null, 'a language the user does not study is refused');
select throws_ok(
  $$select public.start_assessment('ru', 'it-b1-1')$$,
  '22023', null, 'a dossier of another language is refused');
select throws_ok(
  $$select public.start_assessment('ru', null)$$,
  '22023', null, 'so is a missing dossier');
select throws_ok(
  $$select public.start_assessment('ru', 'ru-d1-1')$$,
  '23514', null, 'and a dossier id of the wrong shape');

select lives_ok(
  $$select public.start_assessment('ru', 'ru-b2-1')$$,
  'an assessment starts');
select is(
  (select count(*)::int from public.assessments where language = 'ru'),
  1, 'it is stored');
select is(
  public.start_assessment('ru', 'ru-b2-2'),
  (select id from public.assessments where language = 'ru'),
  'starting again resumes the one in progress, even with another dossier');
select is(
  (select array_agg(dossier_id) from public.assessments where language = 'ru'),
  array['ru-b2-1'], 'nothing was created or changed');
select is(
  public.start_assessment('it', 'it-b2-1'),
  '11000000-0000-4000-8000-0000000000a3'::uuid, 'resuming works for any dossier of the language');

select is((select count(*)::int from public.assessments), 3, 'the owner reads their own rows only');
select throws_ok(
  $$insert into public.assessments (user_id, language, dossier_id)
    values ('a0000000-0000-4000-8000-0000000000a3', 'es', 'es-a2-2')$$,
  '42501', null, 'the owner cannot insert directly');
select throws_ok(
  $$update public.assessments set listening_plays = 0$$,
  '42501', null, 'nor update directly');
select throws_ok(
  $$delete from public.assessments$$,
  '42501', null, 'nor delete directly');
select throws_ok(
  $$select count(*) from public.assessment_grading_quota$$,
  '42501', null, 'the quota is not readable');
select throws_ok(
  $$select public.claim_assessment_grading('11000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000a3')$$,
  '42501', null, 'the owner cannot claim a grading');
select throws_ok(
  $$select public.complete_assessment_grading('11000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000a3',
    '{"questions": {}, "writing": "", "speaking": {}}',
    '{"reading": null, "listening": null, "writing": null, "speaking": null}', 'C2', 'm', 'v', 1, 1)$$,
  '42501', null, 'nor complete one');

-- save_assessment_answers -------------------------------------------------------------------------

select lives_ok(
  $$select public.save_assessment_answers('11000000-0000-4000-8000-0000000000a3',
    '{"questions": {"q1": "reponse"}, "writing": "", "speaking": {}}', 2)$$,
  'answers are saved');
select is(
  (select answers->'questions'->>'q1' from public.assessments where id = '11000000-0000-4000-8000-0000000000a3'),
  'reponse', 'they are stored');
select is(
  (select listening_plays::int from public.assessments where id = '11000000-0000-4000-8000-0000000000a3'),
  2, 'with the plays');
select lives_ok(
  $$select public.save_assessment_answers('11000000-0000-4000-8000-0000000000a3', '{}', 1)$$,
  'a lower play count is accepted');
select is(
  (select listening_plays::int from public.assessments where id = '11000000-0000-4000-8000-0000000000a3'),
  2, 'but the plays never go down');
select lives_ok(
  $$select public.save_assessment_answers('11000000-0000-4000-8000-0000000000a3', '{}', 3)$$,
  'they go up');
select is(
  (select listening_plays::int from public.assessments where id = '11000000-0000-4000-8000-0000000000a3'),
  3, 'to 3 at most');
select throws_ok(
  $$select public.save_assessment_answers('11000000-0000-4000-8000-0000000000a3', '{}', 4)$$,
  '22023', null, 'a fourth play is refused');
select throws_ok(
  $$select public.save_assessment_answers('11000000-0000-4000-8000-0000000000a3', '{}', -1)$$,
  '22023', null, 'so is a negative count');
select throws_ok(
  $$select public.save_assessment_answers('11000000-0000-4000-8000-0000000000a3', '[]', 1)$$,
  '22023', null, 'answers must be an object');
select throws_ok(
  $$select public.save_assessment_answers('21000000-0000-4000-8000-0000000000a3', '{}', 1)$$,
  'P0002', null, 'the assessment of someone else is reported as missing');
select throws_ok(
  $$select public.save_assessment_answers('12000000-0000-4000-8000-0000000000a3', '{}', 1)$$,
  'P0002', null, 'a graded assessment is closed');
select throws_ok(
  $$select public.save_assessment_answers('11000000-0000-4000-8000-0000000000a3', jsonb_build_object('writing', repeat('x', 20000)), 1)$$,
  '23514', null, 'answers are limited in size');

-- Guests and anonymous callers --------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a3", "role": "authenticated"}', true);
select throws_ok(
  $$select public.start_assessment('ru', 'ru-b2-1')$$,
  'DL004', 'guest_not_allowed', 'a guest cannot take the assessment');

reset role;
set local role anon;
select throws_ok(
  $$select public.start_assessment('ru', 'ru-b2-1')$$,
  '42501', null, 'the anonymous role cannot call start_assessment');
select throws_ok(
  $$select count(*) from public.assessments$$,
  '42501', null, 'nor read the table');
reset role;

-- Grading (service role) --------------------------------------------------------------------------

set local role service_role;

select is(public.claim_assessment_grading('11000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000a3'),
  1::smallint, 'the first attempt is counted');
select is(public.claim_assessment_grading('11000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000a3'),
  2::smallint, 'then the second');
select is(public.claim_assessment_grading('11000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000a3'),
  3::smallint, 'then the third');
select is(public.claim_assessment_grading('11000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000a3'),
  null::smallint, 'a fourth attempt is refused');
select is(
  (select attempts::int from public.assessment_grading_quota where user_id = 'a0000000-0000-4000-8000-0000000000a3'),
  3, 'a refused attempt does not count for the day');
select is(
  (select day from public.assessment_grading_quota where user_id = 'a0000000-0000-4000-8000-0000000000a3'),
  (now() at time zone 'utc')::date, 'the day is the UTC one');
select throws_ok(
  $$select public.claim_assessment_grading('11000000-0000-4000-8000-0000000000a3', 'b0000000-0000-4000-8000-0000000000a3')$$,
  'P0002', null, 'another user cannot claim on that assessment');
select throws_ok(
  $$select public.claim_assessment_grading('12000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000a3')$$,
  'P0002', null, 'a graded assessment cannot be claimed');

-- The day limit: 3 used on it, 2 more on ru, then refused without counting on the assessment.
select is(public.claim_assessment_grading((select id from public.assessments where language = 'ru' and user_id = 'a0000000-0000-4000-8000-0000000000a3'),
  'a0000000-0000-4000-8000-0000000000a3'), 1::smallint, 'a second assessment starts counting');
select is(public.claim_assessment_grading((select id from public.assessments where language = 'ru' and user_id = 'a0000000-0000-4000-8000-0000000000a3'),
  'a0000000-0000-4000-8000-0000000000a3'), 2::smallint, 'up to the fifth attempt of the day');
select is(public.claim_assessment_grading((select id from public.assessments where language = 'ru' and user_id = 'a0000000-0000-4000-8000-0000000000a3'),
  'a0000000-0000-4000-8000-0000000000a3'), null::smallint, 'a sixth attempt of the day is refused');
select is(
  (select grading_attempts::int from public.assessments where language = 'ru' and user_id = 'a0000000-0000-4000-8000-0000000000a3'),
  2, 'and does not count for the assessment');
select is(
  (select attempts::int from public.assessment_grading_quota where user_id = 'a0000000-0000-4000-8000-0000000000a3'),
  5, 'nor for the day');

-- complete_assessment_grading ---------------------------------------------------------------------

select throws_ok(
  $$select public.complete_assessment_grading('11000000-0000-4000-8000-0000000000a3', 'b0000000-0000-4000-8000-0000000000a3',
    '{"questions": {}, "writing": "", "speaking": {}}',
    '{"reading": null, "listening": null, "writing": null, "speaking": null}', null, 'm', 'v', 1, 1)$$,
  'P0002', null, 'another user cannot complete it');
select throws_ok(
  $$select public.complete_assessment_grading('11000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000a3',
    '{"questions": {}, "writing": "", "speaking": {}}',
    null, null, 'm', 'v', 1, 1)$$,
  '23514', null, 'a graded assessment needs its results');
select is(
  (select status from public.assessments where id = '11000000-0000-4000-8000-0000000000a3'),
  'in_progress', 'the failed completion left it in progress');

select lives_ok(
  $$select public.complete_assessment_grading('11000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000a3',
    '{"questions": {"q1": "graded answer"}, "writing": "graded text", "speaking": {}}',
    '{"reading": {"level": "B1", "confidence": "high"}, "listening": null, "writing": {"level": "B2", "confidence": "medium"},
      "speaking": {"level": "B1", "confidence": "low", "declared": true}}', 'B2', 'claude-test', '2026-11-02.1', 1200, 300)$$,
  'a grading is completed');
select is(
  (select status || ':' || (results->'writing'->>'level') || ':' || (graded_at is not null)::text
   from public.assessments where id = '11000000-0000-4000-8000-0000000000a3'),
  'graded:B2:true', 'the assessment is graded with its results');
select is(
  (select answers->'questions'->>'q1' || ':' || (answers->>'writing') from public.assessments
   where id = '11000000-0000-4000-8000-0000000000a3'),
  'graded answer:graded text', 'the answers graded replace the ones saved meanwhile');
select is(
  (select production_level from public.user_languages
   where user_id = 'a0000000-0000-4000-8000-0000000000a3' and language = 'it'),
  'B2', 'the production level is applied to the language');
select is(
  (select production_level from public.user_languages
   where user_id = 'a0000000-0000-4000-8000-0000000000a3' and language = 'ru'),
  null, 'other languages are untouched');
select throws_ok(
  $$select public.complete_assessment_grading('11000000-0000-4000-8000-0000000000a3', 'a0000000-0000-4000-8000-0000000000a3',
    '{"questions": {}, "writing": "", "speaking": {}}',
    '{"reading": null, "listening": null, "writing": null, "speaking": null}', null, 'm', 'v', 1, 1)$$,
  'P0002', null, 'an assessment is graded once');

select throws_ok(
  $$select public.complete_assessment_grading('21000000-0000-4000-8000-0000000000a3', 'b0000000-0000-4000-8000-0000000000a3',
    '[]',
    '{"reading": null, "listening": null, "writing": null, "speaking": null}', null, 'm', 'v', 1, 1)$$,
  '22023', null, 'the answers graded must be an object');

-- A language removed during the test: the grading still completes and the history stays.
delete from public.user_languages
where user_id = 'b0000000-0000-4000-8000-0000000000a3' and language = 'ru';
select lives_ok(
  $$select public.complete_assessment_grading('21000000-0000-4000-8000-0000000000a3', 'b0000000-0000-4000-8000-0000000000a3',
    '{"questions": {}, "writing": "", "speaking": {}}',
    '{"reading": null, "listening": null, "writing": null, "speaking": null}', 'C1', 'm', 'v', 1, 1)$$,
  'completing for a removed language does not fail');
select is(
  (select status from public.assessments where id = '21000000-0000-4000-8000-0000000000a3'),
  'graded', 'and the assessment is kept after the language is removed');
reset role;

-- save_preferences keeps production_level --------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000a3", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.save_preferences(30, null, null, 'matched', '07:00', 'Europe/Paris',
    '[{"language": "it", "level": "B1", "target_level": "C1", "focus": "", "weight": 20},
      {"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 20}]')$$,
  'preferences are saved');
select is(
  (select production_level from public.user_languages where language = 'it'),
  'B2', 'save_preferences keeps production_level');
reset role;

-- Account deletion ---------------------------------------------------------------------------------

delete from auth.users where id = 'a0000000-0000-4000-8000-0000000000a3';
select is(
  (select count(*)::int from public.assessments where user_id = 'a0000000-0000-4000-8000-0000000000a3')
  + (select count(*)::int from public.assessment_grading_quota where user_id = 'a0000000-0000-4000-8000-0000000000a3'),
  0, 'deleting the account deletes its assessments and quota');

select * from finish();
rollback;
