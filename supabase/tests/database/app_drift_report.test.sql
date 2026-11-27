-- pgTAP tests for app.drift_report (migration 20261128000600): service role only, aggregates only (no account id), and
-- a seeded dataset that triggers every signal. Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', '20430000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'drift1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', '20430000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'drift2@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', '20430000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'drift3@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', '20430000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'drift4@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', '20430000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'drift5@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', '20430000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'drift6@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', '20430000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'drift7@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', '20430000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'drift8@test.invalid');

-- 1. XP up, recall down: 50 XP in the first week of the window and 100 in the last; recall 10/10 then 8/10.
insert into app.card (id, user_id, language, kind, front, state, due_at) values
  ('20430000-0000-4000-8000-0000000000a1', '20430000-0000-4000-8000-000000000001', 'it', 'word', 'ciao', 'review', '2042-11-01');
insert into app.xp_ledger (user_id, day, amount, reason, meta) values
  ('20430000-0000-4000-8000-000000000001', '2042-11-02', 50, 'session.complete', '{}'),
  ('20430000-0000-4000-8000-000000000001', '2042-11-25', 100, 'session.complete', '{}');
insert into app.review_log (user_id, card_id, rating, reviewed_at, elapsed_days, origin)
select '20430000-0000-4000-8000-000000000001', '20430000-0000-4000-8000-0000000000a1', 3, timestamptz '2042-11-03 10:00+00' + n * interval '1 minute', 2, 'fsrs'
from generate_series(1, 10) n;
insert into app.review_log (user_id, card_id, rating, reviewed_at, elapsed_days, origin)
select '20430000-0000-4000-8000-000000000001', '20430000-0000-4000-8000-0000000000a1', case when n <= 8 then 3 else 1 end, timestamptz '2042-11-24 10:00+00' + n * interval '1 minute', 2, 'fsrs'
from generate_series(1, 10) n;

-- 2. Midnight sessions: two of three validated days under 30 XP end 20 minutes before 04:00 (Paris).
insert into app.learning_day (user_id, day, time_zone, xp_verified, validated, first_activity_at) values
  ('20430000-0000-4000-8000-000000000002', '2042-11-10', 'Europe/Paris', 20, true, '2042-11-10 20:00+00'),
  ('20430000-0000-4000-8000-000000000002', '2042-11-11', 'Europe/Paris', 20, true, '2042-11-11 20:00+00'),
  ('20430000-0000-4000-8000-000000000002', '2042-11-12', 'Europe/Paris', 20, true, '2042-11-12 09:00+00');
insert into app.xp_ledger (user_id, day, amount, reason, meta, created_at) values
  ('20430000-0000-4000-8000-000000000002', '2042-11-10', 20, 'session.complete', '{}', '2042-11-11 02:40+00'),
  ('20430000-0000-4000-8000-000000000002', '2042-11-11', 20, 'session.complete', '{}', '2042-11-12 02:45+00'),
  ('20430000-0000-4000-8000-000000000002', '2042-11-12', 20, 'session.complete', '{}', '2042-11-12 12:00+00');

-- 3. Anxious streak: 7 validated days in a row at 24 XP.
insert into app.learning_day (user_id, day, time_zone, xp_verified, validated, first_activity_at)
select '20430000-0000-4000-8000-000000000003', date '2042-11-05' + n, 'Europe/Paris', 24, true, timestamptz '2042-11-05 09:00+00' + n * interval '1 day'
from generate_series(0, 6) n;

-- 4. Easy quests: the three daily quests of a day were all rerolled.
insert into app.quest_assignment (user_id, period, period_start, slot, quest_id, target, catalog_version, rerolled_from) values
  ('20430000-0000-4000-8000-000000000004', 'day', '2042-11-10', 1, 'read_well', 1, 'quests.v1', 'read_2'),
  ('20430000-0000-4000-8000-000000000004', 'day', '2042-11-10', 2, 'rewrite_2', 2, 'quests.v1', 'produce_1'),
  ('20430000-0000-4000-8000-000000000004', 'day', '2042-11-10', 3, 'session_1', 1, 'quests.v1', 'unit_1'),
  ('20430000-0000-4000-8000-000000000004', 'week', '2042-11-09', 1, 'read_5_week', 5, 'quests.v1', null);

-- 5. Compulsive league: a member at 160 league XP (over the 150 cap) 7 days in a row.
insert into app.league_membership (user_id) values ('20430000-0000-4000-8000-000000000005');
insert into app.xp_ledger (user_id, day, amount, reason, meta, league_eligible)
select '20430000-0000-4000-8000-000000000005', date '2042-11-15' + d, case when n = 1 then 100 else 60 end, 'session.complete', jsonb_build_object('n', n), true
from generate_series(0, 6) d, generate_series(1, 2) n;

-- 6. Inflated immersion: 250 minutes declared 5 days in a row.
insert into app.immersion_entry (user_id, language, day, minutes, kind)
select '20430000-0000-4000-8000-000000000006', 'it', date '2042-11-12' + d, 250, 'video' from generate_series(0, 4) d;

-- 7. Notifications: switched off 5 hours after one was sent. 2. also turns the quests off (a switch).
insert into app.notification_log (user_id, day, kind, template, sent_at) values
  ('20430000-0000-4000-8000-000000000007', '2042-11-20', 'daily', 'default', '2042-11-20 10:00+00');
insert into app.setting_change (user_id, key, value, effective_day, changed_at) values
  ('20430000-0000-4000-8000-000000000007', 'notifications.enabled', 'false', '2042-11-21', '2042-11-20 15:00+00'),
  ('20430000-0000-4000-8000-000000000002', 'quests.enabled', 'false', '2042-11-21', '2042-11-20 15:00+00'),
  ('20430000-0000-4000-8000-000000000002', 'ring.tier', '20', '2042-11-21', '2042-11-20 15:00+00');

-- 8. Challenge departure: left a challenge on 16 November; 100 XP the 7 days before, 20 the 7 days after.
insert into app.coop_challenge (id, created_by, week_start) values ('20430000-0000-4000-8000-0000000000c1', '20430000-0000-4000-8000-000000000008', '2042-11-09');
insert into app.coop_member (challenge_id, user_id, joined_at, left_at) values
  ('20430000-0000-4000-8000-0000000000c1', '20430000-0000-4000-8000-000000000008', '2042-11-10 08:00+00', '2042-11-16 10:00+00');
insert into app.xp_ledger (user_id, day, amount, reason, meta) values
  ('20430000-0000-4000-8000-000000000008', '2042-11-12', 100, 'session.complete', '{}'),
  ('20430000-0000-4000-8000-000000000008', '2042-11-18', 20, 'session.complete', '{}');

create temp table report as select app.drift_report('2042-11-01', '2042-11-28') as r;
create temp table empty_report as select app.drift_report('2041-01-01', '2041-01-28') as r;
grant select on pg_temp.report to authenticated;

-- Access ---------------------------------------------------------------------------------------------

select ok(not has_function_privilege('authenticated', 'app.drift_report(date,date)', 'execute'), 'a learner cannot read the drift report');
select ok(not has_function_privilege('anon', 'app.drift_report(date,date)', 'execute'), 'nor anon');
select ok(has_function_privilege('service_role', 'app.drift_report(date,date)', 'execute'), 'the service role can');
select set_config('request.jwt.claims', '{"sub": "20430000-0000-4000-8000-000000000001", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select app.drift_report('2042-11-01', '2042-11-28')$$, '42501', null, 'a call from a learner session is refused');
reset role;

-- Signals ------------------------------------------------------------------------------------------------

select is((select r->>'activeAccounts' from report), '2', 'two accounts are active in the window (a validated day each)');
select is((select r->'xpRetention'->'weeks'->0->>'xp' from report), '50', 'the first of the four weeks has 50 XP');
select is((select r->'xpRetention'->'weeks'->3->>'xp' from report), '100', 'the last has 100 XP');
select is((select r->'xpRetention'->'weeks'->0->>'recallTotal' from report), '10', 'and the recall counts are kept per week');
select is((select r->'xpRetention'->>'alert' from report), 'true', 'XP up and recall down by 20 points: alert');
select is((select r->'midnight'->>'flaggedDays' from report), '2', 'two midnight days');
select is((select r->'midnight'->>'accountsOver' from report), '1', 'one account has more than half of its validated days at midnight');
select is((select r->'anxiousStreak'->>'accounts' from report), '1', 'one anxious streak');
select is((select (r->'easyQuests'->>'rerolled') || '/' || (r->'easyQuests'->>'total') from report), '3/3', 'three daily quests rerolled out of three (the weekly one does not count)');
select is((select r->'easyQuests'->'voletGain' from report), 'null'::jsonb, 'the share of the targeted strand is reported as not measured');
select is((select r->'compulsiveLeague'->>'accounts' from report), '1', 'one league member at the cap 7 days in a row');
select is((select r->'inflatedImmersion'->>'accounts' from report), '1', 'one account with more than 4 hours declared 5 days in a row');
select is((select r->'notificationOptOut'->>'accounts' from report), '1', 'one notification switched off within 24 hours of a send');
select is((select r->'challengeDeparture'->>'accounts' from report), '1', 'one departure followed by half the activity');
select ok((select r->'switchedOff'->'keys' from report) @> '[{"key": "quests.enabled", "accounts": 1}]'::jsonb
  and not (select r->'switchedOff'->'keys' from report) @> '[{"key": "ring.tier"}]'::jsonb, 'switches turned off are counted per key (a changed value is not a switch off)');
select is((select count(*)::int from report, jsonb_path_query(r, '$.**.alert') a where a = 'true'::jsonb), 9, 'the nine signals alert');

-- Aggregates only; quiet window -------------------------------------------------------------------------

select is((select r::text ~ '20430000-0000-4000' from report), false, 'the report holds no account id');
select is((select count(*)::int from empty_report, jsonb_path_query(r, '$.**.alert') a where a = 'true'::jsonb), 0, 'an empty window raises no alert');
select is((select r->>'activeAccounts' from empty_report), '0', 'and has no active account');

select * from finish();
rollback;
