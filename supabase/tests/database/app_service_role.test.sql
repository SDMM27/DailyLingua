-- pgTAP tests: service_role, the write path of the server, can insert and update a row in EVERY table
-- of `app` (the CHECK constraints and triggers must not need a privilege it lacks). The append-only
-- journals accept the insert and refuse the update with their own error, not a permission error.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid');

set local role service_role;

select lives_ok($$insert into app.language (code) values ('xx')$$, 'language: insert');
select lives_ok($$update app.language set created_at = now() where code = 'xx'$$, 'language: update');
select lives_ok($$update app.profile set ui_language = 'en' where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$,
  'profile: update (the row is created by the signup trigger)');

select lives_ok($$insert into app.enrollment (user_id, language, daily_minutes, days)
  values ('c0000000-0000-4000-8000-0000000000a1', 'es', 20, '{1,3,5}')$$, 'enrollment: insert');
select lives_ok($$update app.enrollment set active = false where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$,
  'enrollment: update');
select lives_ok($$insert into app.skill_estimate (user_id, language, skill, level_value, uncertainty, source)
  values ('c0000000-0000-4000-8000-0000000000a1', 'es', 'reading', 2.5, 0.5, 'legacy')$$, 'skill_estimate: insert');
select lives_ok($$update app.skill_estimate set level_value = 3 where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$,
  'skill_estimate: update');
select lives_ok($$insert into app.card_list (id, user_id, language, name)
  values ('c0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-0000000000a1', 'es', 'liste')$$, 'card_list: insert');
select lives_ok($$update app.card_list set active = false where id = 'c0000000-0000-4000-8000-000000000011'$$,
  'card_list: update');
select lives_ok($$insert into app.card (id, user_id, language, kind, front, state, due_at, list_id)
  values ('c0000000-0000-4000-8000-000000000021', 'c0000000-0000-4000-8000-0000000000a1', 'es', 'word', 'hola', 'new', now(),
          'c0000000-0000-4000-8000-000000000011')$$, 'card: insert');
select lives_ok($$update app.card set state = 'review', deleted_at = now() where id = 'c0000000-0000-4000-8000-000000000021'$$,
  'card: update');

select lives_ok($$insert into app.review_log (user_id, card_id, rating, reviewed_at, origin)
  values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000021', 3, now(), 'fsrs')$$,
  'review_log: insert');
select throws_ok($$update app.review_log set rating = 1$$, '42501', 'review_log is append-only', 'review_log: update refused by the guard');
select lives_ok($$insert into app.session (id, user_id, language, day)
  values ('c0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-0000000000a1', 'es', '2030-01-01')$$,
  'session: insert');
select lives_ok($$update app.session set status = 'started', started_at = now() where id = 'c0000000-0000-4000-8000-000000000031'$$,
  'session: update');
select lives_ok($$insert into app.attempt (user_id, session_id, language, step, exercise_kind, answer, client_event_id, occurred_at)
  values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000031', 'es', 'q', 'mcq', '{}', gen_random_uuid(), now())$$,
  'attempt: insert');
select throws_ok($$update app.attempt set correct = true$$, '42501', 'attempt is append-only', 'attempt: update refused by the guard');
select lives_ok($$insert into app.study_day (user_id, day, origin) values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01', 'session')$$,
  'study_day: insert');
select lives_ok($$update app.study_day set origin = 'review' where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$,
  'study_day: update');

select lives_ok($$insert into app.production (id, user_id, language, session_id, mode, text)
  values ('c0000000-0000-4000-8000-000000000041', 'c0000000-0000-4000-8000-0000000000a1', 'es', 'c0000000-0000-4000-8000-000000000031', 'writing', 'Hola')$$,
  'production: insert');
select lives_ok($$update app.production set text = 'Hola!' where id = 'c0000000-0000-4000-8000-000000000041'$$, 'production: update');
select lives_ok($$insert into app.correction (id, production_id, user_id, feedback, explanation_language)
  values ('c0000000-0000-4000-8000-000000000051', 'c0000000-0000-4000-8000-000000000041', 'c0000000-0000-4000-8000-0000000000a1', '{}', 'fr')$$,
  'correction: insert');
select lives_ok($$update app.correction set model = 'm' where id = 'c0000000-0000-4000-8000-000000000051'$$, 'correction: update');
select lives_ok($$insert into app.rewrite (correction_id, user_id, sentence_index, text)
  values ('c0000000-0000-4000-8000-000000000051', 'c0000000-0000-4000-8000-0000000000a1', 0, 'Hola!')$$, 'rewrite: insert');
select lives_ok($$update app.rewrite set accepted = true where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$, 'rewrite: update');
select lives_ok($$insert into app.assessment_result (user_id, language, kind, taken_at, payload)
  values ('c0000000-0000-4000-8000-0000000000a1', 'es', 'placement', now(), '{}')$$, 'assessment_result: insert');
select lives_ok($$update app.assessment_result set levels = '{"reading": "B1"}' where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$,
  'assessment_result: update');

select lives_ok($$insert into app.xp_ledger (user_id, day, amount, reason)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01', 10, 'quiz')$$, 'xp_ledger: insert');
select throws_ok($$update app.xp_ledger set amount = 5$$, '42501', 'xp_ledger is append-only', 'xp_ledger: update refused by the guard');
select lives_ok($$update app.streak_state set "current" = 1, best = 1, last_day = '2030-01-01'
  where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$, 'streak_state: update (the row is created by the signup trigger)');

select lives_ok($$insert into app.ai_call (purpose, model, user_id) values ('test', 'm', 'c0000000-0000-4000-8000-0000000000a1')$$,
  'ai_call: insert');
select lives_ok($$update app.ai_call set status = 'error'$$, 'ai_call: update');
select lives_ok($$insert into app.quota_usage (user_id, day, kind, used) values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01', 'ai', 1)$$,
  'quota_usage: insert');
select lives_ok($$update app.quota_usage set used = 2$$, 'quota_usage: update');
select lives_ok($$insert into app.legacy_record (user_id, legacy_table, legacy_id, payload)
  values ('c0000000-0000-4000-8000-0000000000a1', 'feedback', 'x', '{}')$$, 'legacy_record: insert');
select lives_ok($$update app.legacy_record set payload = '{"a": 1}'$$, 'legacy_record: update');
select lives_ok($$insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id) values ('t', 'i', 'a', 'x')$$,
  'legacy_map: insert');
select lives_ok($$update app.legacy_map set app_id = 'y'$$, 'legacy_map: update');

reset role;
select * from finish();
rollback;
