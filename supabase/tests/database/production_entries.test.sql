-- pgTAP tests for migration 20261013000800: written production is private to its owner.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000cc', 'authenticated', 'authenticated', 'prod-a@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000cc', 'authenticated', 'authenticated', 'prod-b@test.invalid');

insert into public.sources (id, name, homepage_url)
values ('50000000-0000-4000-8000-0000000000cc', 'Prod source', 'https://prod.example.com');
insert into public.contents (id, source_id, language, content_type, title, url, difficulty, duration_minutes, summary)
values ('c0000000-0000-4000-8000-0000000000cc', '50000000-0000-4000-8000-0000000000cc', 'ru', 'article', 'RU',
        'https://prod.example.com/ru', 'B2', 5, 's');
insert into public.missions (id, user_id, mission_date, budget_minutes, status, generated_at) values
  ('d0000000-0000-4000-8000-0000000000cc', 'a0000000-0000-4000-8000-0000000000cc', '2030-03-01', 30, 'ready', now()),
  ('d0000000-0000-4000-8000-0000000000dd', 'b0000000-0000-4000-8000-0000000000cc', '2030-03-01', 30, 'ready', now());
insert into public.mission_sessions (id, mission_id, user_id, position, language, content_id, production) values
  ('e0000000-0000-4000-8000-0000000000cc', 'd0000000-0000-4000-8000-0000000000cc', 'a0000000-0000-4000-8000-0000000000cc', 0, 'ru', 'c0000000-0000-4000-8000-0000000000cc', '{"mode": "writing", "prompt": "p", "hints": []}'),
  ('e0000000-0000-4000-8000-0000000000dd', 'd0000000-0000-4000-8000-0000000000dd', 'b0000000-0000-4000-8000-0000000000cc', 0, 'ru', 'c0000000-0000-4000-8000-0000000000cc', '{"mode": "writing", "prompt": "p", "hints": []}');

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000cc", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.production_entries (session_id, user_id, body)
    values ('e0000000-0000-4000-8000-0000000000cc', 'a0000000-0000-4000-8000-0000000000cc', 'Привет')$$,
  'a user can write on their own session');
select lives_ok(
  $$update public.production_entries set body = 'Привет, мир' where session_id = 'e0000000-0000-4000-8000-0000000000cc'$$,
  'and edit it');
select is((select body from public.production_entries), 'Привет, мир', 'the edit was saved');
select throws_ok(
  $$insert into public.production_entries (session_id, user_id, body)
    values ('e0000000-0000-4000-8000-0000000000dd', 'a0000000-0000-4000-8000-0000000000cc', 'intrus')$$,
  '23503', null, 'a user cannot write on the session of another user');
select throws_ok(
  $$insert into public.production_entries (session_id, user_id, body)
    values ('e0000000-0000-4000-8000-0000000000cc', 'a0000000-0000-4000-8000-0000000000cc', 'doublon')$$,
  '23505', null, 'one entry per session');
select throws_ok(
  $$update public.production_entries set body = repeat('x', 10001)$$,
  '23514', null, 'the text is limited to 10000 characters');

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-4000-8000-0000000000cc", "role": "authenticated"}', true);
select is((select count(*)::int from public.production_entries), 0, 'another user sees nothing');

reset role;
set local role anon;
select throws_ok($$select * from public.production_entries$$, '42501', null, 'anon cannot read');

select * from finish();
rollback;
