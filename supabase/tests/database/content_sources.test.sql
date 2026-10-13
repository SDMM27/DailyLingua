-- pgTAP tests: phase 4 sources (feed definition, licence) and content metadata.
-- Run with `npm run db:test` (supabase test db). Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a4000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'p4@test.invalid');

-- Languages --------------------------------------------------------------------------------

select ok(
  (select count(*) = 19 from public.languages
   where code in ('ru', 'it', 'es', 'de', 'en', 'pt', 'nl', 'sv', 'pl', 'cs', 'uk', 'ro', 'el', 'tr', 'ar', 'zh', 'ja', 'ko', 'id')),
  'the 19 study languages exist'
);

-- Sources ----------------------------------------------------------------------------------

select lives_ok(
  $$insert into public.sources (name, homepage_url) values ('Manual', 'https://manual.example')$$,
  'a manual source (no key) needs no feed definition'
);

select throws_ok(
  $$insert into public.sources (key, name, homepage_url, language, feed_url, content_type)
    values ('incomplete', 'Incomplete', 'https://incomplete.example', 'it', 'https://incomplete.example/feed', 'article')$$,
  '23514', null, 'a feed source without its licence is rejected'
);

select lives_ok(
  $$insert into public.sources (id, key, name, homepage_url, language, feed_url, content_type,
      license_kind, license_name, terms_url, license_verified_on)
    values ('54000000-0000-4000-8000-000000000001', 'complete', 'Complete', 'https://complete.example', 'it',
      'https://complete.example/feed', 'article', 'all-rights-reserved', 'Tous droits réservés',
      'https://complete.example/terms', '2026-10-13')$$,
  'a complete feed source is accepted'
);

select is(
  (select commercial_use from public.sources where key = 'complete'), false,
  'commercial use is not assumed'
);

select throws_ok(
  $$insert into public.sources (key, name, homepage_url, language, feed_url, content_type,
      license_kind, license_name, terms_url, license_verified_on)
    values ('plain-http', 'Plain', 'https://plain.example', 'it', 'http://plain.example/feed', 'article',
      'cc-by', 'CC BY', 'https://plain.example/terms', '2026-10-13')$$,
  '23514', null, 'feeds are fetched over https only'
);

select throws_ok(
  $$insert into public.sources (key, name, homepage_url) values ('Bad Key', 'Bad', 'https://bad.example')$$,
  '23514', null, 'keys are kebab-case'
);

select throws_ok(
  $$insert into public.sources (name, homepage_url, license_kind) values ('Odd', 'https://odd.example', 'gpl')$$,
  '23514', null, 'unknown licence kinds are rejected'
);

-- Contents ---------------------------------------------------------------------------------

select throws_ok(
  $$insert into public.contents (source_id, language, content_type, title, url, difficulty, duration_minutes, summary, categories)
    values ('54000000-0000-4000-8000-000000000001', 'it', 'article', 'T', 'https://complete.example/1', 'B1', 3, 's',
      array['1','2','3','4','5','6','7','8','9','10','11'])$$,
  '23514', null, 'at most 10 categories per content'
);

select lives_ok(
  $$insert into public.contents (source_id, language, content_type, title, url, difficulty, duration_minutes, summary, author, categories)
    values ('54000000-0000-4000-8000-000000000001', 'it', 'article', 'T', 'https://complete.example/1', 'B1', 3, 's',
      'Autore', array['Cultura'])$$,
  'a content with author and categories is accepted'
);

-- Signed-in users read the catalogue but never write it -----------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "a4000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

select is(
  (select license_kind from public.sources where key = 'complete'), 'all-rights-reserved',
  'a signed-in user can read the licence of a source'
);

select throws_ok(
  $$update public.sources set commercial_use = true where key = 'complete'$$,
  '42501', null, 'a signed-in user cannot change a licence'
);

select * from finish();
rollback;
