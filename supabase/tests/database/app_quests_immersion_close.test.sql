-- pgTAP tests for the quests and the closed days of immersion (migrations 20261128000100 and 20261128000200):
-- RLS, no client write, append-only closing, the 6 XP cap, replay without double credit, the immersionXp switch,
-- complete_quest crediting once, reroll once a day, the new game settings keys. Run with `npm run db:test`.
-- Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid');

insert into app.immersion_entry (user_id, language, day, minutes, kind) values
  ('c0000000-0000-4000-8000-0000000000a1', 'it', current_date - 10, 45, 'video'),
  ('c0000000-0000-4000-8000-0000000000a1', 'fr', current_date - 10, 30, 'audio'),
  ('c0000000-0000-4000-8000-0000000000a1', 'it', current_date - 9, 9, 'video'),
  ('c0000000-0000-4000-8000-0000000000a1', 'it', current_date - 5, 25, 'video'),
  ('c0000000-0000-4000-8000-0000000000a1', 'it', current_date - 1, 100, 'video'),
  ('c0000000-0000-4000-8000-0000000000a2', 'it', current_date - 10, 20, 'video');

insert into app.quest_assignment (id, user_id, period, period_start, slot, quest_id, target, catalog_version) values
  ('c0000000-0000-4000-8000-000000000201', 'c0000000-0000-4000-8000-0000000000a1', 'day', current_date - 1, 1, 'read_2', 2, 'quests.v1'),
  ('c0000000-0000-4000-8000-000000000202', 'c0000000-0000-4000-8000-0000000000a1', 'day', current_date - 1, 2, 'session_1', 1, 'quests.v1'),
  ('c0000000-0000-4000-8000-000000000203', 'c0000000-0000-4000-8000-0000000000a1', 'week', current_date - 6, 1, 'roleplay_week', 1, 'quests.v1'),
  ('c0000000-0000-4000-8000-000000000204', 'c0000000-0000-4000-8000-0000000000a2', 'day', current_date - 1, 1, 'read_2', 2, 'quests.v1');

-- Structure and privileges ----------------------------------------------------------------------------

select is((select count(*)::int from pg_tables where schemaname = 'app' and tablename in ('immersion_close', 'quest_assignment') and rowsecurity), 2,
  'RLS is enabled on both tables');
select ok(not has_function_privilege('authenticated', 'app.close_immersion_days(uuid, date)', 'execute')
  and not has_function_privilege('anon', 'app.close_immersion_days(uuid, date)', 'execute')
  and has_function_privilege('service_role', 'app.close_immersion_days(uuid, date)', 'execute'),
  'close_immersion_days: service_role only');
select ok(not has_function_privilege('authenticated', 'app.complete_quest(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'app.complete_quest(uuid, text)', 'execute')
  and has_function_privilege('service_role', 'app.complete_quest(uuid, text)', 'execute'),
  'complete_quest: service_role only');
select ok(not has_function_privilege('authenticated', 'app.reroll_quest(uuid, uuid, text, smallint, text)', 'execute')
  and has_function_privilege('service_role', 'app.reroll_quest(uuid, uuid, text, smallint, text)', 'execute'),
  'reroll_quest: service_role only');

-- authenticated ---------------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from app.quest_assignment), 3, 'a client reads its own quests only');
select throws_ok($$insert into app.quest_assignment (user_id, period, period_start, slot, quest_id, target, catalog_version)
  values ('c0000000-0000-4000-8000-0000000000a1', 'day', current_date, 1, 'read_2', 2, 'quests.v1')$$, '42501', null, 'a client cannot insert a quest');
select throws_ok($$update app.quest_assignment set completed_at = now()$$, '42501', null, 'a client cannot complete a quest');
select throws_ok($$select app.close_immersion_days('c0000000-0000-4000-8000-0000000000a1', current_date - 4)$$, '42501', null, 'a client cannot close days');
select throws_ok($$select app.complete_quest('c0000000-0000-4000-8000-000000000201', 'read_2')$$, '42501', null, 'a client cannot call complete_quest');
select is((select count(*)::int from app.immersion_close), 0, 'nothing is closed yet');
select throws_ok($$insert into app.immersion_close (user_id, day, minutes, xp) values ('c0000000-0000-4000-8000-0000000000a1', current_date - 8, 30, 3)$$,
  '42501', null, 'a client cannot write a closing');
select lives_ok($$select app.save_game_settings('{"quests": {"enabled": false}, "league": {"enabled": true}}')$$, 'the new boolean keys are accepted');
select is((select game_settings from app.profile), '{"quests": {"enabled": false}, "league": {"enabled": true}}'::jsonb, 'and stored');
select throws_ok($$select app.save_game_settings('{"badges": {"enabled": "yes"}}')$$, '22023', null, 'a non boolean value is refused');
reset role;

-- Closing the days of immersion -------------------------------------------------------------------------

set local role service_role;
select throws_ok($$select app.close_immersion_days('c0000000-0000-4000-8000-0000000000a1', current_date - 2)$$, '22023', null,
  'a day newer than 3 days back cannot be closed');
select is(app.close_immersion_days('c0000000-0000-4000-8000-0000000000a1', current_date - 4), 3,
  'closes the three days with entries up to 4 days back (the day of 1 day back stays open)');
select is((select array_agg(day order by day) from app.immersion_close where user_id = 'c0000000-0000-4000-8000-0000000000a1'),
  array[(current_date - 10), (current_date - 9), (current_date - 5)], 'one closing per day');
select is((select xp::int from app.immersion_close where day = current_date - 10 and user_id = 'c0000000-0000-4000-8000-0000000000a1'), 6,
  '75 minutes across languages: the cap is 6 XP');
select is((select minutes from app.immersion_close where day = current_date - 10 and user_id = 'c0000000-0000-4000-8000-0000000000a1'), 75,
  'minutes are summed over every language');
select is((select xp::int from app.immersion_close where day = current_date - 9 and user_id = 'c0000000-0000-4000-8000-0000000000a1'), 0,
  'under 10 minutes: closed without XP');
select is((select array_agg(day order by day) from app.xp_ledger where reason = 'immersion.declared' and user_id = 'c0000000-0000-4000-8000-0000000000a1'),
  array[(current_date - 10), (current_date - 5)], 'a ledger line only for the days that earn XP');
select is((select league_eligible or rule_version <> 'j7.1' or language is not null from app.xp_ledger
  where reason = 'immersion.declared' and day = current_date - 5 and user_id = 'c0000000-0000-4000-8000-0000000000a1'), false,
  'the line is j7.1, without language, outside the leagues');
select is(app.close_immersion_days('c0000000-0000-4000-8000-0000000000a1', current_date - 4), 0, 'replayed: nothing is closed');
select is((select sum(amount)::int from app.xp_ledger where reason = 'immersion.declared' and user_id = 'c0000000-0000-4000-8000-0000000000a1'), 8,
  'and nothing is credited twice');
reset role;
select throws_ok($$update app.immersion_close set xp = 0$$, '42501', 'immersion_close is append-only', 'a closing is append only (the trigger, not a grant)');
select throws_ok($$delete from app.immersion_close where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$, '42501', null, 'and cannot be deleted');

-- The switch: off, nothing is written, so the days can be credited later ---------------------------------

update app.profile set game_settings = '{"immersionXp": {"enabled": false}}' where user_id = 'c0000000-0000-4000-8000-0000000000a2';
set local role service_role;
select is(app.close_immersion_days('c0000000-0000-4000-8000-0000000000a2', current_date - 4), 0, 'switch off: no day is closed');
reset role;
select is((select count(*)::int from app.immersion_close where user_id = 'c0000000-0000-4000-8000-0000000000a2'), 0, 'and no closing row is written');
update app.profile set game_settings = '{}' where user_id = 'c0000000-0000-4000-8000-0000000000a2';
set local role service_role;
select is(app.close_immersion_days('c0000000-0000-4000-8000-0000000000a2', current_date - 4), 1, 'switched back on: the day is credited');
reset role;

-- Quests -------------------------------------------------------------------------------------------------

set local role service_role;
select is(app.complete_quest('c0000000-0000-4000-8000-000000000201', 'read_2'), true, 'a daily quest is completed');
select is((select amount::int || reason || day::text from app.xp_ledger where reason = 'quest.daily' and user_id = 'c0000000-0000-4000-8000-0000000000a1'),
  '10quest.daily' || (current_date - 1)::text, 'and credited 10 XP on the day of the quest');
select is(app.complete_quest('c0000000-0000-4000-8000-000000000201', 'read_2'), false, 'a second call credits nothing');
select is(app.complete_quest('c0000000-0000-4000-8000-000000000202', 'read_2'), false, 'a quest id that no longer matches the row credits nothing');
select throws_ok($$insert into app.quest_assignment (user_id, period, period_start, slot, quest_id, target, catalog_version)
  values ('c0000000-0000-4000-8000-0000000000a1', 'day', current_date - 1, 3, 'read_2', 2, 'quests.v1')$$, '23505', null, 'a quest id appears once in a period');
select is((select count(*)::int from app.xp_ledger where reason = 'quest.daily' and user_id = 'c0000000-0000-4000-8000-0000000000a1'), 1, 'one line only');
select is(app.complete_quest('c0000000-0000-4000-8000-000000000203', 'roleplay_week'), true, 'a weekly quest is completed');
select is((select amount::int from app.xp_ledger where reason = 'quest.weekly' and user_id = 'c0000000-0000-4000-8000-0000000000a1'), 40, 'for 40 XP');

-- Reroll: once a day, never a finished quest or another account's -----------------------------------------

select is(app.reroll_quest('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000201', 'dictation_5', 5::smallint, 'quests.v1'), false,
  'a finished quest cannot be rerolled');
select is(app.reroll_quest('c0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-000000000202', 'dictation_5', 5::smallint, 'quests.v1'), false,
  'nor the quest of another account');
select is(app.reroll_quest('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000202', 'dictation_5', 5::smallint, 'quests.v1'), true,
  'an unfinished daily quest is rerolled');
select is((select rerolled_from from app.quest_assignment where id = 'c0000000-0000-4000-8000-000000000202'), 'session_1', 'and keeps the old id');
reset role;

select * from finish();
rollback;
