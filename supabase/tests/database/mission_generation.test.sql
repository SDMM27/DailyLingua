-- pgTAP tests for migration 20261013001000: claiming, completing and failing a mission generation.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000ee', 'authenticated', 'authenticated', 'gen-a@test.invalid');

insert into public.sources (id, name, homepage_url)
values ('50000000-0000-4000-8000-0000000000ee', 'Gen source', 'https://gen.example.com');
insert into public.contents (id, source_id, language, content_type, title, url, difficulty, duration_minutes, summary) values
  ('c0000000-0000-4000-8000-0000000000e1', '50000000-0000-4000-8000-0000000000ee', 'ru', 'article', 'RU',
   'https://gen.example.com/ru', 'B2', 5, 's'),
  ('c0000000-0000-4000-8000-0000000000e2', '50000000-0000-4000-8000-0000000000ee', 'it', 'podcast', 'IT',
   'https://gen.example.com/it', 'B1', 4, 's');

-- Users cannot generate missions ------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000ee", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select * from public.claim_mission_generation('a0000000-0000-4000-8000-0000000000ee', '2030-04-01', 30)$$,
  '42501', null, 'a user cannot claim a generation');
select throws_ok(
  $$select public.complete_mission_generation(gen_random_uuid(), '[]', '{}')$$,
  '42501', null, 'a user cannot write a generated mission');
select throws_ok(
  $$select public.fail_mission_generation(gen_random_uuid(), 'x')$$,
  '42501', null, 'a user cannot fail a generation');
reset role;
set local role service_role;

-- Claim ---------------------------------------------------------------------------------------

create temporary table claim1 on commit drop as
  select * from public.claim_mission_generation('a0000000-0000-4000-8000-0000000000ee', '2030-04-01', 30);
select is((select claimed from claim1), true, 'the first request claims the generation');
select is((select status from claim1), 'generating', 'the mission is generating');
select is(
  (select generation_attempts from public.missions where id = (select mission_id from claim1)), 1::smallint,
  'first attempt counted');

select is(
  (select claimed from public.claim_mission_generation('a0000000-0000-4000-8000-0000000000ee', '2030-04-01', 30)),
  false, 'a second request while generating does not claim it');

-- Complete ------------------------------------------------------------------------------------

select throws_ok(
  format($$select public.complete_mission_generation(%L, '[]', '{}')$$, (select mission_id from claim1)),
  '23514', null, 'a mission without session is rejected');
select throws_ok(
  format($$select public.complete_mission_generation(%L, %L, '{}')$$, (select mission_id from claim1),
    '[{"language": "ru", "contentId": "c0000000-0000-4000-8000-0000000000e2", "production": {"mode": "writing"},
       "activities": [{"kind": "reading", "title": "Lire", "estimatedMinutes": 5}]}]'),
  '23503', null, 'a session on a content of another language is rejected');
select throws_ok(
  format($$select public.complete_mission_generation(%L, %L, '{}')$$, (select mission_id from claim1),
    '[{"language": "ru", "contentId": "c0000000-0000-4000-8000-0000000000e1", "production": {"mode": "writing"},
       "activities": [{"kind": "dancing", "title": "Danser", "estimatedMinutes": 5}]}]'),
  '23514', null, 'an unknown activity kind is rejected');
select throws_ok(
  format($$select public.complete_mission_generation(%L, %L, '{}')$$, (select mission_id from claim1),
    '[{"language": "ru", "contentId": "c0000000-0000-4000-8000-0000000000e1", "production": {"mode": "writing"},
       "activities": []}]'),
  '23514', null, 'a session without activity is rejected');
select is(
  (select count(*)::int from public.mission_sessions where mission_id = (select mission_id from claim1)), 0,
  'a rejected call writes nothing');

select lives_ok(
  format($$select public.complete_mission_generation(%L, %L, '{"source": "template"}')$$, (select mission_id from claim1),
    '[{"language": "ru", "contentId": "c0000000-0000-4000-8000-0000000000e1",
       "questions": [{"id": "ru-q1", "prompt": "?", "options": ["a", "b", "c"], "answerIndex": 2, "explanation": "e"}],
       "expressions": [], "production": {"mode": "writing", "prompt": "p", "hints": []},
       "activities": [{"kind": "reading", "title": "Lire", "estimatedMinutes": 5},
                      {"kind": "comprehension", "title": "Questions", "estimatedMinutes": 3}]},
      {"language": "it", "contentId": "c0000000-0000-4000-8000-0000000000e2",
       "production": {"mode": "speaking", "prompt": "p", "hints": []},
       "activities": [{"kind": "listening", "title": "Écouter", "estimatedMinutes": 4}]}]'),
  'a valid mission is written');
select is(
  (select status from public.missions where id = (select mission_id from claim1)), 'ready', 'the mission is ready');
select isnt(
  (select generated_at from public.missions where id = (select mission_id from claim1)), null, 'generated_at is set');
select is(
  (select generation_meta from public.missions where id = (select mission_id from claim1)), '{"source": "template"}'::jsonb,
  'the trace is stored');
select is(
  (select array_agg(language order by position) from public.mission_sessions where mission_id = (select mission_id from claim1)),
  array['ru', 'it'], 'sessions are written in order');
select is(
  (select array_agg(a.kind order by a.position) from public.mission_activities a
   join public.mission_sessions s on s.id = a.session_id
   where s.mission_id = (select mission_id from claim1) and s.language = 'ru'),
  array['reading', 'comprehension'], 'activities are written in order');
select throws_ok(
  format($$select public.complete_mission_generation(%L, %L, '{}')$$, (select mission_id from claim1),
    '[{"language": "it", "contentId": "c0000000-0000-4000-8000-0000000000e2", "production": {"mode": "speaking"},
       "activities": [{"kind": "listening", "title": "Écouter", "estimatedMinutes": 4}]}]'),
  '55000', null, 'a ready mission cannot be overwritten');
select is(
  (select claimed from public.claim_mission_generation('a0000000-0000-4000-8000-0000000000ee', '2030-04-01', 30)),
  false, 'a ready mission is not claimed again');

-- Fail and retry ------------------------------------------------------------------------------

create temporary table claim2 on commit drop as
  select * from public.claim_mission_generation('a0000000-0000-4000-8000-0000000000ee', '2030-04-02', 20);
select lives_ok(
  format($$select public.fail_mission_generation(%L, 'model unavailable')$$, (select mission_id from claim2)),
  'failure recorded: model unavailable');
select is(
  (select status || ':' || generation_error from public.missions where id = (select mission_id from claim2)),
  'failed:model unavailable', 'a failure is recorded');

select is(
  (select claimed from public.claim_mission_generation('a0000000-0000-4000-8000-0000000000ee', '2030-04-02', 20)),
  true, 'a failed generation can be retried');
select lives_ok(
  format($$select public.fail_mission_generation(%L, 'again')$$, (select mission_id from claim2)),
  'failure recorded: again');
select is(
  (select claimed from public.claim_mission_generation('a0000000-0000-4000-8000-0000000000ee', '2030-04-02', 20)),
  true, 'third attempt');
select lives_ok(
  format($$select public.fail_mission_generation(%L, 'and again')$$, (select mission_id from claim2)),
  'failure recorded: and again');
select is(
  (select claimed::text || ':' || status from public.claim_mission_generation('a0000000-0000-4000-8000-0000000000ee', '2030-04-02', 20)),
  'false:failed', 'no fourth attempt on the same day');

-- An abandoned generation (no completion, no failure) is taken over once it is stale.
create temporary table claim3 on commit drop as
  select * from public.claim_mission_generation('a0000000-0000-4000-8000-0000000000ee', '2030-04-03', 20);
select is(
  (select claimed from public.claim_mission_generation('a0000000-0000-4000-8000-0000000000ee', '2030-04-03', 20, 3, interval '0 seconds')),
  true, 'a stale generation is taken over');

select * from finish();
rollback;
