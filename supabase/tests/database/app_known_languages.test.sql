begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', '184ebe1e-98ac-4f36-8eb2-2dd94e6912fd', 'authenticated', 'authenticated', 'known-languages-one@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'f422e032-4f32-4d46-a3dc-edd391ad6107', 'authenticated', 'authenticated', 'known-languages-two@test.invalid');

set local role anon;
select throws_ok($$select app.save_known_languages(array['es'])$$, '42501', null, 'anonymous access is denied');
reset role;

set local role authenticated;
select throws_ok($$select app.save_known_languages(array['es'])$$, '42501', null, 'the role also requires a user');
select set_config('request.jwt.claims', '{"sub":"184ebe1e-98ac-4f36-8eb2-2dd94e6912fd","role":"authenticated"}', true);
select is((select known_languages from app.profile), array[]::text[], 'a new account starts with no known languages');
select throws_ok($$select app.save_known_languages(array['es', 'es'])$$, '22023', null, 'duplicates are rejected');
select throws_ok($$select app.save_known_languages(array['es', null])$$, '22023', null, 'null codes are rejected');
select throws_ok($$select app.save_known_languages(array_fill('es'::text, array[17]))$$, '22023', null, 'oversized lists are rejected');
select lives_ok($$select app.save_known_languages(array['es', 'eu'])$$, 'a language outside the target registry can be saved');
select is((select known_languages from app.profile), array['es', 'eu'], 'the list is stored on the caller profile');
select lives_ok($$select app.save_known_languages(array[]::text[])$$, 'the learner can clear the whole list');
reset role;
select is((select count(*) from app.profile
  where user_id in ('184ebe1e-98ac-4f36-8eb2-2dd94e6912fd', 'f422e032-4f32-4d46-a3dc-edd391ad6107')
  and known_languages = array[]::text[]), 2::bigint, 'clearing takes effect and the other profile stays empty');
select * from finish();
rollback;
