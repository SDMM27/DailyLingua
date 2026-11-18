-- pgTAP tests for the data migration public -> app (migration 20261112000600): app.migrate_user,
-- app.migrate_all, app.verify_migration. The demo user of seed.sql is migrated too; three more users
-- carry the edge cases (two languages, null fields, a guest, an empty account, a card never reviewed,
-- a known card, a paused list, a production without correction, a time zone far from UTC).
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(61);

-- Snapshot helper: row count and content hash of every table of a schema -------------------------------

create function pg_temp.snapshot(p_schema text, p_into text) returns void
language plpgsql
as $f$
declare
  r record;
begin
  execute format('create temp table %I (t text, n bigint, h text) on commit drop', p_into);
  for r in select tablename from pg_tables where schemaname = p_schema order by tablename loop
    execute format(
      'insert into %I select %L, count(*), coalesce(md5(string_agg(x::text, %L order by x::text)), %L) from %I.%I x',
      p_into, r.tablename, '|', '-', p_schema, r.tablename);
  end loop;
end;
$f$;

-- Data ---------------------------------------------------------------------------------------------------
-- f2 member (Pacific/Auckland, es + ja), f3 guest, f4 empty account

insert into auth.users (instance_id, id, aud, role, email, is_anonymous) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'm@test.invalid', false),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000f3', 'authenticated', 'authenticated', null, true),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000f4', 'authenticated', 'authenticated', 'e@test.invalid', false);

update public.profiles set time_zone = 'Pacific/Auckland', generation_time = '06:30', show_streak = false
where id = 'c0000000-0000-4000-8000-0000000000f2';

insert into public.user_languages
  (user_id, language, level, target_level, focus, weight, days, purpose, production_level, created_at) values
  ('c0000000-0000-4000-8000-0000000000f2', 'es', 'B2', 'C1', 'voyager', 20, '{1,2,3,4,5,6,7}', 'travel', null, '2031-01-01'),
  ('c0000000-0000-4000-8000-0000000000f2', 'ja', 'B1', 'B2', '', 15 + 0, '{1,3,5}', 'general', 'A2', '2031-02-01'),
  ('c0000000-0000-4000-8000-0000000000f3', 'es', 'C2', 'C2', '', 10, '{1,2,3,4,5,6,7}', 'general', null, '2031-02-01');
update public.user_languages set weight = 15 where user_id = 'c0000000-0000-4000-8000-0000000000f2' and language = 'ja';

insert into public.sources (id, name, homepage_url) values
  ('c0000000-0000-4000-8000-0000000002a1', 'Source of the migration test', 'https://app-migration.test.invalid');
insert into public.contents (id, source_id, language, content_type, title, url, difficulty, duration_minutes, summary) values
  ('c0000000-0000-4000-8000-0000000002b1', 'c0000000-0000-4000-8000-0000000002a1', 'es', 'article', 'Un texto',
   'https://app-migration.test.invalid/1', 'B1', 5, 'Resumen');

-- Missions: m1 (day 10, completed activity, a quiz answer), m2 (day 11, activity not completed),
-- m3 (day 12) and the guest's mission (day 1 of April, completed).
insert into public.missions (id, user_id, mission_date, budget_minutes, status, generated_at) values
  ('c0000000-0000-4000-8000-0000000003a1', 'c0000000-0000-4000-8000-0000000000f2', '2031-03-10', 35, 'ready', '2031-03-10 00:00+00'),
  ('c0000000-0000-4000-8000-0000000003a2', 'c0000000-0000-4000-8000-0000000000f2', '2031-03-11', 35, 'ready', '2031-03-11 00:00+00'),
  ('c0000000-0000-4000-8000-0000000003a3', 'c0000000-0000-4000-8000-0000000000f2', '2031-03-12', 35, 'ready', '2031-03-12 00:00+00'),
  ('c0000000-0000-4000-8000-0000000003a4', 'c0000000-0000-4000-8000-0000000000f3', '2031-04-01', 10, 'ready', '2031-04-01 00:00+00');
insert into public.mission_sessions (id, mission_id, user_id, position, language, content_id, questions, expressions, production) values
  ('c0000000-0000-4000-8000-0000000004a1', 'c0000000-0000-4000-8000-0000000003a1', 'c0000000-0000-4000-8000-0000000000f2', 0, 'es',
   'c0000000-0000-4000-8000-0000000002b1',
   '[{"id": "q1", "prompt": "?", "options": ["a", "b"], "answerIndex": 0}]', '[]',
   '{"mode": "writing", "prompt": "Écris un texte"}'),
  ('c0000000-0000-4000-8000-0000000004a2', 'c0000000-0000-4000-8000-0000000003a2', 'c0000000-0000-4000-8000-0000000000f2', 0, 'es',
   'c0000000-0000-4000-8000-0000000002b1', '[]', '[]', '{"mode": "spoken", "prompt": "Dis-le"}'),
  ('c0000000-0000-4000-8000-0000000004a3', 'c0000000-0000-4000-8000-0000000003a3', 'c0000000-0000-4000-8000-0000000000f2', 0, 'es',
   'c0000000-0000-4000-8000-0000000002b1', '[]', '[]', '{"mode": "writing", "prompt": "Autre"}'),
  ('c0000000-0000-4000-8000-0000000004a4', 'c0000000-0000-4000-8000-0000000003a4', 'c0000000-0000-4000-8000-0000000000f3', 0, 'es',
   'c0000000-0000-4000-8000-0000000002b1', '[]', '[]', '{"mode": "writing", "prompt": "Invité"}');
insert into public.mission_activities (id, session_id, user_id, position, kind, title, estimated_minutes) values
  ('c0000000-0000-4000-8000-0000000005a1', 'c0000000-0000-4000-8000-0000000004a1', 'c0000000-0000-4000-8000-0000000000f2', 0, 'reading', 'Lire', 5),
  ('c0000000-0000-4000-8000-0000000005a2', 'c0000000-0000-4000-8000-0000000004a2', 'c0000000-0000-4000-8000-0000000000f2', 0, 'reading', 'Lire', 5),
  ('c0000000-0000-4000-8000-0000000005a4', 'c0000000-0000-4000-8000-0000000004a4', 'c0000000-0000-4000-8000-0000000000f3', 0, 'reading', 'Lire', 5);
insert into public.activity_progress (activity_id, user_id, completed_at, spent_seconds) values
  ('c0000000-0000-4000-8000-0000000005a1', 'c0000000-0000-4000-8000-0000000000f2', '2031-03-10 10:00+13', 300),
  ('c0000000-0000-4000-8000-0000000005a2', 'c0000000-0000-4000-8000-0000000000f2', null, 60),
  ('c0000000-0000-4000-8000-0000000005a4', 'c0000000-0000-4000-8000-0000000000f3', '2031-04-01 10:00+00', 120);
insert into public.quiz_answers (session_id, user_id, question_id, selected_index)
values ('c0000000-0000-4000-8000-0000000004a1', 'c0000000-0000-4000-8000-0000000000f2', 'q1', 1);

-- Productions: s1 with a correction, s2 without; s3 has a feedback but no production, s2 also has a
-- claimed attempt without feedback.
insert into public.production_entries (session_id, user_id, body) values
  ('c0000000-0000-4000-8000-0000000004a1', 'c0000000-0000-4000-8000-0000000000f2', E'Hôla señor, ¿qué tal?\n食べる'),
  ('c0000000-0000-4000-8000-0000000004a2', 'c0000000-0000-4000-8000-0000000000f2', repeat('é', 10000));
insert into public.writing_feedback
  (session_id, user_id, attempts, body, feedback, model, prompt_version, input_tokens, output_tokens, reviewed_at) values
  ('c0000000-0000-4000-8000-0000000004a1', 'c0000000-0000-4000-8000-0000000000f2', 2, 'Hôla señor',
   '{"corrections": [{"original": "Hôla", "corrected": "Hola"}], "score": 7}', 'model-x', 'v3', 1200, 300, '2031-03-10 12:00+13'),
  ('c0000000-0000-4000-8000-0000000004a3', 'c0000000-0000-4000-8000-0000000000f2', 1, 'Sin producción',
   '{"corrections": []}', 'model-x', 'v3', 10, 10, '2031-03-12 12:00+13');
insert into public.writing_feedback (session_id, user_id, attempts)
values ('c0000000-0000-4000-8000-0000000004a2', 'c0000000-0000-4000-8000-0000000000f2', 1);
insert into public.correction_cards
  (user_id, session_id, correction_index, language, original, corrected, explanation, category, due_on, added_on, box) values
  ('c0000000-0000-4000-8000-0000000000f2', 'c0000000-0000-4000-8000-0000000004a1', 0, 'es', 'Hôla', 'Hola', 'Pas d''accent', null,
   '2031-03-22', '2031-03-10', 1);

-- Vocabulary
insert into public.vocabulary_lists (id, user_id, language, name, description, active) values
  ('c0000000-0000-4000-8000-0000000006a1', 'c0000000-0000-4000-8000-0000000000f2', 'ja', 'En pause', null, false);
insert into public.vocabulary_items
  (id, user_id, language, term, translation, definition, example, source_name, source_url, content_id, status, box,
   due_on, last_reviewed_on, review_count, added_on, list_id) values
  ('c0000000-0000-4000-8000-0000000007a1', 'c0000000-0000-4000-8000-0000000000f2', 'es', 'hola', 'bonjour', null, null,
   null, null, null, 'learning', 0, '2031-03-15', null, 0, '2031-03-01', null),
  ('c0000000-0000-4000-8000-0000000007a2', 'c0000000-0000-4000-8000-0000000000f2', 'es', 'comer', 'manger', 'Ingérer', 'Voy a comer.',
   null, null, null, 'learning', 3, '2031-03-20', '2031-03-12', 4, '2031-03-01', null),
  ('c0000000-0000-4000-8000-0000000007a3', 'c0000000-0000-4000-8000-0000000000f2', 'ja', '食べる', 'manger', null, null,
   null, null, null, 'known', 9, '2031-06-01', '2031-03-01', 2, '2031-02-20', null),
  ('c0000000-0000-4000-8000-0000000007a4', 'c0000000-0000-4000-8000-0000000000f2', 'ja', 'ねこ', 'chat', 'Animal', 'ねこがいる。',
   null, null, null, 'learning', 1, '2031-03-05', '2031-03-04', 1, '2031-03-01', 'c0000000-0000-4000-8000-0000000006a1'),
  ('c0000000-0000-4000-8000-0000000007a5', 'c0000000-0000-4000-8000-0000000000f2', 'es', 'amigo', 'ami', null, null,
   'Source of the migration test', 'https://app-migration.test.invalid/1', 'c0000000-0000-4000-8000-0000000002b1', 'learning', 2,
   '2031-03-30', '2031-03-12', 2, '2031-03-01', null),
  ('c0000000-0000-4000-8000-0000000007a6', 'c0000000-0000-4000-8000-0000000000f3', 'es', 'gato', 'chat', null, null,
   null, null, null, 'learning', 0, '2031-04-02', null, 0, '2031-04-01', null);
insert into public.vocabulary_reviews
  (user_id, item_id, reviewed_at, reviewed_on, grade, box_before, box_after, due_on_after, mode, days_since_last) values
  ('c0000000-0000-4000-8000-0000000000f2', 'c0000000-0000-4000-8000-0000000007a2', '2031-03-04 09:00+13', '2031-03-04', 'again', 1, 0, '2031-03-05', 'flip', null),
  ('c0000000-0000-4000-8000-0000000000f2', 'c0000000-0000-4000-8000-0000000007a2', '2031-03-08 09:00+13', '2031-03-08', 'good', 0, 1, '2031-03-10', 'translate', 4),
  ('c0000000-0000-4000-8000-0000000000f2', 'c0000000-0000-4000-8000-0000000007a2', '2031-03-12 09:00+13', '2031-03-12', 'good', 1, 3, '2031-03-20', 'cloze', 4);

insert into public.grammar_cards (user_id, point_id, language, box, due_on, last_reviewed_on, review_count, added_on) values
  ('c0000000-0000-4000-8000-0000000000f2', 'es-a1-ser-estar', 'es', 2, '2031-03-25', '2031-03-12', 1, '2031-03-12');
insert into public.alphabet_cards (user_id, group_id, language, box, due_on, last_reviewed_on, review_count, added_on) values
  ('c0000000-0000-4000-8000-0000000000f2', 'ja-alphabet-1', 'ja', 0, '2031-03-13', null, 0, '2031-03-12');

insert into public.placement_tests
  (user_id, language, status, variant, start_level, estimated_level, chosen_level, confidence, answers, bank_version, taken_at) values
  ('c0000000-0000-4000-8000-0000000000f2', 'es', 'completed', null, 'A2', 'B1', 'B1', 'high', '[]', 'v1', '2031-03-01 10:00+00'),
  ('c0000000-0000-4000-8000-0000000000f2', 'ja', 'skipped', null, null, null, null, null, null, null, '2031-03-02 10:00+00');
insert into public.assessments (user_id, language, dossier_id, status, results, graded_at) values
  ('c0000000-0000-4000-8000-0000000000f2', 'ja', 'ja-a2-1', 'graded',
   '{"reading": {"level": "B1"}, "listening": {"level": "A2"}, "writing": {"level": "A2"}, "speaking": null, "review": {}}',
   '2031-03-03 10:00+00');
insert into public.assessments (user_id, language, dossier_id) values
  ('c0000000-0000-4000-8000-0000000000f2', 'es', 'es-b1-1');

insert into public.feedback (user_id, category, message) values
  ('c0000000-0000-4000-8000-0000000000f2', 'idee', 'Une idée de test');
insert into public.content_refusals (user_id, content_id) values
  ('c0000000-0000-4000-8000-0000000000f2', 'c0000000-0000-4000-8000-0000000002b1');
insert into public.user_source_access (user_id, source_id) values
  ('c0000000-0000-4000-8000-0000000000f2', 'c0000000-0000-4000-8000-0000000002a1');
insert into public.mission_requests (user_id, mission_date, language, topic) values
  ('c0000000-0000-4000-8000-0000000000f2', '2031-03-20', 'es', 'société');

select pg_temp.snapshot('public', 'snap_public_before');

-- Migration ----------------------------------------------------------------------------------------------

select ok(exists (select 1 from auth.users where email = 'demo@dailylingua.test'), 'the demo user of seed.sql is there');

set local role service_role;
create temporary table r_guest on commit drop as
  select app.migrate_user('c0000000-0000-4000-8000-0000000000f3') as j;
create temporary table r_all on commit drop as select app.migrate_all() as j;
create temporary table v1 on commit drop as select * from app.verify_migration();
reset role;

select is((select (j ->> 'card_word')::int from r_guest), 1, 'migrate_user reports the rows it created');
select ok((select (j ->> 'users')::int >= 4 from r_all), 'migrate_all covers every user');
select is_empty($$select * from v1$$, 'verify_migration returns no row after the migration');

select pg_temp.snapshot('public', 'snap_public_after');
select is((select count(*)::int from snap_public_before b join snap_public_after a using (t)
           where (a.n, a.h) is distinct from (b.n, b.h)), 0, 'no table of public was modified');

-- profile ------------------------------------------------------------------------------------------------

select results_eq(
  $$select native_language, ui_language, time_zone, reminder_time::text, game_settings::text, is_guest,
      legacy_migrated_at is not null
    from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000f2'$$,
  $$values ('fr', 'fr', 'Pacific/Auckland', '06:30:00', '{"streak": false}', false, true)$$,
  'the profile created by the signup trigger is completed by the migration');
select is((select is_guest from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000f3'), true,
  'a guest stays a guest');
select ok((select legacy_migrated_at is not null from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000f4'),
  'an account without data is migrated too');

-- enrollment, skills -------------------------------------------------------------------------------------

select results_eq(
  $$select language, daily_minutes::int, days::text, purpose, target_level, position::int, focus ->> 'text'
    from app.enrollment where user_id = 'c0000000-0000-4000-8000-0000000000f2' order by position$$,
  $$values ('es', 20, '{1,2,3,4,5,6,7}', 'travel', 'C1', 0, 'voyager'), ('ja', 15, '{1,3,5}', 'general', 'B2', 1, '')$$,
  'two languages: minutes, days, purpose, target level and order are kept');
select results_eq(
  $$select language, skill, level_value::float8, uncertainty::float8, source from app.skill_estimate
    where user_id = 'c0000000-0000-4000-8000-0000000000f2' order by language, skill$$,
  $$values ('es', 'listening', 4.5::float8, 0.5::float8, 'legacy'), ('es', 'reading', 4.5, 0.5, 'legacy'),
           ('es', 'writing', 4.5, 0.5, 'legacy'), ('ja', 'listening', 3.5, 0.5, 'legacy'),
           ('ja', 'reading', 3.5, 0.5, 'legacy'), ('ja', 'writing', 2.5, 0.5, 'legacy')$$,
  'level -> reading and listening, production_level (else level) -> writing, band middles on the 0..7 scale');
select is((select count(*)::int from app.skill_estimate where skill = 'speaking'
           and user_id in ('c0000000-0000-4000-8000-0000000000f2', 'c0000000-0000-4000-8000-0000000000f3')), 0,
  'no speaking estimate is invented');
select is((select level_value::float8 from app.skill_estimate
           where user_id = 'c0000000-0000-4000-8000-0000000000f3' and skill = 'writing'), 6.5::float8,
  'C2 is the middle of the last band');

-- cards ----------------------------------------------------------------------------------------------------

select is((select count(*)::int from app.card_list where user_id = 'c0000000-0000-4000-8000-0000000000f2'), 1, 'the list is copied');
select is((select active from app.card_list where user_id = 'c0000000-0000-4000-8000-0000000000f2'), false, 'a paused list stays paused');
select results_eq(
  $$select front, back, back_language, context, state, stability::float8, difficulty::float8, reps, lapses, legacy_box::int, source
    from app.card where user_id = 'c0000000-0000-4000-8000-0000000000f2' and kind = 'word' order by front$$,
  $$values
    ('amigo', 'ami', 'fr', null, 'review', 4::float8, 5::float8, 2, 0, 2, 'legacy'),
    ('comer', 'manger', 'fr', 'Voy a comer.', 'review', 8, 5, 4, 1, 3, 'legacy'),
    ('hola', 'bonjour', 'fr', null, 'new', 1, 5, 0, 0, 0, 'legacy'),
    ('ねこ', 'chat', 'fr', 'ねこがいる。', 'review', 2, 5, 1, 0, 1, 'legacy'),
    ('食べる', 'manger', 'fr', null, 'known', 64, 5, 2, 0, 9, 'legacy')$$,
  'word cards: new, review and known states, Leitner box -> stability, lapses from the journal, nulls kept');
select is((select due_at from app.card where front = 'comer'), '2031-03-20 04:00'::timestamp at time zone 'Pacific/Auckland',
  'due_at is the due day at 04:00 local time');
select is((select last_review_at from app.card where front = 'comer'), '2031-03-12 12:00'::timestamp at time zone 'Pacific/Auckland',
  'last_review_at is the review day at 12:00 local time');
select is((select last_review_at from app.card where front = 'hola'), null, 'a card never reviewed has no last review');
select is(
  (select count(*)::int
   from app.card c
   join app.legacy_map m on m.app_table = 'card' and m.app_id = c.id::text and m.legacy_table = 'vocabulary_items'
   join public.vocabulary_items v on v.id::text = m.legacy_id
   join app.profile p on p.user_id = c.user_id
   where (c.due_at at time zone p.time_zone)::date <> v.due_on),
  0, 'the due day of every vocabulary card is preserved (no card becomes due earlier or later)');
select is((select payload ->> 'definition' from app.card where front = 'ねこ'), 'Animal', 'the definition goes to the payload');
select results_eq(
  $$select payload ->> 'source_name', payload ->> 'source_url', payload ->> 'content_id'
    from app.card where front = 'amigo'$$,
  $$values ('Source of the migration test', 'https://app-migration.test.invalid/1', 'c0000000-0000-4000-8000-0000000002b1')$$,
  'the source of a word goes to the payload');
select is((select l.name from app.card c join app.card_list l on l.id = c.list_id where c.front = 'ねこ'), 'En pause',
  'a card keeps its list');
select results_eq(
  $$select kind, ref, front, state, stability::float8, legacy_box::int from app.card
    where user_id = 'c0000000-0000-4000-8000-0000000000f2' and kind in ('grammar', 'script') order by kind$$,
  $$values ('grammar', 'es-a1-ser-estar', 'es-a1-ser-estar', 'review', 4::float8, 2), ('script', 'ja-alphabet-1', 'ja-alphabet-1', 'new', 1, 0)$$,
  'grammar and alphabet cards keep their stable identifier');
select results_eq(
  $$select front, back, back_language, state, payload ->> 'explanation', payload ->> 'category',
      payload ->> 'production_id' = (select p.id::text from app.production p where p.text like 'Hôla%')
    from app.card where user_id = 'c0000000-0000-4000-8000-0000000000f2' and kind = 'correction'$$,
  $$values ('Hôla', 'Hola', 'es', 'new', 'Pas d''accent', null, true)$$,
  'correction cards: faulty passage, correction, and the link to the production');

-- review journal ---------------------------------------------------------------------------------------------

select results_eq(
  $$select r.rating::int, r.mode, (r.reviewed_at at time zone 'Pacific/Auckland')::text, r.elapsed_days::float8,
      r.scheduled_days::float8, r.origin
    from app.review_log r join app.card c on c.id = r.card_id where c.front = 'comer' order by r.reviewed_at$$,
  $$values (1, 'flip', '2031-03-04 12:00:00', null::float8, 1::float8, 'leitner'),
           (3, 'translate', '2031-03-08 12:00:00', 4, 2, 'leitner'),
           (3, 'cloze', '2031-03-12 12:00:00', 4, 8, 'leitner')$$,
  'reviews: rating, mode, local noon of the review day, origin leitner');
select is((select count(*)::int from app.review_log where user_id = 'c0000000-0000-4000-8000-0000000000f2'), 3,
  'every review is copied');
select is((select min(r.created_at) from app.review_log r join app.card c on c.id = r.card_id where c.front = 'comer'),
  '2031-03-04 09:00+13'::timestamptz, 'the real instant of the review is kept in created_at');

-- production, correction, assessment -----------------------------------------------------------------------------

select results_eq(
  $$select mode, language, task ->> 'prompt', task ->> 'legacy_session_id', char_length(text) from app.production
    where user_id = 'c0000000-0000-4000-8000-0000000000f2' order by mode desc$$,
  $$values ('writing', 'es', 'Écris un texte', 'c0000000-0000-4000-8000-0000000004a1', 25),
           ('spoken', 'es', 'Dis-le', 'c0000000-0000-4000-8000-0000000004a2', 10000)$$,
  'productions keep their text (accents, kanji, 10 000 characters), mode, language and task');
select is((select text from app.production where mode = 'writing' and user_id = 'c0000000-0000-4000-8000-0000000000f2'),
  E'Hôla señor, ¿qué tal?\n食べる', 'the text is identical');
select results_eq(
  $$select c.feedback::text, c.explanation_language, c.model, c.prompt_version, c.input_tokens, c.output_tokens
    from app.correction c where c.user_id = 'c0000000-0000-4000-8000-0000000000f2'$$,
  $$values ('{"score": 7, "corrections": [{"original": "Hôla", "corrected": "Hola"}]}', 'fr', 'model-x', 'v3', 1200, 300)$$,
  'one correction: the production with a feedback; the JSON, model, version and tokens are kept');
select is((select count(*)::int from app.legacy_record
           where legacy_table = 'writing_feedback' and user_id = 'c0000000-0000-4000-8000-0000000000f2'), 3,
  'every writing_feedback row is archived, including the one without feedback and the one without production');
select is((select count(*)::int from app.assessment_result where user_id = 'c0000000-0000-4000-8000-0000000000f2'), 4,
  'placement tests and assessments are copied');
select results_eq(
  $$select kind, levels from app.assessment_result
    where user_id = 'c0000000-0000-4000-8000-0000000000f2' order by kind, taken_at$$,
  $$values ('assessment', '{}'::jsonb), ('assessment', '{"reading": "B1", "writing": "A2", "listening": "A2"}'::jsonb),
           ('placement', '{"start": "A2", "reception": "B1", "estimated": "B1"}'::jsonb), ('placement', '{}'::jsonb)$$,
  'resulting levels: graded assessment, in progress, placement completed and skipped');
select is((select payload ->> 'dossier_id' from app.assessment_result where payload ->> 'dossier_id' = 'ja-a2-1'), 'ja-a2-1',
  'the payload is the whole source row');

-- archive of what has no equivalent yet --------------------------------------------------------------------------

select results_eq(
  $$select legacy_table, count(*)::int from app.legacy_record where user_id = 'c0000000-0000-4000-8000-0000000000f2'
    group by legacy_table order by legacy_table$$,
  $$values ('content_refusals', 1), ('feedback', 1), ('mission_requests', 1), ('missions', 3), ('profiles', 1),
           ('user_languages', 2), ('user_source_access', 1), ('writing_feedback', 3)$$,
  'missions, feedback, refusals, source access, requests, profile, languages and feedbacks are archived');
select results_eq(
  $$select jsonb_array_length(payload -> 'sessions'),
      payload -> 'sessions' -> 0 -> 'activities' -> 0 -> 'progress' ->> 'spent_seconds',
      jsonb_array_length(payload -> 'sessions' -> 0 -> 'quiz_answers')
    from app.legacy_record where legacy_table = 'missions' and legacy_id = 'c0000000-0000-4000-8000-0000000003a1'$$,
  $$values (1, '300', 1)$$, 'a mission is archived with its sessions, activities, progress and answers');
select is((select payload ->> 'topic' from app.legacy_record where legacy_table = 'mission_requests'
           and user_id = 'c0000000-0000-4000-8000-0000000000f2'), 'société', 'a mission request is archived');

-- study days and streak -----------------------------------------------------------------------------------------

select is(
  (select array_agg(day::text order by day) from app.study_day where user_id = 'c0000000-0000-4000-8000-0000000000f2'),
  array['2031-03-04', '2031-03-08', '2031-03-10', '2031-03-12'],
  'study days: completed missions and review days, not a mission whose activity is unfinished');
select is((select count(*)::int from app.study_day where user_id = 'c0000000-0000-4000-8000-0000000000f2' and origin <> 'legacy'),
  0, 'they are marked legacy');
select results_eq(
  $$select "current", best, last_day::text from app.streak_state where user_id = 'c0000000-0000-4000-8000-0000000000f2'$$,
  $$values (0, 0, '2031-03-12')$$, 'the streak state keeps the last study day, the streak itself is not computed here');
select is((select count(*)::int from app.card where user_id = 'c0000000-0000-4000-8000-0000000000f4'), 0,
  'an account without data has no card');

-- Replay -------------------------------------------------------------------------------------------------------

select pg_temp.snapshot('app', 'snap_app_1');
update app.profile set ui_language = 'en' where user_id = 'c0000000-0000-4000-8000-0000000000f2';
select pg_temp.snapshot('app', 'snap_app_1b');

set local role service_role;
create temporary table r_again on commit drop as select app.migrate_all() as j;
reset role;
select pg_temp.snapshot('app', 'snap_app_2');

select is((select count(*)::int from jsonb_each_text((select j from r_again)) e where e.key not in ('users', 'skipped_active', 'errors') and e.value <> '0'), 0,
  'a second run creates nothing');
select is((select count(*)::int from snap_app_1b a join snap_app_2 b using (t) where (a.n, a.h) is distinct from (b.n, b.h)), 0,
  'and changes nothing: same row counts and same content in every table of app');
select is((select ui_language from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000f2'), 'en',
  'a profile already stamped is not overwritten');
select is((select count(*)::int from snap_app_1 a join snap_app_1b b using (t) where a.n <> b.n), 0,
  'sanity check of the snapshots: only the profile content differed');

-- A source row that appears later is picked up -------------------------------------------------------------------

insert into public.vocabulary_items (user_id, language, term, translation, status, box, due_on, review_count, added_on)
values ('c0000000-0000-4000-8000-0000000000f2', 'es', 'nuevo', 'nouveau', 'learning', 0, '2031-04-10', 0, '2031-04-09');
insert into public.vocabulary_reviews (user_id, item_id, reviewed_at, reviewed_on, grade, box_before, box_after, due_on_after, mode, days_since_last)
values ('c0000000-0000-4000-8000-0000000000f2', 'c0000000-0000-4000-8000-0000000007a2', '2031-03-15 09:00+13', '2031-03-15',
  'easy', 3, 4, '2031-03-31', 'produce', 3);
-- (as the old app does: a review also moves the item itself)
update public.vocabulary_items set box = 4, due_on = '2031-03-31', last_reviewed_on = '2031-03-15', review_count = 5
where id = 'c0000000-0000-4000-8000-0000000007a2';
update public.activity_progress set completed_at = '2031-03-11 10:00+13'
where activity_id = 'c0000000-0000-4000-8000-0000000005a2';

set local role service_role;
create temporary table r_inc on commit drop as select app.migrate_user('c0000000-0000-4000-8000-0000000000f2') as j;
create temporary table v2 on commit drop as select * from app.verify_migration();
reset role;

select results_eq(
  $$select (j ->> 'card_word')::int, (j ->> 'review_log')::int, (j ->> 'study_day')::int, (j ->> 'profile')::int from r_inc$$,
  $$values (1, 1, 2, 0)$$, 'the new word, the new review and the two new study days are copied, nothing else');
select is_empty($$select * from v2$$, 'verify_migration is still clean');
select is((select reps from app.card where front = 'comer'), 5, 'a reviewed card follows its source');
select is((select payload -> 'sessions' -> 0 -> 'activities' -> 0 -> 'progress' ->> 'completed_at'
           from app.legacy_record where legacy_table = 'missions' and legacy_id = 'c0000000-0000-4000-8000-0000000003a2') is not null,
  true, 'an archived mission follows its source: the progress made after the first run is not lost');
select is((select count(*)::int from app.card where user_id = 'c0000000-0000-4000-8000-0000000000f2' and kind = 'word'), 6,
  'six word cards now');

-- Privileges ----------------------------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select app.migrate_user('c0000000-0000-4000-8000-0000000000f2')$$, '42501', null,
  'a user cannot run migrate_user');
select throws_ok($$select app.migrate_all()$$, '42501', null, 'a user cannot run migrate_all');
select throws_ok($$select * from app.verify_migration()$$, '42501', null, 'a user cannot run verify_migration');
reset role;
set local role anon;
select throws_ok($$select app.migrate_user('c0000000-0000-4000-8000-0000000000f2')$$, '42501', null, 'anon cannot run migrate_user');
reset role;

-- verify_migration detects a loss ------------------------------------------------------------------------------------

delete from app.card where front = 'hola';
update app.card set due_at = due_at - interval '2 days' where front = 'comer';
update app.production set text = 'altered' where mode = 'spoken' and user_id = 'c0000000-0000-4000-8000-0000000000f2';
delete from app.legacy_map where legacy_table = 'vocabulary_items' and legacy_id = 'c0000000-0000-4000-8000-0000000007a5';
delete from app.study_day where user_id = 'c0000000-0000-4000-8000-0000000000f2' and day = '2031-03-08';

set local role service_role;
create temporary table v3 on commit drop as select * from app.verify_migration();
reset role;

select ok(exists (select 1 from v3 where user_id = 'c0000000-0000-4000-8000-0000000000f2' and check_name = 'cards_word'),
  'a missing card is reported (count)');
select ok(exists (select 1 from v3 where user_id = 'c0000000-0000-4000-8000-0000000000f2' and check_name = 'md5_terms'),
  'a missing card is reported (checksum of the terms)');
select ok(exists (select 1 from v3 where user_id = 'c0000000-0000-4000-8000-0000000000f2' and check_name = 'due_day'),
  'a card that became due earlier is reported');
select ok(exists (select 1 from v3 where user_id = 'c0000000-0000-4000-8000-0000000000f2' and check_name = 'md5_production_texts'),
  'an altered production text is reported');
select ok(exists (select 1 from v3 where user_id = 'c0000000-0000-4000-8000-0000000000f2' and check_name = 'study_day_missing'),
  'a missing study day is reported');
select ok(exists (select 1 from v3 where check_name = 'cards_word' and expected <> actual),
  'the report gives the expected and the actual value');
select is((select count(*)::int from v3 where user_id <> 'c0000000-0000-4000-8000-0000000000f2'), 0,
  'only the damaged user is reported');

select * from finish();
rollback;
