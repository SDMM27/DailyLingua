-- pgTAP tests for migration 20261102000300: a learner applies the reception level of a graded
-- assessment to their language. The level must be the lowest of reading and listening of the stored
-- results, the assessment must be the caller's and graded, and the target level follows the level up.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (instance_id, id, aud, role, email, is_anonymous) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000a4', 'authenticated', 'authenticated', 'ap-a@test.invalid', false),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000a4', 'authenticated', 'authenticated', 'ap-b@test.invalid', false);

insert into public.user_languages (user_id, language, level, target_level) values
  ('a0000000-0000-4000-8000-0000000000a4', 'ru', 'A2', 'B1'),
  ('a0000000-0000-4000-8000-0000000000a4', 'it', 'B1', 'C1'),
  ('a0000000-0000-4000-8000-0000000000a4', 'es', 'A2', 'B2'),
  ('a0000000-0000-4000-8000-0000000000a4', 'pt', 'A1', 'A2'),
  ('b0000000-0000-4000-8000-0000000000a4', 'ru', 'A2', 'B1');

-- ru: reading B2, listening B1, writing C1 (reception B1). it: reading only, A2 (reception A2).
-- es: nothing but the writing (no reception level). de: graded, but the language is not studied.
insert into public.assessments (id, user_id, language, dossier_id, status, results, graded_at) values
  ('11000000-0000-4000-8000-0000000000a4', 'a0000000-0000-4000-8000-0000000000a4', 'ru', 'ru-b2-1', 'graded',
   '{"reading": {"level": "B2", "confidence": "high", "offerHigher": true},
     "listening": {"level": "B1", "confidence": "low", "offerHigher": false},
     "writing": {"level": "C1", "confidence": "high", "offerHigher": true}, "speaking": null}', now()),
  ('12000000-0000-4000-8000-0000000000a4', 'a0000000-0000-4000-8000-0000000000a4', 'it', 'it-a2-1', 'graded',
   '{"reading": {"level": "A2", "confidence": "medium", "offerHigher": false}, "listening": null, "writing": null, "speaking": null}', now()),
  ('13000000-0000-4000-8000-0000000000a4', 'a0000000-0000-4000-8000-0000000000a4', 'es', 'es-a2-1', 'graded',
   '{"reading": null, "listening": null, "writing": {"level": "B2", "confidence": "high", "offerHigher": true}, "speaking": null}', now()),
  ('14000000-0000-4000-8000-0000000000a4', 'a0000000-0000-4000-8000-0000000000a4', 'de', 'de-a1-1', 'graded',
   '{"reading": {"level": "A1", "confidence": "low", "offerHigher": false}, "listening": null, "writing": null, "speaking": null}', now()),
  ('17000000-0000-4000-8000-0000000000a4', 'a0000000-0000-4000-8000-0000000000a4', 'pt', 'pt-c1-1', 'graded',
   '{"reading": {"level": "C1", "confidence": "high", "offerHigher": true}, "listening": {"level": "C1", "confidence": "high", "offerHigher": true}, "writing": null, "speaking": null}', now()),
  ('15000000-0000-4000-8000-0000000000a4', 'b0000000-0000-4000-8000-0000000000a4', 'ru', 'ru-b2-1', 'graded',
   '{"reading": {"level": "B2", "confidence": "high", "offerHigher": true}, "listening": {"level": "B2", "confidence": "high", "offerHigher": true}, "writing": null, "speaking": null}', now());

-- Not signed in -----------------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"role": "authenticated"}', true);
select throws_ok(
  $$select public.apply_assessment_reception_level('11000000-0000-4000-8000-0000000000a4', 'B1')$$,
  '28000', null, 'a caller without a session is refused');

-- A signed-in learner -----------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000a4", "role": "authenticated"}', true);

select throws_ok(
  $$select public.apply_assessment_reception_level('15000000-0000-4000-8000-0000000000a4', 'B2')$$,
  'P0002', null, 'the assessment of another user is refused');
select throws_ok(
  $$select public.apply_assessment_reception_level('99000000-0000-4000-8000-0000000000a4', 'B1')$$,
  'P0002', null, 'so is a missing one');
select throws_ok(
  $$select public.apply_assessment_reception_level('11000000-0000-4000-8000-0000000000a4', 'D1')$$,
  '22023', null, 'a value that is not a CEFR level is refused');
select throws_ok(
  $$select public.apply_assessment_reception_level('11000000-0000-4000-8000-0000000000a4', null)$$,
  '22023', null, 'so is a missing level');
select throws_ok(
  $$select public.apply_assessment_reception_level('11000000-0000-4000-8000-0000000000a4', 'B2')$$,
  '22023', null, 'a level that is not the lowest of reading and listening is refused (a higher one)');
select throws_ok(
  $$select public.apply_assessment_reception_level('11000000-0000-4000-8000-0000000000a4', 'A2')$$,
  '22023', null, 'nor a lower one');
select throws_ok(
  $$select public.apply_assessment_reception_level('13000000-0000-4000-8000-0000000000a4', 'B2')$$,
  '22023', null, 'an assessment with no reception level cannot be applied (writing does not count)');
select throws_ok(
  $$select public.apply_assessment_reception_level('14000000-0000-4000-8000-0000000000a4', 'A1')$$,
  'P0002', null, 'a language the learner no longer studies is refused');
select is(
  (select level || '/' || target_level from public.user_languages where language = 'ru' and user_id = 'a0000000-0000-4000-8000-0000000000a4'),
  'A2/B1', 'nothing changed after the refusals');

select lives_ok(
  $$select public.apply_assessment_reception_level('11000000-0000-4000-8000-0000000000a4', 'B1')$$,
  'the reception level (lowest of reading and listening) is applied');
select is(
  (select level || '/' || target_level from public.user_languages where language = 'ru' and user_id = 'a0000000-0000-4000-8000-0000000000a4'),
  'B1/B1', 'the level is set and the target, now below or equal, is raised to it');

select lives_ok(
  $$select public.apply_assessment_reception_level('12000000-0000-4000-8000-0000000000a4', 'A2')$$,
  'a level below the current one is applied too');
select is(
  (select level || '/' || target_level from public.user_languages where language = 'it' and user_id = 'a0000000-0000-4000-8000-0000000000a4'),
  'A2/C1', 'and a target above the level is left alone');

-- A target below the new level goes up with it.
select lives_ok(
  $$select public.apply_assessment_reception_level('17000000-0000-4000-8000-0000000000a4', 'C1')$$,
  'a level above the target is applied');
select is(
  (select level || '/' || target_level from public.user_languages where language = 'pt' and user_id = 'a0000000-0000-4000-8000-0000000000a4'),
  'C1/C1', 'and the target is raised to the level');

-- An assessment still in progress is not applicable.
reset role;
select is(
  (select level || '/' || target_level from public.user_languages where language = 'ru' and user_id = 'b0000000-0000-4000-8000-0000000000a4'),
  'A2/B1', 'the other user''s language is untouched');

insert into public.assessments (id, user_id, language, dossier_id) values
  ('16000000-0000-4000-8000-0000000000a4', 'a0000000-0000-4000-8000-0000000000a4', 'it', 'it-b1-1');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000a4", "role": "authenticated"}', true);
select throws_ok(
  $$select public.apply_assessment_reception_level('16000000-0000-4000-8000-0000000000a4', 'B1')$$,
  'P0002', null, 'an assessment in progress is refused');

select * from finish();
rollback;
