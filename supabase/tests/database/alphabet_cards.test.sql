-- pgTAP tests for migration 20261021000200: alphabet cards are private to their owner and
-- record_alphabet_practice creates or moves a card atomically.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000aa', 'authenticated', 'authenticated', 'alphabet-a@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000aa', 'authenticated', 'authenticated', 'alphabet-b@test.invalid');

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000aa", "role": "authenticated"}', true);
set local role authenticated;

-- Creation -------------------------------------------------------------------------------------

select is(
  public.record_alphabet_practice('ru-alphabet-2', 'ru', '2030-03-01', 1::smallint, '2030-03-03', null),
  true, 'a first practice creates the card');
select is(
  (select status || '/' || box || '/' || due_on || '/' || review_count || '/' || added_on || '/' || last_reviewed_on
   from public.alphabet_cards),
  'learning/1/2030-03-03/1/2030-03-01/2030-03-01', 'with the state given by the app');
select is(
  public.record_alphabet_practice('ru-alphabet-2', 'ru', '2030-03-01', 1::smallint, '2030-03-03', null),
  false, 'creating it again is refused');
select is((select count(*)::int from public.alphabet_cards), 1, 'and leaves a single card');

-- Review ---------------------------------------------------------------------------------------

select is(
  public.record_alphabet_practice('ru-alphabet-2', 'ru', '2030-03-03', 2::smallint, '2030-03-07', 1),
  true, 'a review with the expected count is applied');
select is(
  (select review_count || '/' || box || '/' || due_on || '/' || last_reviewed_on from public.alphabet_cards),
  '2/2/2030-03-07/2030-03-03', 'the state moved on');
select is(
  public.record_alphabet_practice('ru-alphabet-2', 'ru', '2030-03-03', 3::smallint, '2030-03-11', 1),
  false, 'a review with a stale count is refused');
select is((select box from public.alphabet_cards), 2::smallint, 'and changes nothing');
select is(
  public.record_alphabet_practice('ru-alphabet-3', 'ru', '2030-03-03', 3::smallint, '2030-03-11', 1),
  false, 'a review of a group without a card is refused');

-- Constraints ----------------------------------------------------------------------------------

select throws_ok(
  $$insert into public.alphabet_cards (user_id, group_id, language, due_on, added_on)
    values ('a0000000-0000-4000-8000-0000000000aa', 'Alphabet', 'ru', '2030-03-01', '2030-03-01')$$,
  '23514', null, 'the group id has the expected shape');
select throws_ok(
  $$insert into public.alphabet_cards (user_id, group_id, language, due_on, added_on)
    values ('a0000000-0000-4000-8000-0000000000aa', 'xx-alphabet-1', 'xx', '2030-03-01', '2030-03-01')$$,
  '23503', null, 'the language must exist');
select throws_ok(
  $$insert into public.alphabet_cards (user_id, group_id, language, due_on, added_on)
    values ('b0000000-0000-4000-8000-0000000000aa', 'ru-alphabet-1', 'ru', '2030-03-01', '2030-03-01')$$,
  '42501', null, 'a user cannot add a card for another user');

-- Isolation ------------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-4000-8000-0000000000aa", "role": "authenticated"}', true);
select is((select count(*)::int from public.alphabet_cards), 0, 'another user sees nothing');
select is(
  public.record_alphabet_practice('ru-alphabet-2', 'ru', '2030-03-03', 5::smallint, '2030-04-01', 2),
  false, 'another user cannot review the card');
select is(
  public.record_alphabet_practice('ru-alphabet-2', 'ru', '2030-03-03', 1::smallint, '2030-03-05', null),
  true, 'but has their own card for the same group');

reset role;
set local role anon;
select throws_ok($$select * from public.alphabet_cards$$, '42501', null, 'anon cannot read');

reset role;
delete from auth.users where id = 'a0000000-0000-4000-8000-0000000000aa';
select is(
  (select count(*)::int from public.alphabet_cards where user_id = 'a0000000-0000-4000-8000-0000000000aa'),
  0, 'deleting the account deletes its cards');

select * from finish();
rollback;
