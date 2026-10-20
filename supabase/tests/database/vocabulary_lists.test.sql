-- pgTAP tests for migration 20261020000300: vocabulary lists are private to their owner, a word
-- only joins a list of the same user and language, and translation quota claims are atomic and
-- reserved to the service role. Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000dd', 'authenticated', 'authenticated', 'vl-a@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000dd', 'authenticated', 'authenticated', 'vl-b@test.invalid');

insert into public.vocabulary_lists (id, user_id, language, name) values
  ('11000000-0000-4000-8000-0000000000dd', 'a0000000-0000-4000-8000-0000000000dd', 'it', 'Livre A'),
  ('12000000-0000-4000-8000-0000000000dd', 'a0000000-0000-4000-8000-0000000000dd', 'ru', 'Cours russe'),
  ('21000000-0000-4000-8000-0000000000dd', 'b0000000-0000-4000-8000-0000000000dd', 'it', 'Livre B');

-- User A ----------------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000dd", "role": "authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.vocabulary_lists), 2, 'A sees only their own lists');
select lives_ok(
  $$insert into public.vocabulary_items (user_id, language, term, translation, list_id, due_on, added_on)
    values ('a0000000-0000-4000-8000-0000000000dd', 'it', 'ciao', 'salut',
            '11000000-0000-4000-8000-0000000000dd', '2030-03-01', '2030-03-01')$$,
  'A can put a word in their list');
select throws_ok(
  $$insert into public.vocabulary_items (user_id, language, term, translation, list_id, due_on, added_on)
    values ('a0000000-0000-4000-8000-0000000000dd', 'it', 'grazie', 'merci',
            '21000000-0000-4000-8000-0000000000dd', '2030-03-01', '2030-03-01')$$,
  '23503', null, 'A cannot put a word in the list of B');
select throws_ok(
  $$insert into public.vocabulary_items (user_id, language, term, translation, list_id, due_on, added_on)
    values ('a0000000-0000-4000-8000-0000000000dd', 'it', 'prego', 'de rien',
            '12000000-0000-4000-8000-0000000000dd', '2030-03-01', '2030-03-01')$$,
  '23503', null, 'nor in a list of another language');
select throws_ok(
  $$update public.vocabulary_items set list_id = '12000000-0000-4000-8000-0000000000dd' where term = 'ciao'$$,
  '23503', null, 'nor move a word to a list of another language');
select lives_ok(
  $$insert into public.vocabulary_items (user_id, language, term, translation, due_on, added_on)
    values ('a0000000-0000-4000-8000-0000000000dd', 'it', 'senza lista', 'sans liste', '2030-03-01', '2030-03-01')$$,
  'a word needs no list');
select throws_ok(
  $$insert into public.vocabulary_lists (user_id, language, name)
    values ('a0000000-0000-4000-8000-0000000000dd', 'it', 'Livre A')$$,
  '23505', null, 'a list name is unique per user');
select throws_ok(
  $$insert into public.vocabulary_lists (user_id, language, name)
    values ('b0000000-0000-4000-8000-0000000000dd', 'it', 'Volée')$$,
  '42501', null, 'A cannot create a list for B');

-- User B ----------------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-4000-8000-0000000000dd", "role": "authenticated"}', true);

select is((select name from public.vocabulary_lists), 'Livre B', 'B sees only their own list');
update public.vocabulary_lists set name = 'Piraté' where id = '11000000-0000-4000-8000-0000000000dd';
delete from public.vocabulary_lists where id = '11000000-0000-4000-8000-0000000000dd';

-- Back to A: the list survived, deleting it deletes its words.
select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000dd", "role": "authenticated"}', true);
select is((select name from public.vocabulary_lists where id = '11000000-0000-4000-8000-0000000000dd'),
  'Livre A', 'B cannot rename or delete the list of A');
delete from public.vocabulary_lists where id = '11000000-0000-4000-8000-0000000000dd';
select is((select count(*)::int from public.vocabulary_items where term = 'ciao'), 0,
  'deleting a list deletes its words');
select is((select count(*)::int from public.vocabulary_items where term = 'senza lista'), 1,
  'and only its words');

select throws_ok(
  $$select public.claim_vocabulary_translation('a0000000-0000-4000-8000-0000000000dd', '2030-03-01', 1, 200)$$,
  '42501', null, 'a user cannot claim translations themselves');
select throws_ok(
  $$select * from public.vocabulary_translation_usage$$,
  '42501', null, 'nor read the usage table');

-- Quota (service role) --------------------------------------------------------------------------
reset role;
set local role service_role;

select is(public.claim_vocabulary_translation('a0000000-0000-4000-8000-0000000000dd', '2030-03-01', 150, 200),
  true, 'the first claim is accepted');
select is(public.claim_vocabulary_translation('a0000000-0000-4000-8000-0000000000dd', '2030-03-01', 51, 200),
  false, 'a claim past the limit is refused');
select is(public.claim_vocabulary_translation('a0000000-0000-4000-8000-0000000000dd', '2030-03-01', 50, 200),
  true, 'a claim up to the limit is accepted');
select is((select terms from public.vocabulary_translation_usage where user_id = 'a0000000-0000-4000-8000-0000000000dd'),
  200, 'a refused claim counts nothing');
select is(public.claim_vocabulary_translation('a0000000-0000-4000-8000-0000000000dd', '2030-03-02', 0, 200),
  false, 'an empty claim is refused');

select * from finish();
rollback;
