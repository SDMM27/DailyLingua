-- pgTAP tests for app.send_feedback (20261125000200): the new app writes into public.feedback.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (instance_id, id, aud, role, email, is_anonymous) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000f5', 'authenticated', 'authenticated', 'sf-a@test.invalid', false),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000f5', 'authenticated', 'authenticated', 'sf-b@test.invalid', false),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000f5', 'authenticated', 'authenticated', null, true),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-0000000000f5', 'authenticated', 'authenticated', 'sf-d@test.invalid', false);
delete from public.profiles where id = 'd0000000-0000-4000-8000-0000000000f5';

-- Access ------------------------------------------------------------------------------------------------

set local role anon;
select throws_ok($$select app.send_feedback('bug', 'anonyme')$$, '42501', null, 'anon cannot send feedback');
reset role;

select ok((select prosecdef and proconfig = array['search_path=""'] from pg_proc
  where oid = 'app.send_feedback(text, text, text, text)'::regprocedure),
  'it is security definer with an empty search_path');
select ok(has_function_privilege('authenticated', 'app.send_feedback(text, text, text, text)', 'execute')
  and not has_function_privilege('anon', 'app.send_feedback(text, text, text, text)', 'execute')
  and not has_function_privilege('public', 'app.send_feedback(text, text, text, text)', 'execute'),
  'executable by authenticated only');

select set_config('request.jwt.claims', '{}', true);
set local role authenticated;
select throws_ok($$select app.send_feedback('bug', 'sans utilisateur')$$, '28000', null, 'a call without a signed-in user is refused');
reset role;

-- Nominal case ---------------------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "a0000000-0000-4000-8000-0000000000f5", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select app.send_feedback('bug', '  Le bouton ne répond pas  ', '/settings', 'abc1234')$$, 'a user can send feedback');
reset role;
select is((select count(*)::int from public.feedback where user_id = 'a0000000-0000-4000-8000-0000000000f5'
  and category = 'bug' and message = 'Le bouton ne répond pas' and page = '/settings' and app_version = 'abc1234'), 1,
  'it is stored in the name of the user, with the trimmed message, the page and the version');
set local role authenticated;
select lives_ok($$select app.send_feedback('idee', 'sans page ni version')$$, 'page and version are optional');
reset role;
select is((select page is null and app_version is null from public.feedback where message = 'sans page ni version'), true,
  'and stored as null');

-- Validation ---------------------------------------------------------------------------------------------------------

set local role authenticated;
select throws_ok($$select app.send_feedback('inconnue', 'catégorie invalide')$$, '22023', null, 'the category is one of bug, idee, contenu, autre');
select throws_ok($$select app.send_feedback('bug', '   a ')$$, '22023', null, 'a message shorter than 3 characters (after trimming) is refused');
select throws_ok($$select app.send_feedback('bug', repeat('x', 2001))$$, '22023', null, 'a message longer than 2000 characters is refused');
select lives_ok($$select app.send_feedback('autre', repeat('x', 2000))$$, 'a message of exactly 2000 characters is accepted');
select throws_ok($$select app.send_feedback('bug', 'page trop longue', repeat('/', 201))$$, '22023', null, 'the page is limited to 200 characters');
select throws_ok($$select app.send_feedback('bug', 'version trop longue', null, repeat('v', 41))$$, '22023', null, 'the app version is limited to 40 characters');
reset role;

-- Rate limit: 20 per 24 hours, as in the old app ------------------------------------------------------------------------------

-- A has 3 so far (the 2000 characters one included); 17 more reach 20.
set local role authenticated;
select lives_ok(
  $$select app.send_feedback('idee', 'retour numéro ' || i) from generate_series(1, 17) i$$,
  'a user can send up to 20 feedback in 24 hours');
select throws_ok($$select app.send_feedback('idee', 'le vingt et unième')$$, 'DL429', null, 'the 21st within 24 hours is refused');
reset role;

select set_config('request.jwt.claims', '{"sub": "b0000000-0000-4000-8000-0000000000f5", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select app.send_feedback('contenu', 'la limite est par utilisateur')$$, 'the limit is per user');
reset role;

-- Guests and users without a profile ---------------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000f5", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select app.send_feedback('bug', 'un invité peut écrire')$$, 'a guest with a profile can send feedback');
reset role;

select set_config('request.jwt.claims', '{"sub": "d0000000-0000-4000-8000-0000000000f5", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select app.send_feedback('bug', 'sans profil')$$, 'P0002', null, 'a user without a public.profiles row gets a clean error');
reset role;

select * from finish();
rollback;
