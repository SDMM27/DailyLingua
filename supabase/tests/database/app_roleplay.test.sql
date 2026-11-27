begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'e0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'roleplay-1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'e0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'roleplay-2@test.invalid');

-- Writes are the server's: the service role inserts, a client cannot ----------------------------------------------
select ok(has_table_privilege('authenticated', 'app.roleplay', 'select'), 'a learner can read games');
select ok(not has_any_column_privilege('authenticated', 'app.roleplay', 'insert, update, references')
  and not has_table_privilege('authenticated', 'app.roleplay', 'delete')
  and not has_any_column_privilege('anon', 'app.roleplay', 'select, insert, update'), 'no client write privilege, nothing for anon');

set local role service_role;
insert into app.roleplay (id, user_id, language, scenario_id, level, turns) values
  ('e0000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000001', 'it', 'cafe-order', 'A2', '[{"role":"ai","text":"Buongiorno","translation":"Bonjour","at":"2026-11-26T10:00:00Z"}]'),
  ('e0000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000002', 'ru', 'ask-directions', 'A1', '[]');
select is((select objectives_met from app.roleplay where id = 'e0000000-0000-4000-8000-000000000011'), '{f,f,f}'::boolean[], 'objectives start unreached');
select is((select status from app.roleplay where id = 'e0000000-0000-4000-8000-000000000011'), 'active', 'a game starts active');

-- Constraints -------------------------------------------------------------------------------------------------
select throws_ok($$insert into app.roleplay (user_id, language, scenario_id, level)
  values ('e0000000-0000-4000-8000-000000000001', 'it', 'book-a-room', 'B1')$$, '23505', null, 'one active game per account');
update app.roleplay set status = 'finished' where id = 'e0000000-0000-4000-8000-000000000011';
select lives_ok($$insert into app.roleplay (user_id, language, scenario_id, level, status)
  values ('e0000000-0000-4000-8000-000000000001', 'it', 'book-a-room', 'B1', 'abandoned')$$, 'a finished or abandoned game does not block another');
select throws_ok($$insert into app.roleplay (user_id, language, scenario_id, level, status)
  values ('e0000000-0000-4000-8000-000000000001', 'it', 'Bad_Id', 'B1', 'finished')$$, '23514', null, 'the scenario id has the id format');
select throws_ok($$insert into app.roleplay (user_id, language, scenario_id, level, status)
  values ('e0000000-0000-4000-8000-000000000001', 'it', 'book-a-room', 'B1', 'paused')$$, '23514', null, 'a status is one of three');
select throws_ok($$insert into app.roleplay (user_id, language, scenario_id, level, status)
  values ('e0000000-0000-4000-8000-000000000001', 'it', 'book-a-room', 'D9', 'finished')$$, '23514', null, 'the level is a CEFR level');
select throws_ok($$insert into app.roleplay (user_id, language, scenario_id, level, status, turns)
  values ('e0000000-0000-4000-8000-000000000001', 'it', 'book-a-room', 'B1', 'finished', '{"a":1}')$$, '23514', null, 'turns is an array');
select throws_ok($$insert into app.roleplay (user_id, language, scenario_id, level, status, turns)
  values ('e0000000-0000-4000-8000-000000000001', 'it', 'book-a-room', 'B1', 'finished', (select jsonb_agg('{}'::jsonb) from generate_series(1, 21)))$$, '23514', null, 'turns holds at most 20 entries');
select throws_ok($$insert into app.roleplay (user_id, language, scenario_id, level, status, objectives_met)
  values ('e0000000-0000-4000-8000-000000000001', 'it', 'book-a-room', 'B1', 'finished', '{t,t}')$$, '23514', null, 'there are exactly three objectives');
select throws_ok($$insert into app.roleplay (user_id, language, scenario_id, level, status, review)
  values ('e0000000-0000-4000-8000-000000000001', 'it', 'book-a-room', 'B1', 'finished', '[]')$$, '23514', null, 'a review is an object');
select throws_ok($$insert into app.roleplay (user_id, language, scenario_id, level, status)
  values ('e0000000-0000-4000-8000-000000000001', 'xx', 'book-a-room', 'B1', 'finished')$$, '23503', null, 'the language is a known one');

-- The XP of a game is paid once, whatever the day or the replay -------------------------------------------------
insert into app.xp_ledger (user_id, language, day, amount, reason, meta)
values ('e0000000-0000-4000-8000-000000000001', 'it', current_date, 15, 'roleplay.completed', '{"ref":"e0000000-0000-4000-8000-000000000011"}');
insert into app.xp_ledger (user_id, language, day, amount, reason, meta)
values ('e0000000-0000-4000-8000-000000000001', 'it', current_date + 1, 15, 'roleplay.completed', '{"ref":"e0000000-0000-4000-8000-000000000011","late":true}')
on conflict do nothing;
select is((select count(*)::int from app.xp_ledger where user_id = 'e0000000-0000-4000-8000-000000000001' and reason = 'roleplay.completed'), 1,
  'roleplay.completed is paid once per game');
reset role;

-- RLS: a learner reads their own games only, and cannot write --------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from app.roleplay), 2, 'a learner sees only their own games (2), not the other account''s');
select throws_ok($$update app.roleplay set status = 'finished'$$, '42501', null, 'a learner cannot update a game');
reset role;

select * from finish();
rollback;
