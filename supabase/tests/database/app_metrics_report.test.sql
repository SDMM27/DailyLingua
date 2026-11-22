begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select ok(not has_function_privilege('authenticated', 'app.metrics_report(date,timestamptz)', 'execute'), 'learner role cannot read the aggregate');

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', '20420000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'metrics-j1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', '20420000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'metrics-did-not-return@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', '20420000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'metrics-j7-not-due@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', '20420000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'metrics-guest@test.invalid');

update app.profile as p set created_at = sample.created_at::timestamptz, is_guest = sample.is_guest, time_zone = 'Europe/Paris'
from (values
  ('20420000-0000-4000-8000-000000000001', '2042-11-01 02:00+00', false),
  ('20420000-0000-4000-8000-000000000002', '2042-11-02 10:00+00', false),
  ('20420000-0000-4000-8000-000000000003', '2042-11-27 10:00+00', false),
  ('20420000-0000-4000-8000-000000000004', '2042-11-02 10:00+00', true)
) as sample(id, created_at, is_guest) where p.user_id = sample.id::uuid;

insert into app.session (user_id, language, day, kind, status, started_at, completed_at) values
  ('20420000-0000-4000-8000-000000000001', 'it', '2042-11-01', 'daily', 'completed', '2042-11-01 11:00+00', '2042-11-01 11:15+00'),
  ('20420000-0000-4000-8000-000000000001', 'ru', '2042-11-01', 'daily', 'completed', '2042-11-01 11:20+00', '2042-11-01 11:35+00'),
  ('20420000-0000-4000-8000-000000000001', 'it', '2042-11-08', 'daily', 'completed', '2042-11-08 11:00+00', '2042-11-08 11:20+00'),
  ('20420000-0000-4000-8000-000000000002', 'it', '2042-11-03', 'daily', 'started', '2042-11-03 11:00+00', null),
  ('20420000-0000-4000-8000-000000000002', 'it', '2042-11-10', 'review_only', 'completed', '2042-11-10 12:00+00', '2042-11-10 12:10+00');
insert into app.learning_day (user_id, day, time_zone, xp_verified, validated, first_activity_at) values
  ('20420000-0000-4000-8000-000000000001', '2042-11-01', 'Europe/Paris', 20, true, '2042-11-01 11:00+00'),
  ('20420000-0000-4000-8000-000000000001', '2042-11-08', 'Europe/Paris', 10, false, '2042-11-08 11:00+00'),
  ('20420000-0000-4000-8000-000000000002', '2042-11-03', 'Europe/Paris', 0, false, '2042-11-03 11:00+00');
insert into app.card (id, user_id, language, kind, front, state, due_at) values
  ('20420000-0000-4000-8000-0000000000a1', '20420000-0000-4000-8000-000000000001', 'it', 'word', 'ciao', 'new', '2042-11-01');
insert into app.review_log (user_id, card_id, rating, reviewed_at, elapsed_days, origin) values
  ('20420000-0000-4000-8000-000000000001', '20420000-0000-4000-8000-0000000000a1', 3, '2042-11-10', 2, 'fsrs'),
  ('20420000-0000-4000-8000-000000000001', '20420000-0000-4000-8000-0000000000a1', 1, '2042-11-17', 7, 'fsrs'),
  ('20420000-0000-4000-8000-000000000001', '20420000-0000-4000-8000-0000000000a1', 4, '2042-11-17', 0, 'fsrs');
insert into app.production (id, user_id, language, mode, text) values
  ('20420000-0000-4000-8000-0000000000b1', '20420000-0000-4000-8000-000000000001', 'it', 'writing', 'Ciao'),
  ('20420000-0000-4000-8000-0000000000b2', '20420000-0000-4000-8000-000000000001', 'it', 'writing', 'Buongiorno');
insert into app.correction (id, production_id, user_id, feedback, explanation_language, created_at) values
  ('20420000-0000-4000-8000-0000000000c1', '20420000-0000-4000-8000-0000000000b1', '20420000-0000-4000-8000-000000000001', '{}', 'fr', '2042-11-12'),
  ('20420000-0000-4000-8000-0000000000c2', '20420000-0000-4000-8000-0000000000b2', '20420000-0000-4000-8000-000000000001', '{}', 'fr', '2042-11-13');
insert into app.rewrite (correction_id, user_id, sentence_index, text, accepted, created_at) values
  ('20420000-0000-4000-8000-0000000000c1', '20420000-0000-4000-8000-000000000001', 0, 'Ciao!', true, '2042-11-13'),
  ('20420000-0000-4000-8000-0000000000c1', '20420000-0000-4000-8000-000000000001', 1, 'Tutto bene.', true, '2042-11-13'),
  ('20420000-0000-4000-8000-0000000000c2', '20420000-0000-4000-8000-000000000001', 0, 'Buongiorno!', false, '2042-11-14');
insert into app.ai_call (purpose, model, cost_usd, created_at) values
  ('writing_feedback', 'test-model', 0.005, '2042-11-05'),
  ('graded_text', 'test-model', 0.007, '2042-11-09'),
  ('graded_text', 'test-model', 0.900, '2042-12-01');

set local role service_role;
select is(app.metrics_report('2042-11-01', '2042-11-30 18:00+00'),
  '{"j1":{"count":1,"total":3},"j7":{"count":1,"total":2},"sessions":{"count":3,"total":4},"recall":{"count":1,"total":2},"rewrites":{"count":1,"total":2},"activeLearners":1,"costUsd":0.012}'::jsonb,
  'monthly report counts mature cohorts, distinct learners and distinct corrections');
select is(app.metrics_report('2042-01-01', '2042-11-30 18:00+00')->'sessions', '{"count":0,"total":0}'::jsonb, 'an empty month has zero counts');

reset role;
select * from finish();
rollback;
