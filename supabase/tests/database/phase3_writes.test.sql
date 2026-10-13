-- pgTAP tests for migration 20261013000700: save_preferences, record_vocabulary_review and
-- the removal of the date defaults of vocabulary_items.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000bb', 'authenticated', 'authenticated', 'writer-a@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000bb', 'authenticated', 'authenticated', 'writer-b@test.invalid');

insert into public.vocabulary_items (id, user_id, language, term, translation, due_on, added_on)
values ('10000000-0000-4000-8000-0000000000bb', 'a0000000-0000-4000-8000-0000000000bb', 'ru', 'мир', 'monde',
        '2030-01-09', '2030-01-01');

insert into public.sources (id, name, homepage_url)
values ('50000000-0000-4000-8000-0000000000bb', 'Writes source', 'https://writes.example.com');
insert into public.contents (id, source_id, language, content_type, title, url, difficulty, duration_minutes, summary)
values ('c0000000-0000-4000-8000-0000000000bb', '50000000-0000-4000-8000-0000000000bb', 'ru', 'article', 'RU',
        'https://writes.example.com/ru', 'B2', 5, 's');
insert into public.missions (id, user_id, mission_date, budget_minutes, status, generated_at)
values ('d0000000-0000-4000-8000-0000000000bb', 'a0000000-0000-4000-8000-0000000000bb', '2030-02-01', 30, 'ready', now());
insert into public.mission_sessions (id, mission_id, user_id, position, language, content_id, questions, production)
values ('e0000000-0000-4000-8000-0000000000bb', 'd0000000-0000-4000-8000-0000000000bb', 'a0000000-0000-4000-8000-0000000000bb',
        0, 'ru', 'c0000000-0000-4000-8000-0000000000bb', '[]', '{"mode": "writing", "prompt": "p", "hints": []}');
insert into public.mission_activities (id, session_id, user_id, position, kind, title, estimated_minutes) values
  ('f0000000-0000-4000-8000-0000000000b1', 'e0000000-0000-4000-8000-0000000000bb', 'a0000000-0000-4000-8000-0000000000bb', 0, 'reading', 'Read', 8),
  ('f0000000-0000-4000-8000-0000000000b2', 'e0000000-0000-4000-8000-0000000000bb', 'a0000000-0000-4000-8000-0000000000bb', 1, 'writing', 'Write', 4);

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000bb", "role": "authenticated"}', true);
set local role authenticated;

-- save_preferences -----------------------------------------------------------------------------

select lives_ok(
  $$select public.save_preferences(45, array['histoire'], array['article'], 'challenge', '06:30', 'America/New_York',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 5},
      {"language": "it", "level": "B1", "target_level": "B2", "focus": "parler", "weight": 2}]')$$,
  'a user without languages can save preferences (onboarding)');

select is((select count(*)::int from public.user_languages), 2, 'both languages were saved');
select is(
  (select daily_minutes::text || ' ' || time_zone || ' ' || generation_time::text from public.profiles),
  '45 America/New_York 06:30:00', 'the profile was updated in the same call');

select lives_ok(
  $$select public.save_preferences(45, array['histoire'], array['article'], 'challenge', '06:30', 'America/New_York',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 5},
      {"language": "it", "level": "B2", "target_level": "C1", "focus": "", "weight": 2},
      {"language": "es", "level": "A2", "target_level": "B1", "focus": "", "weight": 1},
      {"language": "de", "level": "A1", "target_level": "A2", "focus": "", "weight": 1}]')$$,
  'goals can grow to four languages');

select lives_ok(
  $$select public.save_preferences(45, array['histoire'], array['article'], 'challenge', '06:30', 'America/New_York',
    '[{"language": "ru", "level": "C1", "target_level": "C2", "focus": "", "weight": 5},
      {"language": "it", "level": "B2", "target_level": "C1", "focus": "", "weight": 2},
      {"language": "es", "level": "A2", "target_level": "B1", "focus": "", "weight": 1},
      {"language": "de", "level": "A1", "target_level": "A2", "focus": "", "weight": 1}]')$$,
  'a user with four languages can still update them');
select is((select level from public.user_languages where language = 'ru'), 'C1', 'the existing language was updated');

select lives_ok(
  $$select public.save_preferences(30, array['histoire'], array['article'], 'matched', '07:00', 'Europe/Paris',
    '[{"language": "it", "level": "B2", "target_level": "C1", "focus": "", "weight": 5}]')$$,
  'languages missing from the new list are removed');
select is((select string_agg(language, ',') from public.user_languages), 'it', 'only the kept language remains');

select throws_ok(
  $$select public.save_preferences(30, array['histoire'], array['article'], 'matched', '07:00', 'Europe/Paris', '[]')$$,
  '23514', null, 'at least one language is required');
select throws_ok(
  $$select public.save_preferences(30, array['histoire'], array['article'], 'matched', '07:00', 'Europe/Paris',
    '[{"language": "ru", "level": "B2", "target_level": "C1", "focus": "", "weight": 1},
      {"language": "it", "level": "B2", "target_level": "C1", "focus": "", "weight": 1},
      {"language": "es", "level": "B2", "target_level": "C1", "focus": "", "weight": 1},
      {"language": "de", "level": "B2", "target_level": "C1", "focus": "", "weight": 1},
      {"language": "en", "level": "B2", "target_level": "C1", "focus": "", "weight": 1}]')$$,
  '23514', null, 'five languages are rejected');
select throws_ok(
  $$select public.save_preferences(30, array['histoire'], array['article'], 'matched', '07:00', 'Mars/Olympus',
    '[{"language": "it", "level": "B2", "target_level": "C1", "focus": "", "weight": 5}]')$$,
  '22023', null, 'an unknown time zone is rejected');

-- record_vocabulary_review ---------------------------------------------------------------------

select is(
  public.record_vocabulary_review('10000000-0000-4000-8000-0000000000bb', 'good', '2030-01-10', 1::smallint, '2030-01-12', 0),
  true, 'a review is recorded');
select is(
  (select box::text || ' ' || due_on::text || ' ' || last_reviewed_on::text || ' ' || review_count::text
   from public.vocabulary_items),
  '1 2030-01-12 2030-01-10 1', 'the word moved to its new state with the dates given by the app');
select is(
  (select box_before::text || '>' || box_after::text || ' ' || reviewed_on::text from public.vocabulary_reviews),
  '0>1 2030-01-10', 'the journal got one entry with the previous box');
select is(
  public.record_vocabulary_review('10000000-0000-4000-8000-0000000000bb', 'good', '2030-01-10', 2::smallint, '2030-01-14', 0),
  false, 'replaying the same review (stale review count) changes nothing');

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-4000-8000-0000000000bb", "role": "authenticated"}', true);
select is(
  public.record_vocabulary_review('10000000-0000-4000-8000-0000000000bb', 'easy', '2030-01-10', 3::smallint, '2030-01-20', 1),
  false, 'another user cannot review the word');

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000bb", "role": "authenticated"}', true);
select is((select review_count from public.vocabulary_items), 1, 'the word was reviewed exactly once');

-- Mission progress ------------------------------------------------------------------------------

select is((select started_at from public.missions), null, 'a mission starts untouched');

insert into public.activity_progress (activity_id, user_id, completed_at)
values ('f0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-0000000000bb', now());
select is(
  (select (started_at is not null)::text || ' ' || (completed_at is null)::text from public.missions),
  'true true', 'the first completed activity starts the mission');

insert into public.activity_progress (activity_id, user_id, completed_at)
values ('f0000000-0000-4000-8000-0000000000b2', 'a0000000-0000-4000-8000-0000000000bb', now());
select isnt((select completed_at from public.missions), null, 'completing every activity completes the mission');

update public.activity_progress set completed_at = null where activity_id = 'f0000000-0000-4000-8000-0000000000b2';
select is((select completed_at from public.missions), null, 'unticking an activity reopens the mission');
select isnt((select started_at from public.missions), null, 'started_at is kept');

-- Dates are never defaulted -----------------------------------------------------------------------

select throws_ok(
  $$insert into public.vocabulary_items (user_id, language, term, translation)
    values ('a0000000-0000-4000-8000-0000000000bb', 'ru', 'слово', 'mot')$$,
  '23502', null, 'a word cannot be added without explicit dates');

reset role;
set local role anon;
select throws_ok(
  $$select public.record_vocabulary_review('10000000-0000-4000-8000-0000000000bb', 'good', '2030-01-10', 1::smallint, '2030-01-12', 1)$$,
  '42501', null, 'anon cannot call the review function');

select * from finish();
rollback;
