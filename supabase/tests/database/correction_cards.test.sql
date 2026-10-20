-- pgTAP tests for migration 20261020000100: correction cards are private to their owner.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000ee', 'authenticated', 'authenticated', 'card-a@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000ee', 'authenticated', 'authenticated', 'card-b@test.invalid');

insert into public.sources (id, name, homepage_url)
values ('50000000-0000-4000-8000-0000000000ee', 'Card source', 'https://card.example.com');
insert into public.contents (id, source_id, language, content_type, title, url, difficulty, duration_minutes, summary)
values ('c0000000-0000-4000-8000-0000000000ee', '50000000-0000-4000-8000-0000000000ee', 'ru', 'article', 'RU',
        'https://card.example.com/ru', 'B2', 5, 's');
insert into public.missions (id, user_id, mission_date, budget_minutes, status, generated_at) values
  ('d0000000-0000-4000-8000-0000000000ee', 'a0000000-0000-4000-8000-0000000000ee', '2030-03-01', 30, 'ready', now()),
  ('d0000000-0000-4000-8000-0000000000ff', 'b0000000-0000-4000-8000-0000000000ee', '2030-03-01', 30, 'ready', now());
insert into public.mission_sessions (id, mission_id, user_id, position, language, content_id, production) values
  ('e0000000-0000-4000-8000-0000000000ee', 'd0000000-0000-4000-8000-0000000000ee', 'a0000000-0000-4000-8000-0000000000ee', 0, 'ru', 'c0000000-0000-4000-8000-0000000000ee', '{"mode": "writing", "prompt": "p", "hints": []}'),
  ('e0000000-0000-4000-8000-0000000000ff', 'd0000000-0000-4000-8000-0000000000ff', 'b0000000-0000-4000-8000-0000000000ee', 0, 'ru', 'c0000000-0000-4000-8000-0000000000ee', '{"mode": "writing", "prompt": "p", "hints": []}');

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000ee", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.correction_cards
      (id, user_id, session_id, correction_index, language, original, corrected, explanation, category, due_on, added_on)
    values ('f0000000-0000-4000-8000-0000000000ee', 'a0000000-0000-4000-8000-0000000000ee',
            'e0000000-0000-4000-8000-0000000000ee', 0, 'ru', 'Шум мешают', 'Шум мешает', 'Accord du verbe.', 'verb',
            '2030-03-01', '2030-03-01')$$,
  'a user can add a card on their own session');
select is((select status from public.correction_cards), 'learning', 'a card starts as learning');
select lives_ok(
  $$update public.correction_cards set explanation = 'Accord.' where session_id = 'e0000000-0000-4000-8000-0000000000ee'$$,
  'and edit it');
select throws_ok(
  $$insert into public.correction_cards
      (user_id, session_id, correction_index, language, original, corrected, explanation, due_on, added_on)
    values ('a0000000-0000-4000-8000-0000000000ee', 'e0000000-0000-4000-8000-0000000000ff', 0, 'ru', 'a', 'b', 'c',
            '2030-03-01', '2030-03-01')$$,
  '23503', null, 'a user cannot add a card on the session of another user');
select throws_ok(
  $$insert into public.correction_cards
      (user_id, session_id, correction_index, language, original, corrected, explanation, due_on, added_on)
    values ('a0000000-0000-4000-8000-0000000000ee', 'e0000000-0000-4000-8000-0000000000ee', 0, 'ru', 'a', 'b', 'c',
            '2030-03-01', '2030-03-01')$$,
  '23505', null, 'one card per correction of a session');
select throws_ok(
  $$insert into public.correction_cards
      (user_id, session_id, correction_index, language, original, corrected, explanation, due_on, added_on)
    values ('a0000000-0000-4000-8000-0000000000ee', 'e0000000-0000-4000-8000-0000000000ee', 8, 'ru', 'a', 'b', 'c',
            '2030-03-01', '2030-03-01')$$,
  '23514', null, 'the correction index is between 0 and 7');
select throws_ok(
  $$insert into public.correction_cards
      (user_id, session_id, correction_index, language, original, corrected, explanation, category, due_on, added_on)
    values ('a0000000-0000-4000-8000-0000000000ee', 'e0000000-0000-4000-8000-0000000000ee', 1, 'ru', 'a', 'b', 'c',
            'grammar', '2030-03-01', '2030-03-01')$$,
  '23514', null, 'the category is one of the eight');

-- Review ---------------------------------------------------------------------------------------

select is(
  public.record_correction_review('f0000000-0000-4000-8000-0000000000ee', '2030-03-01', 1::smallint, '2030-03-03', 0),
  true, 'a review with the expected count is applied');
select is(
  (select review_count || '/' || box || '/' || due_on from public.correction_cards),
  '1/1/2030-03-03', 'the state moved on');
select is(
  public.record_correction_review('f0000000-0000-4000-8000-0000000000ee', '2030-03-01', 2::smallint, '2030-03-05', 0),
  false, 'a review with a stale count is refused');
select is((select box from public.correction_cards), 1::smallint, 'and changes nothing');

-- Isolation ------------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "b0000000-0000-4000-8000-0000000000ee", "role": "authenticated"}', true);
select is((select count(*)::int from public.correction_cards), 0, 'another user sees nothing');
select is(
  public.record_correction_review('f0000000-0000-4000-8000-0000000000ee', '2030-03-01', 5::smallint, '2030-04-01', 1),
  false, 'another user cannot review the card');

reset role;
set local role anon;
select throws_ok($$select * from public.correction_cards$$, '42501', null, 'anon cannot read');

reset role;
delete from public.mission_sessions where id = 'e0000000-0000-4000-8000-0000000000ee';
select is((select count(*)::int from public.correction_cards), 0, 'deleting the session deletes its cards');

select * from finish();
rollback;
