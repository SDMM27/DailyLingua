-- pgTAP tests for migration 20261015000200: feedback is write-only for users, limited to 20 per 24 hours.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000fb', 'authenticated', 'authenticated', 'fb-a@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000fb', 'authenticated', 'authenticated', 'fb-b@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000fb', 'authenticated', 'authenticated', 'fb-c@test.invalid');

-- B already sent 20 feedback, but two days ago: they do not count in the 24 hour window.
insert into public.feedback (user_id, category, message, created_at)
select 'b0000000-0000-4000-8000-0000000000fb', 'idee', 'ancien retour ' || i, now() - interval '2 days'
from generate_series(1, 20) i;

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000fb", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.feedback (user_id, category, message, page, app_version)
    values ('a0000000-0000-4000-8000-0000000000fb', 'bug', 'Le bouton ne répond pas', '/mission', 'abc1234')$$,
  'a user can send feedback in their own name');
select throws_ok(
  $$insert into public.feedback (user_id, category, message)
    values ('b0000000-0000-4000-8000-0000000000fb', 'bug', 'au nom de B')$$,
  '42501', null, 'but not in the name of another user');

select throws_ok($$select * from public.feedback$$, '42501', null, 'a user cannot read feedback, not even their own');
select throws_ok($$update public.feedback set message = 'modifié'$$, '42501', null, 'cannot update it');
select throws_ok($$delete from public.feedback$$, '42501', null, 'cannot delete it');

select throws_ok(
  $$insert into public.feedback (user_id, category, message)
    values ('a0000000-0000-4000-8000-0000000000fb', 'inconnue', 'catégorie invalide')$$,
  '23514', null, 'the category is one of bug, idee, contenu, autre');
select throws_ok(
  $$insert into public.feedback (user_id, category, message)
    values ('a0000000-0000-4000-8000-0000000000fb', 'bug', '   a ')$$,
  '23514', null, 'a message shorter than 3 characters (after trimming) is refused');
select throws_ok(
  $$insert into public.feedback (user_id, category, message)
    values ('a0000000-0000-4000-8000-0000000000fb', 'bug', repeat('x', 2001))$$,
  '23514', null, 'a message longer than 2000 characters is refused');
select lives_ok(
  $$insert into public.feedback (user_id, category, message)
    values ('a0000000-0000-4000-8000-0000000000fb', 'autre', repeat('x', 2000))$$,
  'a message of exactly 2000 characters is accepted');
select throws_ok(
  $$insert into public.feedback (user_id, category, message, page)
    values ('a0000000-0000-4000-8000-0000000000fb', 'bug', 'page trop longue', repeat('/', 201))$$,
  '23514', null, 'the page is limited to 200 characters');
select throws_ok(
  $$insert into public.feedback (user_id, category, message, app_version)
    values ('a0000000-0000-4000-8000-0000000000fb', 'bug', 'version trop longue', repeat('v', 41))$$,
  '23514', null, 'the app version is limited to 40 characters');

-- Rate limit: A has sent 2 so far; 18 more reach 20, the 21st is refused with its own SQLSTATE.
select lives_ok(
  $$insert into public.feedback (user_id, category, message)
    select 'a0000000-0000-4000-8000-0000000000fb', 'idee', 'retour numéro ' || i from generate_series(1, 18) i$$,
  'a user can send up to 20 feedback in 24 hours');
select throws_ok(
  $$insert into public.feedback (user_id, category, message)
    values ('a0000000-0000-4000-8000-0000000000fb', 'idee', 'le vingt et unième')$$,
  'DL429', null, 'the 21st within 24 hours is refused');

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-4000-8000-0000000000fb", "role": "authenticated"}', true);
select lives_ok(
  $$insert into public.feedback (user_id, category, message)
    values ('b0000000-0000-4000-8000-0000000000fb', 'contenu', 'les anciens retours ne comptent plus')$$,
  'feedback older than 24 hours does not count, and the limit is per user');

reset role;
set local role anon;
select throws_ok(
  $$insert into public.feedback (user_id, category, message)
    values ('a0000000-0000-4000-8000-0000000000fb', 'bug', 'anonyme')$$,
  '42501', null, 'anon cannot send feedback');

reset role;
select is((select count(*)::int from public.feedback where user_id = 'a0000000-0000-4000-8000-0000000000fb'), 20,
  'the refused inserts left no row (A has exactly 20)');
delete from auth.users where id = 'a0000000-0000-4000-8000-0000000000fb';
select is((select count(*)::int from public.feedback where user_id = 'a0000000-0000-4000-8000-0000000000fb'), 0,
  'deleting the account deletes its feedback');

select * from finish();
rollback;
