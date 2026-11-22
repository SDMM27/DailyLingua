begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, aud, role, email) values
  ('edf00000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'error-of-day@test.invalid');

insert into app.production (id, user_id, language, mode, text) values
  ('edf00000-0000-4000-8000-000000000011', 'edf00000-0000-4000-8000-000000000001', 'it', 'writing', 'Testo.'),
  ('edf00000-0000-4000-8000-000000000012', 'edf00000-0000-4000-8000-000000000001', 'it', 'writing', 'Altro testo.'),
  ('edf00000-0000-4000-8000-000000000013', 'edf00000-0000-4000-8000-000000000001', 'es', 'writing', 'Texto.');

insert into app.correction (id, user_id, production_id, explanation_language, feedback) values
  ('edf00000-0000-4000-8000-000000000021', 'edf00000-0000-4000-8000-000000000001', 'edf00000-0000-4000-8000-000000000011', 'fr', '{}'),
  ('edf00000-0000-4000-8000-000000000022', 'edf00000-0000-4000-8000-000000000001', 'edf00000-0000-4000-8000-000000000012', 'fr', '{}'),
  ('edf00000-0000-4000-8000-000000000023', 'edf00000-0000-4000-8000-000000000001', 'edf00000-0000-4000-8000-000000000013', 'fr', '{}');

set local role service_role;
select lives_ok($$
  insert into app.error_item (user_id, correction_id, language, error_ref, prompt, answer, created_day)
  values ('edf00000-0000-4000-8000-000000000001', 'edf00000-0000-4000-8000-000000000021', 'it', 'first', '{}', '{}', '2026-11-19')
$$, 'a correction can supply the daily error');
select throws_ok($$
  insert into app.error_item (user_id, correction_id, language, error_ref, prompt, answer, created_day)
  values ('edf00000-0000-4000-8000-000000000001', 'edf00000-0000-4000-8000-000000000022', 'it', 'second', '{}', '{}', '2026-11-19')
$$, '23505', null, 'a second correction cannot supply another error for the same day and language');
select throws_ok($$
  insert into app.error_item (user_id, correction_id, language, error_ref, prompt, answer, created_day)
  values ('edf00000-0000-4000-8000-000000000001', 'edf00000-0000-4000-8000-000000000021', 'it', 'retry', '{}', '{}', '2026-11-20')
$$, '23505', null, 'replaying a correction on another day cannot create another error');
select lives_ok($$
  insert into app.error_item (user_id, correction_id, language, error_ref, prompt, answer, created_day)
  values ('edf00000-0000-4000-8000-000000000001', 'edf00000-0000-4000-8000-000000000023', 'es', 'third', '{}', '{}', '2026-11-19')
$$, 'another language can receive its own daily error');
reset role;

set local role authenticated;
select throws_ok($$select answer from app.error_item$$, '42501', null, 'learners cannot query answer keys directly');
reset role;

select * from finish();
rollback;
