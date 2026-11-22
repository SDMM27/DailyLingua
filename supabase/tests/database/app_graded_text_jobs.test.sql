-- Budget, lease, idempotency and all-or-nothing publication for shared graded texts.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select ok(not has_function_privilege('authenticated', 'app.claim_graded_text_job(text,text,smallint,text,text)', 'execute'), 'learners cannot claim jobs');
select ok(not has_function_privilege('authenticated', 'app.publish_graded_text(uuid,jsonb,jsonb)', 'execute'), 'learners cannot publish');
select ok(not has_table_privilege('authenticated', 'app.graded_text_job', 'select'), 'learners cannot read the reservations');

set local role service_role;
create temp table claimed as
  select (app.claim_graded_text_job('it', 'A2', 2::smallint, 'qa_theme', 'qa_version')->>'id')::uuid as id;
select ok((select id is not null from claimed), 'service role claims a lease');
select is(app.claim_graded_text_job('it', 'A2', 2::smallint, 'qa_theme', 'qa_version')->>'status', 'busy', 'parallel claim for this cell is blocked');
select throws_ok(
  $$select app.publish_graded_text((select id from claimed), '{"checks":{"review":"approved"}}', '[]')$$,
  '22023', 'Incomplete graded text', 'an incomplete text cannot be published');
select is((select count(*)::int from app.text where prompt_version = 'qa_version'), 0, 'no part of the incomplete text is visible');

create temp table content as
select '{"title":"Prova","body":"Il testo.","word_count":2,"new_words":[],"grammar_point":"it-a1-articles","writing_task":"Scrivi.","listening_segment":{"from":0,"to":0},"checks":{"review":"approved"},"model":"test-model"}'::jsonb as body,
  (select jsonb_agg(jsonb_build_object('step', case when i < 5 then 'reading' else 'workshop' end,
    'kind', 'mcq', 'position', i, 'prompt', jsonb_build_object('question', 'Una domanda?'),
    'listening_only', i = 4, 'answer', '2', 'accept', '[]'::jsonb))
   from generate_series(0, 18) as i) as items;
create temp table published as
  select app.publish_graded_text(claimed.id, content.body, content.items) as id from claimed cross join content;

select is((select count(*)::int from published p join app.text t on p.id = t.id where t.status = 'published'), 1, 'the approved text is published');
select is((select count(*)::int from app.text_item i join published p on p.id = i.text_id
  join app.text_item_key k on i.id = k.item_id), 19, 'all the answer keys were committed with the text');
select is((select app.publish_graded_text(claimed.id, content.body, content.items) from claimed cross join content),
  (select id from published), 'a retry returns that same publication');

insert into app.graded_text_job (language, level_band, density, theme, prompt_version, finished_at)
select 'it', 'A2', 2, 'quota_case_' || i, 'qa_version', now() from generate_series(1, 29) as i;
select is(app.claim_graded_text_job('it', 'A2', 2::smallint, 'different_cell', 'qa_version')->>'status', 'quota', 'the thirty-attempt ceiling is global across cells');

reset role;
select * from finish();
rollback;
