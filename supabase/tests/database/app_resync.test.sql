-- pgTAP tests for the resynchronising migration (review E1, E2, M1, M6): while a user has not written in
-- the new app (profile.app_active_since is null), migrate_user realigns app on public — updates, additions,
-- deletions, exactly as the OLD app changes its rows; once the user is active, nothing is touched.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

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

-- The old app's data ------------------------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'r1@test.invalid');
update public.profiles set time_zone = 'Pacific/Auckland', generation_time = '06:30', show_streak = false
where id = 'd0000000-0000-4000-8000-0000000000e1';
insert into public.user_languages (user_id, language, level, target_level, focus, weight, days, purpose, production_level, created_at) values
  ('d0000000-0000-4000-8000-0000000000e1', 'es', 'B2', 'C1', 'voyager', 20, '{1,2,3,4,5,6,7}', 'travel', null, '2031-01-01'),
  ('d0000000-0000-4000-8000-0000000000e1', 'ja', 'B1', 'B2', '', 15, '{1,3,5}', 'general', 'A2', '2031-02-01');

insert into public.sources (id, name, homepage_url) values
  ('d0000000-0000-4000-8000-0000000002a1', 'Source of the resync test', 'https://resync.test.invalid');
insert into public.contents (id, source_id, language, content_type, title, url, difficulty, duration_minutes, summary) values
  ('d0000000-0000-4000-8000-0000000002b1', 'd0000000-0000-4000-8000-0000000002a1', 'es', 'article', 'Un texto',
   'https://resync.test.invalid/1', 'B1', 5, 'Resumen');
insert into public.missions (id, user_id, mission_date, budget_minutes, status, generated_at) values
  ('d0000000-0000-4000-8000-0000000003a1', 'd0000000-0000-4000-8000-0000000000e1', '2031-03-10', 35, 'ready', '2031-03-10 00:00+00');
insert into public.mission_sessions (id, mission_id, user_id, position, language, content_id, questions, expressions, production) values
  ('d0000000-0000-4000-8000-0000000004a1', 'd0000000-0000-4000-8000-0000000003a1', 'd0000000-0000-4000-8000-0000000000e1', 0, 'es',
   'd0000000-0000-4000-8000-0000000002b1', '[]', '[]', '{"mode": "writing", "prompt": "Écris"}');
insert into public.mission_activities (id, session_id, user_id, position, kind, title, estimated_minutes) values
  ('d0000000-0000-4000-8000-0000000005a1', 'd0000000-0000-4000-8000-0000000004a1', 'd0000000-0000-4000-8000-0000000000e1', 0, 'reading', 'Lire', 5);
insert into public.activity_progress (activity_id, user_id, completed_at, spent_seconds) values
  ('d0000000-0000-4000-8000-0000000005a1', 'd0000000-0000-4000-8000-0000000000e1', '2031-03-10 10:00+13', 300);
insert into public.production_entries (session_id, user_id, body) values
  ('d0000000-0000-4000-8000-0000000004a1', 'd0000000-0000-4000-8000-0000000000e1', 'texte v1');
insert into public.writing_feedback (session_id, user_id, attempts, body, feedback, model, prompt_version, input_tokens, output_tokens, reviewed_at) values
  ('d0000000-0000-4000-8000-0000000004a1', 'd0000000-0000-4000-8000-0000000000e1', 1, 'texte v1', '{"score": 5}', 'm', 'v1', 1, 1,
   '2031-03-10 12:00+13');

insert into public.vocabulary_lists (id, user_id, language, name, active) values
  ('d0000000-0000-4000-8000-0000000006a1', 'd0000000-0000-4000-8000-0000000000e1', 'ja', 'En pause', false),
  ('d0000000-0000-4000-8000-0000000006a2', 'd0000000-0000-4000-8000-0000000000e1', 'ja', 'À supprimer', true);
insert into public.vocabulary_items
  (id, user_id, language, term, translation, status, box, due_on, last_reviewed_on, review_count, added_on, list_id) values
  ('d0000000-0000-4000-8000-0000000007a1', 'd0000000-0000-4000-8000-0000000000e1', 'es', 'hola', 'bonjour', 'learning', 0, '2031-03-15', null, 0, '2031-03-01', null),
  ('d0000000-0000-4000-8000-0000000007a2', 'd0000000-0000-4000-8000-0000000000e1', 'es', 'comer', 'manger', 'learning', 3, '2031-03-20', '2031-03-12', 4, '2031-03-01', null),
  ('d0000000-0000-4000-8000-0000000007a3', 'd0000000-0000-4000-8000-0000000000e1', 'ja', 'ねこ', 'chat', 'learning', 1, '2031-03-05', '2031-03-04', 1, '2031-03-01', 'd0000000-0000-4000-8000-0000000006a1'),
  ('d0000000-0000-4000-8000-0000000007a4', 'd0000000-0000-4000-8000-0000000000e1', 'es', 'amigo', 'ami', 'learning', 2, '2031-03-30', '2031-03-12', 2, '2031-03-01', null),
  ('d0000000-0000-4000-8000-0000000007a5', 'd0000000-0000-4000-8000-0000000000e1', 'ja', 'さかな', 'poisson', 'learning', 0, '2031-03-08', null, 0, '2031-03-01', 'd0000000-0000-4000-8000-0000000006a2');
insert into public.vocabulary_reviews
  (user_id, item_id, reviewed_at, reviewed_on, grade, box_before, box_after, due_on_after, mode, days_since_last) values
  ('d0000000-0000-4000-8000-0000000000e1', 'd0000000-0000-4000-8000-0000000007a2', '2031-03-12 09:00+13', '2031-03-12', 'good', 1, 3, '2031-03-20', 'flip', 4),
  ('d0000000-0000-4000-8000-0000000000e1', 'd0000000-0000-4000-8000-0000000007a4', '2031-03-12 09:30+13', '2031-03-12', 'good', 1, 2, '2031-03-30', 'flip', 4);
insert into public.grammar_cards (id, user_id, point_id, language, box, due_on, last_reviewed_on, review_count, added_on) values
  ('d0000000-0000-4000-8000-0000000008a1', 'd0000000-0000-4000-8000-0000000000e1', 'es-a1-ser-estar', 'es', 2, '2031-03-25', '2031-03-12', 1, '2031-03-12');
insert into public.alphabet_cards (user_id, group_id, language, box, due_on, last_reviewed_on, review_count, added_on) values
  ('d0000000-0000-4000-8000-0000000000e1', 'ja-alphabet-1', 'ja', 0, '2031-03-13', null, 0, '2031-03-12');
insert into public.placement_tests
  (user_id, language, status, start_level, estimated_level, chosen_level, confidence, answers, bank_version, taken_at) values
  ('d0000000-0000-4000-8000-0000000000e1', 'es', 'completed', 'A2', 'B1', 'B1', 'high', '[]', 'v1', '2031-03-01 10:00+00');
insert into public.assessments (id, user_id, language, dossier_id) values
  ('d0000000-0000-4000-8000-0000000009a1', 'd0000000-0000-4000-8000-0000000000e1', 'ja', 'ja-a2-1');

-- First migration ------------------------------------------------------------------------------------------------

set local role service_role;
create temporary table r_first on commit drop as select app.migrate_all() as j;
create temporary table v_first on commit drop as select * from app.verify_migration();
reset role;

select is_empty($$select * from v_first$$, 'after the first migration: nothing to report');
select is((select (j ->> 'skipped_active')::int from r_first), 0, 'nobody is active yet');
select is((select j -> 'errors' from r_first), '[]'::jsonb, 'and no error');
select is((select app_active_since from app.profile where user_id = 'd0000000-0000-4000-8000-0000000000e1'), null,
  'the migration never marks a user active');

-- The user's choices in app before they are active (not via save_profile, which would activate them).
update app.profile set native_language = 'it', ui_language = 'en' where user_id = 'd0000000-0000-4000-8000-0000000000e1';

-- The OLD app goes on serving: what it really does to its rows ---------------------------------------------------------

-- a review: the item takes the new box, due date, count; a journal row is added
update public.vocabulary_items set box = 4, due_on = '2031-04-15', last_reviewed_on = '2031-03-15', review_count = 5
where id = 'd0000000-0000-4000-8000-0000000007a2';
insert into public.vocabulary_reviews
  (user_id, item_id, reviewed_at, reviewed_on, grade, box_before, box_after, due_on_after, mode, days_since_last)
values ('d0000000-0000-4000-8000-0000000000e1', 'd0000000-0000-4000-8000-0000000007a2', '2031-03-15 09:00+13', '2031-03-15',
  'again', 3, 4, '2031-04-15', 'cloze', 3);
update public.vocabulary_items set translation = 'salut' where id = 'd0000000-0000-4000-8000-0000000007a1';
update public.vocabulary_items set list_id = null where id = 'd0000000-0000-4000-8000-0000000007a3';
update public.vocabulary_lists set name = 'Renommée' where id = 'd0000000-0000-4000-8000-0000000006a1';
delete from public.vocabulary_items where id = 'd0000000-0000-4000-8000-0000000007a4';
delete from public.vocabulary_lists where id = 'd0000000-0000-4000-8000-0000000006a2';
update public.user_languages set weight = 30, days = '{2,4}', level = 'B2', production_level = 'B1'
where user_id = 'd0000000-0000-4000-8000-0000000000e1' and language = 'ja';
insert into public.placement_tests (user_id, language, status, taken_at)
values ('d0000000-0000-4000-8000-0000000000e1', 'ja', 'skipped', '2031-03-02 10:00+00');
update public.assessments set status = 'graded', graded_at = '2031-03-03 10:00+00',
  results = '{"reading": {"level": "B1"}, "listening": {"level": "A2"}, "writing": null, "speaking": null, "review": {}}'
where id = 'd0000000-0000-4000-8000-0000000009a1';
update public.production_entries set body = 'texte v2' where session_id = 'd0000000-0000-4000-8000-0000000004a1';
update public.writing_feedback set feedback = '{"score": 9}' where session_id = 'd0000000-0000-4000-8000-0000000004a1';
update public.profiles set time_zone = 'Asia/Kolkata', show_streak = true where id = 'd0000000-0000-4000-8000-0000000000e1';
delete from public.grammar_cards where id = 'd0000000-0000-4000-8000-0000000008a1';
insert into public.grammar_cards (id, user_id, point_id, language, box, due_on, last_reviewed_on, review_count, added_on) values
  ('d0000000-0000-4000-8000-0000000008a2', 'd0000000-0000-4000-8000-0000000000e1', 'es-a1-ser-estar', 'es', 4, '2031-04-20', '2031-03-20', 2, '2031-03-12');
insert into public.missions (id, user_id, mission_date, budget_minutes, status, generated_at) values
  ('d0000000-0000-4000-8000-0000000003a2', 'd0000000-0000-4000-8000-0000000000e1', '2031-03-20', 35, 'ready', '2031-03-20 00:00+00');
insert into public.mission_sessions (id, mission_id, user_id, position, language, content_id, questions, expressions, production) values
  ('d0000000-0000-4000-8000-0000000004a2', 'd0000000-0000-4000-8000-0000000003a2', 'd0000000-0000-4000-8000-0000000000e1', 0, 'es',
   'd0000000-0000-4000-8000-0000000002b1', '[]', '[]', '{"mode": "spoken", "prompt": "Dis"}');
insert into public.mission_activities (id, session_id, user_id, position, kind, title, estimated_minutes) values
  ('d0000000-0000-4000-8000-0000000005a2', 'd0000000-0000-4000-8000-0000000004a2', 'd0000000-0000-4000-8000-0000000000e1', 0, 'reading', 'Lire', 5);
insert into public.activity_progress (activity_id, user_id, completed_at, spent_seconds) values
  ('d0000000-0000-4000-8000-0000000005a2', 'd0000000-0000-4000-8000-0000000000e1', '2031-03-20 10:00+05:30', 200);
insert into public.production_entries (session_id, user_id, body) values
  ('d0000000-0000-4000-8000-0000000004a2', 'd0000000-0000-4000-8000-0000000000e1', 'second texte');

-- Resynchronisation --------------------------------------------------------------------------------------------------------

set local role service_role;
create temporary table r_sync on commit drop as select app.migrate_user('d0000000-0000-4000-8000-0000000000e1') as j;
create temporary table v_sync on commit drop as select * from app.verify_migration();
reset role;

select is_empty($$select * from v_sync$$, 'verify_migration is clean after the resynchronisation');
select results_eq(
  $$select (j ->> 'card_updated')::int, (j ->> 'card_deleted')::int, (j ->> 'card_grammar')::int, (j ->> 'review_log')::int,
      (j ->> 'card_list_deleted')::int, (j ->> 'card_list_updated')::int, (j ->> 'production')::int
    from r_sync$$,
  $$values (4, 3, 1, 1, 1, 1, 1)$$,
  'the report counts what changed: cards updated and deleted, new grammar card, review, lists, production');

select results_eq(
  $$select reps, lapses, state, stability::float8, legacy_box::int,
      (due_at at time zone 'Asia/Kolkata')::text, (last_review_at at time zone 'Asia/Kolkata')::text
    from app.card where front = 'comer'$$,
  $$values (5, 1, 'review', 16::float8, 4, '2031-04-15 04:00:00', '2031-03-15 12:00:00')$$,
  'a review made in the old app: box, schedule, count and lapses follow, in the new time zone');
select is((select back from app.card where front = 'hola'), 'salut', 'a corrected translation follows');
select is((select list_id from app.card where front = 'ねこ'), null, 'a word taken out of its list follows');
select is((select name from app.card_list where user_id = 'd0000000-0000-4000-8000-0000000000e1' and language = 'ja'), 'Renommée',
  'a renamed list follows');
select is((select count(*)::int from app.card_list where user_id = 'd0000000-0000-4000-8000-0000000000e1'), 1,
  'a deleted list is removed from the copy');
select is((select count(*)::int from app.legacy_map where legacy_table = 'vocabulary_lists' and legacy_id = 'd0000000-0000-4000-8000-0000000006a2'), 0,
  'with its map entry');
select ok((select deleted_at is not null from app.card where front = 'amigo'), 'a deleted word is marked deleted, not erased');
select ok((select deleted_at is not null from app.card where front = 'さかな'), 'so is a word that went with its list');
select is((select count(*)::int from app.review_log r join app.card c on c.id = r.card_id where c.front = 'amigo'), 1,
  'its review journal stays');
select is((select count(*)::int from app.review_log r join app.card c on c.id = r.card_id where c.front = 'comer'), 2,
  'the new review of the old app is added to the journal');
select results_eq(
  $$select deleted_at is not null, stability::float8 from app.card where kind = 'grammar' order by created_at, deleted_at nulls last$$,
  $$values (true, 4::float8), (false, 16::float8)$$,
  'a grammar card deleted and added again: the old copy is deleted, the new one is live');
select results_eq(
  $$select language, daily_minutes::int, days::text from app.enrollment
    where user_id = 'd0000000-0000-4000-8000-0000000000e1' order by language$$,
  $$values ('es', 20, '{1,2,3,4,5,6,7}'), ('ja', 30, '{2,4}')$$,
  'minutes and days of a language follow');
select results_eq(
  $$select skill, level_value::float8 from app.skill_estimate
    where user_id = 'd0000000-0000-4000-8000-0000000000e1' and language = 'ja' order by skill$$,
  $$values ('listening', 4.5::float8), ('reading', 4.5), ('writing', 3.5)$$,
  'a new level (test or assessment) moves the legacy estimates');
select is((select count(*)::int from app.assessment_result where user_id = 'd0000000-0000-4000-8000-0000000000e1'), 3,
  'a new placement test is copied');
select is((select levels from app.assessment_result where payload ->> 'dossier_id' = 'ja-a2-1'),
  '{"reading": "B1", "listening": "A2"}'::jsonb, 'an assessment graded since follows');
select is((select text from app.production where task ->> 'legacy_session_id' = 'd0000000-0000-4000-8000-0000000004a1'), 'texte v2',
  'a rewritten production follows');
select is((select feedback from app.correction), '{"score": 9}'::jsonb, 'a new feedback follows');
select results_eq(
  $$select time_zone, game_settings, native_language, ui_language from app.profile
    where user_id = 'd0000000-0000-4000-8000-0000000000e1'$$,
  $$values ('Asia/Kolkata', '{"streak": true}'::jsonb, 'it', 'en')$$,
  'time zone and settings follow; the languages chosen in app are kept');
select is((select array_agg(day::text order by day) from app.study_day where user_id = 'd0000000-0000-4000-8000-0000000000e1'),
  array['2031-03-10', '2031-03-12', '2031-03-15', '2031-03-20'], 'study days: the new ones are added');
select is((select last_day::text from app.streak_state where user_id = 'd0000000-0000-4000-8000-0000000000e1'), '2031-03-20',
  'and the last day of the streak state');

-- Replay: nothing changes ---------------------------------------------------------------------------------------------------

select pg_temp.snapshot('app', 'snap_1');
set local role service_role;
create temporary table r_again on commit drop as select app.migrate_all() as j;
reset role;
select pg_temp.snapshot('app', 'snap_2');
select is((select count(*)::int from jsonb_each_text((select j from r_again)) e
           where e.key not in ('users', 'skipped_active', 'errors') and e.value <> '0'), 0, 'a second run creates, updates and deletes nothing');
select is((select count(*)::int from snap_1 a join snap_2 b using (t) where (a.n, a.h) is distinct from (b.n, b.h)), 0,
  'and every table of app is identical, down to the timestamps');

-- The user becomes active: the migration no longer touches them -----------------------------------------------------------------

set local role service_role;
select app.mark_active('d0000000-0000-4000-8000-0000000000e1');
reset role;
update public.vocabulary_items set translation = 'changed in the old app' where id = 'd0000000-0000-4000-8000-0000000007a1';
insert into public.vocabulary_items (user_id, language, term, translation, status, box, due_on, review_count, added_on)
values ('d0000000-0000-4000-8000-0000000000e1', 'es', 'nuevo', 'nouveau', 'learning', 0, '2031-05-01', 0, '2031-04-30');
delete from public.vocabulary_items where id = 'd0000000-0000-4000-8000-0000000007a2';

select pg_temp.snapshot('app', 'snap_3');
set local role service_role;
create temporary table r_active on commit drop as select app.migrate_user('d0000000-0000-4000-8000-0000000000e1') as j;
create temporary table r_all2 on commit drop as select app.migrate_all() as j;
create temporary table v_active on commit drop as select * from app.verify_migration();
reset role;
select pg_temp.snapshot('app', 'snap_4');

select is((select j from r_active), '{"skipped": "active"}'::jsonb, 'migrate_user skips an active user');
select ok((select (j ->> 'skipped_active')::int >= 1 from r_all2), 'migrate_all counts the skipped users apart');
select is((select count(*)::int from snap_3 a join snap_4 b using (t) where (a.n, a.h) is distinct from (b.n, b.h)), 0,
  'nothing of app changed');
select is((select back from app.card where front = 'hola'), 'salut', 'the copy keeps what it was');
select is((select count(*)::int from v_active where user_id = 'd0000000-0000-4000-8000-0000000000e1'), 0,
  'verify_migration gives no row for an active user, although their copy now differs from public');

-- A user who starts in the new app is never migrated over ---------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'r2@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-0000000000e3', 'authenticated', 'authenticated', 'r3@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-0000000000e4', 'authenticated', 'authenticated', 'r4@test.invalid');
select set_config('request.jwt.claims', '{"sub": "d0000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select app.save_profile('it', 'en', 'Europe/Rome')$$, 'a new user sets their profile in the new app');
reset role;

-- E2: the error of one user does not cancel the others. r3 is fine; r4 cannot be migrated: its native language
-- (stamped as migrated, so kept) is the language it learns.
insert into public.vocabulary_items (user_id, language, term, translation, status, box, due_on, review_count, added_on)
values ('d0000000-0000-4000-8000-0000000000e3', 'es', 'bien', 'bien', 'learning', 0, '2031-05-01', 0, '2031-04-30'),
       ('d0000000-0000-4000-8000-0000000000e2', 'es', 'mal', 'mal', 'learning', 0, '2031-05-01', 0, '2031-04-30');
insert into public.user_languages (user_id, language, level, target_level) values
  ('d0000000-0000-4000-8000-0000000000e4', 'es', 'A1', 'A2');
update app.profile set native_language = 'es', legacy_migrated_at = now() where user_id = 'd0000000-0000-4000-8000-0000000000e4';
update public.profiles set time_zone = 'Asia/Tokyo' where id = 'd0000000-0000-4000-8000-0000000000e2';

set local role service_role;
create temporary table r_err on commit drop as select app.migrate_all() as j;
reset role;

select is((select jsonb_array_length(j -> 'errors') from r_err), 1, 'migrate_all reports exactly one error');
select results_eq(
  $$select e ->> 'user_id', e ->> 'sqlstate' from r_err, jsonb_array_elements(j -> 'errors') e$$,
  $$values ('d0000000-0000-4000-8000-0000000000e4', '23514')$$, 'the user and the SQLSTATE of the error');
select is((select count(*)::int from app.card where user_id = 'd0000000-0000-4000-8000-0000000000e3'), 1,
  'the user next to it was migrated all the same');
select is((select count(*)::int from app.card where user_id = 'd0000000-0000-4000-8000-0000000000e2'), 0,
  'the user who saved their profile in app was not migrated over');
select is((select native_language from app.profile where user_id = 'd0000000-0000-4000-8000-0000000000e2'), 'it',
  'and keeps their native language');
select is((select time_zone from app.profile where user_id = 'd0000000-0000-4000-8000-0000000000e2'), 'Europe/Rome',
  'and their time zone');
select is((select count(*)::int from app.enrollment where user_id = 'd0000000-0000-4000-8000-0000000000e4'), 0,
  'nothing of the failed user was written (their changes are rolled back)');

select * from finish();
rollback;
