-- pgTAP tests for the shared graded texts (migration 20261117000100): who reads what, answer keys
-- closed to every client role, constraints. Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid');

-- Two texts (one published, one only checked), each with one item and its key.
insert into app.text (id, language, level_band, density, theme, prompt_version, title, body, word_count, status) values
  ('c0000000-0000-4000-8000-000000000101', 'it', 'B1', 2, 'voyage', 'v1', 'Un viaggio', 'Testo pubblicato.', 3, 'published'),
  ('c0000000-0000-4000-8000-000000000102', 'it', 'B1', 2, 'cucina', 'v1', 'La cucina', 'Testo non pubblicato.', 3, 'checked');
insert into app.text_item (id, text_id, step, kind, position, prompt) values
  ('c0000000-0000-4000-8000-000000000201', 'c0000000-0000-4000-8000-000000000101', 'reading', 'mcq', 0, '{"q": "Dove?", "options": ["a", "b"]}'),
  ('c0000000-0000-4000-8000-000000000202', 'c0000000-0000-4000-8000-000000000102', 'reading', 'mcq', 0, '{"q": "Cosa?", "options": ["a", "b"]}');
insert into app.text_item_key (item_id, answer, accept) values
  ('c0000000-0000-4000-8000-000000000201', '"a"', '[]'),
  ('c0000000-0000-4000-8000-000000000202', '"b"', '["b "]');
insert into app.text_read (user_id, text_id, first_read_day) values
  ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000101', '2030-01-01'),
  ('c0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-000000000101', '2030-01-02');

-- Structure -------------------------------------------------------------------------------------------

select is((select count(*)::int from pg_tables where schemaname = 'app' and tablename in ('text', 'text_item', 'text_item_key', 'text_read') and rowsecurity),
  4, 'RLS is enabled on the four tables');
select is(
  (select count(*)::int from pg_class t
   where t.relnamespace = 'app'::regnamespace and t.relname = 'text_item_key'
     and (has_any_column_privilege('authenticated', t.oid, 'select, insert, update, references')
       or has_any_column_privilege('anon', t.oid, 'select, insert, update, references'))),
  0, 'text_item_key has no privilege for any client role');
select is(
  (select count(*)::int from pg_policy where polrelid = 'app.text_item_key'::regclass),
  0, 'text_item_key has no policy');

-- anon ------------------------------------------------------------------------------------------------

set local role anon;
select throws_ok($$select count(*) from app.text$$, '42501', null, 'anon cannot read text');
select throws_ok($$select count(*) from app.text_item$$, '42501', null, 'anon cannot read text_item');
reset role;

-- authenticated ---------------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from app.text), 1, 'a client reads the published text only');
select is((select id from app.text), 'c0000000-0000-4000-8000-000000000101'::uuid, 'and it is the published one');
select is((select count(*)::int from app.text_item), 1, 'a client reads the items of the published text only');
select is((select id from app.text_item), 'c0000000-0000-4000-8000-000000000201'::uuid, 'and it is the item of the published text');
select throws_ok($$select count(*) from app.text_item_key$$, '42501', null, 'the answer keys are unreadable by a client');
select throws_ok($$select answer from app.text_item_key$$, '42501', null, 'not even one column of them');
select is((select count(*)::int from app.text_read), 1, 'text_read: own row only');
select is((select user_id from app.text_read), 'c0000000-0000-4000-8000-0000000000a1'::uuid, 'and it is theirs');

select throws_ok($$insert into app.text (language, level_band, density, theme, prompt_version, title, body, word_count)
  values ('it', 'B1', 1, 'x', 'v1', 't', 'b', 1)$$, '42501', null, 'a client cannot insert a text');
select throws_ok($$update app.text set status = 'published'$$, '42501', null, 'a client cannot publish a text');
select throws_ok($$insert into app.text_read (user_id, text_id, first_read_day)
  values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000102', '2030-01-03')$$,
  '42501', null, 'a client cannot write text_read');
select throws_ok($$delete from app.text_item$$, '42501', null, 'a client cannot delete an item');

reset role;

-- A text published afterwards becomes readable; one retired stops being readable.
update app.text set status = 'published' where id = 'c0000000-0000-4000-8000-000000000102';
update app.text set status = 'retired' where id = 'c0000000-0000-4000-8000-000000000101';
select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a2", "role": "authenticated"}', true);
set local role authenticated;
select is((select id from app.text), 'c0000000-0000-4000-8000-000000000102'::uuid, 'the visibility follows the status');
select is((select id from app.text_item), 'c0000000-0000-4000-8000-000000000202'::uuid, 'the items follow the status of their text');
reset role;

-- service_role -----------------------------------------------------------------------------------------

set local role service_role;
select is((select count(*)::int from app.text_item_key), 2, 'service_role reads the keys');
select lives_ok($$update app.text_item_key set accept = '["a", "A"]' where item_id = 'c0000000-0000-4000-8000-000000000201'$$,
  'service_role updates a key');

-- Constraints (service_role is not above them) ------------------------------------------------------------

select throws_ok($$insert into app.text (language, level_band, density, theme, prompt_version, title, body, word_count)
  values ('it', 'C2', 1, 'x', 'v1', 't', 'b', 1)$$, '23514', null, 'C2 is not a band of text (C1 serves it)');
select throws_ok($$insert into app.text (language, level_band, density, theme, prompt_version, title, body, word_count)
  values ('it', 'B1', 4, 'x', 'v1', 't', 'b', 1)$$, '23514', null, 'density goes from 1 to 3');
select throws_ok($$insert into app.text (language, level_band, density, theme, prompt_version, title, body, word_count)
  values ('it', 'B1', 1, 'x', 'v1', 't', repeat('a', 8001), 1)$$, '23514', null, 'a body is at most 8000 characters');
select throws_ok($$insert into app.text (language, level_band, density, theme, prompt_version, title, body, word_count, status)
  values ('it', 'B1', 1, 'x', 'v1', 't', 'b', 1, 'draft')$$, '23514', null, 'status is a closed list');
select throws_ok($$insert into app.text (language, level_band, density, theme, prompt_version, title, body, word_count)
  values ('it', 'B1', 2, 'voyage', 'v1', 'autre', 'b', 1)$$, '23505', null, 'the sharing key is unique (variant 1 already used)');
select lives_ok($$insert into app.text (language, level_band, density, theme, prompt_version, variant, title, body, word_count)
  values ('it', 'B1', 2, 'voyage', 'v1', 2, 'autre', 'b', 1)$$, 'a second variant is accepted');
select throws_ok($$insert into app.text_item (text_id, step, kind, position, prompt)
  values ('c0000000-0000-4000-8000-000000000101', 'reading', 'mcq', 0, '{}')$$, '23505', null, 'a position is used once per text and step');
select throws_ok($$insert into app.text_item (text_id, step, kind, position, prompt)
  values ('c0000000-0000-4000-8000-000000000101', 'expression', 'mcq', 1, '{}')$$, '23514', null, 'an item belongs to reading or workshop');

-- Deleting a text removes its items and their keys.
select lives_ok($$delete from app.text_read where text_id = 'c0000000-0000-4000-8000-000000000102'$$, 'no read of the second text');
select lives_ok($$delete from app.text where id = 'c0000000-0000-4000-8000-000000000102'$$, 'a text without read can be deleted');
select is((select count(*)::int from app.text_item_key where item_id = 'c0000000-0000-4000-8000-000000000202'), 0,
  'its item and key went with it');

reset role;
select * from finish();
rollback;
