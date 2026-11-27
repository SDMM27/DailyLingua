begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-000000001001', 'authenticated', 'authenticated', 'writing-claim-1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-000000001002', 'authenticated', 'authenticated', 'writing-claim-2@test.invalid');

insert into app.session (id, user_id, language, day, kind, format) values
  ('c0000000-0000-4000-8000-000000001003', 'c0000000-0000-4000-8000-000000001001', 'it', current_date, 'daily', 10);
insert into app.production (id, user_id, language, session_id, mode, text, client_event_id)
select ('c0000000-0000-4000-8000-00000000100' || i)::uuid, 'c0000000-0000-4000-8000-000000001001',
  'it', 'c0000000-0000-4000-8000-000000001003', 'writing',
  case i when 4 then 'Oggi sono andato al mercato.' when 5 then '  Oggi  sono andato al mercato.  ' else 'Un altro testo.' end,
  gen_random_uuid()
from generate_series(4, 6) as i;

insert into app.production (id, user_id, language, session_id, mode, text, client_event_id)
values ('c0000000-0000-4000-8000-000000001007', 'c0000000-0000-4000-8000-000000001001', 'it',
  'c0000000-0000-4000-8000-000000001003', 'spoken', 'oggi sono andato al mercato con mia sorella', gen_random_uuid());

select ok(not has_table_privilege('authenticated', 'app.writing_feedback_job', 'select'), 'jobs are private');
select ok(not has_function_privilege('authenticated', 'app.claim_writing_feedback_job(uuid,uuid)', 'execute')
  and not has_function_privilege('anon', 'app.claim_writing_feedback_job(uuid,uuid)', 'execute'), 'the RPC is service-only');

set local role service_role;
select is(app.claim_writing_feedback_job('c0000000-0000-4000-8000-000000001002','c0000000-0000-4000-8000-000000001004'),
  'not_found', 'refuses another owner');
select is(app.claim_writing_feedback_job('c0000000-0000-4000-8000-000000001001','c0000000-0000-4000-8000-000000001004'),
  'claimed', 'claims a stored production');
select is(app.claim_writing_feedback_job('c0000000-0000-4000-8000-000000001001','c0000000-0000-4000-8000-000000001004'),
  'pending', 'replayed requests cannot claim again');
select is(app.claim_writing_feedback_job('c0000000-0000-4000-8000-000000001001','c0000000-0000-4000-8000-000000001005'),
  'failed', 'the same production text in the session cannot buy a second correction under another id');

update app.writing_feedback_job set started_at = now() - interval '3 minutes' where production_id = 'c0000000-0000-4000-8000-000000001004';
select is(app.claim_writing_feedback_job('c0000000-0000-4000-8000-000000001001','c0000000-0000-4000-8000-000000001004'),
  'failed', 'an ambiguous outcome is terminal even when the caller disappeared');
insert into app.correction (production_id, user_id, explanation_language, feedback)
values ('c0000000-0000-4000-8000-000000001004', 'c0000000-0000-4000-8000-000000001001', 'en', '{}');
select is(app.claim_writing_feedback_job('c0000000-0000-4000-8000-000000001001','c0000000-0000-4000-8000-000000001004'),
  'ready', 'saved feedback can be reused');

select is(app.claim_writing_feedback_job('c0000000-0000-4000-8000-000000001001','c0000000-0000-4000-8000-000000001006'),
  'claimed', 'a different text can be corrected');
delete from app.writing_feedback_job where production_id = 'c0000000-0000-4000-8000-000000001006';
select is(app.claim_writing_feedback_job('c0000000-0000-4000-8000-000000001001','c0000000-0000-4000-8000-000000001006'),
  'claimed', 'a claim released after a quota refusal can be reclaimed');

select is(app.claim_writing_feedback_job('c0000000-0000-4000-8000-000000001002','c0000000-0000-4000-8000-000000001007'),
  'not_found', 'refuses another owner for a spoken production');
select is(app.claim_writing_feedback_job('c0000000-0000-4000-8000-000000001001','c0000000-0000-4000-8000-000000001007'),
  'claimed', 'claims a stored spoken production (the transcript of the speech)');

insert into app.xp_ledger (user_id, language, day, amount, reason, meta)
values ('c0000000-0000-4000-8000-000000001001', 'it', current_date, 15, 'production.corrected', '{"ref":"c0000000-0000-4000-8000-000000001004"}');
insert into app.xp_ledger (user_id, language, day, amount, reason, meta)
values ('c0000000-0000-4000-8000-000000001001', 'it', current_date + 1, 15, 'production.corrected', '{"ref":"c0000000-0000-4000-8000-000000001004","late":true}')
on conflict do nothing;
select is((select count(*)::integer from app.xp_ledger where user_id = 'c0000000-0000-4000-8000-000000001001' and reason = 'production.corrected'),
  1, 'the same feedback cannot award XP again after a day change');

reset role;
select * from finish();
rollback;
