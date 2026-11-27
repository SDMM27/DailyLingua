-- pgTAP tests for the social lot (migration 20261128000500): the pseudonym, the league as a collective challenge, friends by
-- invitation code, the cooperative challenge. An account reads only its own rows; what it learns of others comes from
-- the definer functions and only the listed fields; entitlement, expiry, single use, rate limit, no self-friendship.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(91);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a3', 'authenticated', 'authenticated', 'u3@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a4', 'authenticated', 'authenticated', 'u4@test.invalid');

-- a1, a2, a3 have friends and league on; a3 hides its streak; a4 has nothing on.
update app.profile set game_settings = '{"friends": {"enabled": true}, "league": {"enabled": true}}'
  where user_id in ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a2');
update app.profile set game_settings = '{"friends": {"enabled": true}, "league": {"enabled": true}, "streak": {"enabled": false}}'
  where user_id = 'c0000000-0000-4000-8000-0000000000a3';
update app.streak_state set current = 5, best = 5, last_day = current_date where user_id in ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a2');
update app.streak_state set current = 2, best = 2, last_day = current_date where user_id = 'c0000000-0000-4000-8000-0000000000a3';
insert into app.enrollment (user_id, language, daily_minutes, position) values
  ('c0000000-0000-4000-8000-0000000000a1', 'it', 15, 0),
  ('c0000000-0000-4000-8000-0000000000a2', 'es', 15, 0),
  ('c0000000-0000-4000-8000-0000000000a3', 'it', 15, 0);
insert into app.social_profile (user_id, pseudonym) values
  ('c0000000-0000-4000-8000-0000000000a2', 'Brume claire'),
  ('c0000000-0000-4000-8000-0000000000a3', 'Tilleul');

-- XP: an old line makes each of the three at least 7 days old; this week a1 has 100 (and an immersion line that does not
-- count), a2 has 200 on one day (capped at 150 for the league).
insert into app.xp_ledger (user_id, day, amount, reason, meta, league_eligible) values
  ('c0000000-0000-4000-8000-0000000000a1', current_date - 10, 1, 'session.complete', '{}', true),
  ('c0000000-0000-4000-8000-0000000000a2', current_date - 10, 1, 'session.complete', '{}', true),
  ('c0000000-0000-4000-8000-0000000000a3', current_date - 10, 1, 'session.complete', '{}', true),
  ('c0000000-0000-4000-8000-0000000000a1', app.social_week_start(), 100, 'session.complete', '{"n": 1}', true),
  ('c0000000-0000-4000-8000-0000000000a1', app.social_week_start(), 6, 'immersion.declared', '{"minutes": 60}', false),
  ('c0000000-0000-4000-8000-0000000000a2', app.social_week_start(), 100, 'session.complete', '{"n": 1}', true),
  ('c0000000-0000-4000-8000-0000000000a2', app.social_week_start(), 100, 'session.complete', '{"n": 2}', true);

-- Structure and privileges ----------------------------------------------------------------------------

select is((select count(*)::int from pg_tables where schemaname = 'app' and rowsecurity and tablename in
  ('social_profile', 'league_membership', 'friend_invite', 'friendship', 'coop_challenge', 'coop_member', 'social_attempt')), 7,
  'RLS is enabled on the seven tables');
select is((select count(*)::int from pg_proc p where p.pronamespace = 'app'::regnamespace and p.proname in
  ('social_set_pseudonym', 'league_join', 'league_leave', 'league_week_summary', 'friend_invite_create', 'friend_invite_accept',
   'friend_remove', 'friends_overview', 'coop_create', 'coop_join', 'coop_leave', 'coop_overview')
  and p.prosecdef and has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute')), 12,
  'the twelve social functions are security definer, executable by authenticated and not by anon');
select is((select count(*)::int from pg_proc p where p.pronamespace = 'app'::regnamespace and p.proname in
  ('social_flag', 'social_week_start', 'social_week_xp', 'social_week_goal', 'social_eligible', 'social_settings_changed')
  and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))), 0,
  'the internal helpers are not executable by clients');
select is((select proargnames from pg_proc where proname = 'friends_overview' and pronamespace = 'app'::regnamespace),
  array['pseudonym', 'language', 'week_xp', 'streak'], 'friends_overview returns only the four listed fields');

set local role anon;
select throws_ok($$select app.league_week_summary()$$, '42501', null, 'anon cannot call the social functions');
reset role;

-- Pseudonym --------------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(app.social_set_pseudonym('ab'), 'invalid', 'a pseudonym of 2 characters is refused');
select is(app.social_set_pseudonym('u1@test.invalid'), 'invalid', 'an address is refused (no @ or dot)');
select is(app.social_set_pseudonym(' Lune de mai'), 'invalid', 'leading space is refused');
select is(app.social_set_pseudonym('Lune de mai'), 'ok', 'a valid pseudonym is recorded');
select is(app.social_set_pseudonym('Autre nom'), 'exists', 'the pseudonym is chosen once');
select is((select count(*)::int from app.social_profile), 1, 'a client reads its own social profile only');
reset role;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a4", "role": "authenticated"}', true);
set local role authenticated;
select is(app.social_set_pseudonym('LUNE DE MAI'), 'taken', 'a pseudonym is unique whatever its case');
select is(array(select app.social_set_pseudonym('LUNE DE MAI') from generate_series(1, 10)), array_fill('taken'::text, array[9]) || 'rate_limited'::text,
  'the taken answer is rate limited too (10 attempts an hour)');
select is(app.friend_invite_create(), '{"status": "not_enabled"}'::jsonb, 'no invitation without the friends switch');
select is(app.league_join(), 'not_enabled', 'no league without the league switch');
select is(app.coop_join('c0000000-0000-4000-8000-0000000000ee'), 'not_enabled', 'no challenge without the friends switch');
select is((app.coop_overview())->>'enabled', 'false', 'and nothing to see of the challenges');
select is((select count(*)::int from app.friends_overview()), 0, 'nor friends');
select is((select count(*)::int from app.coop_member), 0, 'a stranger reads no challenge member');
reset role;

-- Invitation codes -----------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(array(select (app.friend_invite_create())->>'status' from generate_series(1, 6)), array['ok', 'ok', 'ok', 'ok', 'ok', 'limit'],
  'five active codes at most');
select throws_ok($$select count(*) from app.friend_invite$$, '42501', null, 'a client cannot read invitations (used_by would leak the other account id)');
reset role;

select matches((select min(code) from app.friend_invite where inviter = 'c0000000-0000-4000-8000-0000000000a1'), '^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{9}$',
  'a code has 9 characters from the unambiguous alphabet');
select is((select count(distinct code)::int from app.friend_invite where inviter = 'c0000000-0000-4000-8000-0000000000a1'), 5, 'the codes differ');
select is((select count(*)::int from app.friend_invite where inviter = 'c0000000-0000-4000-8000-0000000000a1' and expires_at between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour'), 5,
  'a code is valid for 7 days');
create temp table mycode as select min(code) as code from app.friend_invite where inviter = 'c0000000-0000-4000-8000-0000000000a1';
grant select on pg_temp.mycode to authenticated;

insert into app.friend_invite (code, inviter, expires_at, used_by, used_at) values
  ('GOODCODE2', 'c0000000-0000-4000-8000-0000000000a2', now() + interval '1 day', null, null),
  ('AGAINCOD2', 'c0000000-0000-4000-8000-0000000000a2', now() + interval '1 day', null, null),
  ('USEDCODE3', 'c0000000-0000-4000-8000-0000000000a2', now() + interval '1 day', 'c0000000-0000-4000-8000-0000000000a3', now()),
  ('OLDCODE22', 'c0000000-0000-4000-8000-0000000000a2', now() - interval '1 day', null, null);

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(app.friend_invite_accept('OLDCODE22'), 'invalid', 'an expired code is refused');
select is(app.friend_invite_accept('USEDCODE3'), 'invalid', 'a used code is refused');
select is(app.friend_invite_accept('NOSUCHCOD'), 'invalid', 'an unknown code gets the same answer');
select is(app.friend_invite_accept((select code from pg_temp.mycode)), 'self', 'no friendship with oneself');
select is(app.friend_invite_accept('good-code2'), 'ok', 'a valid code makes a friend (case, dashes and spaces ignored)');
select is(app.friend_invite_accept('GOODCODE2'), 'invalid', 'a code is single use');
reset role;
select is((select count(*)::int from app.friendship where user_a = 'c0000000-0000-4000-8000-0000000000a1' and user_b = 'c0000000-0000-4000-8000-0000000000a2'), 1,
  'one friendship, the smaller id first');
select is((select used_by from app.friend_invite where code = 'GOODCODE2'), 'c0000000-0000-4000-8000-0000000000a1'::uuid, 'the code records who used it');

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(app.friend_invite_accept('AGAINCOD2'), 'already', 'no duplicate friendship');
reset role;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a3", "role": "authenticated"}', true);
set local role authenticated;
select is(array(select app.friend_invite_accept('ZZZZZZZZ' || i) from generate_series(1, 11) i),
  array_fill('invalid'::text, array[10]) || 'rate_limited'::text, 'at most 10 attempts an hour');
reset role;

-- The friends list ---------------------------------------------------------------------------------------

insert into app.friendship (user_a, user_b) values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a3');

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((select array_agg(pseudonym order by pseudonym) from app.friends_overview()), array['Brume claire', 'Tilleul'], 'a1 sees its two friends by pseudonym');
select is((select week_xp from app.friends_overview() where pseudonym = 'Brume claire'), 150, 'the league XP of a friend is capped at 150 a day');
select is((select language from app.friends_overview() where pseudonym = 'Brume claire'), 'es', 'with the active target language');
select is((select streak from app.friends_overview() where pseudonym = 'Brume claire'), 5, 'and the streak of a friend who shows it');
select is((select streak from app.friends_overview() where pseudonym = 'Tilleul'), null, 'but not of one who hides it');
reset role;
update app.streak_state set last_day = current_date - 5 where user_id = 'c0000000-0000-4000-8000-0000000000a2';
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((select streak from app.friends_overview() where pseudonym = 'Brume claire'), 0, 'a streak that was not extended since 5 days is shown as 0');
reset role;
update app.streak_state set last_day = current_date where user_id = 'c0000000-0000-4000-8000-0000000000a2';
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select user_a from app.friendship$$, '42501', null, 'a client cannot read friendships (they hold the other account id)');
select throws_ok($$insert into app.social_profile (user_id, pseudonym) values ('c0000000-0000-4000-8000-0000000000a1', 'Intrus')$$, '42501', null, 'a client cannot write a profile');
select throws_ok($$insert into app.friendship (user_a, user_b) values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a4')$$, '42501', null, 'a client cannot make a friendship');
select throws_ok($$delete from app.friendship$$, '42501', null, 'a client cannot delete a friendship');
select throws_ok($$insert into app.league_membership (user_id) values ('c0000000-0000-4000-8000-0000000000a1')$$, '42501', null, 'a client cannot join the league by a write');
reset role;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a2", "role": "authenticated"}', true);
set local role authenticated;
select is((select array_agg(pseudonym) from app.friends_overview()), array['Lune de mai'], 'a2 sees only its own friend');
reset role;

update app.profile set game_settings = '{"friends": {"enabled": false}, "league": {"enabled": true}}' where user_id = 'c0000000-0000-4000-8000-0000000000a3';
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((select array_agg(pseudonym) from app.friends_overview()), array['Brume claire'], 'a friend who turns the friends switch off disappears from the list');
reset role;
update app.profile set game_settings = '{"friends": {"enabled": true}, "league": {"enabled": true}, "streak": {"enabled": false}}' where user_id = 'c0000000-0000-4000-8000-0000000000a3';

-- League as a collective challenge -----------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((app.league_week_summary())->>'registered', 'false', 'before joining nothing is shown');
select is(app.league_join(), 'ok', 'joins the league');
reset role;
insert into app.league_membership (user_id) values ('c0000000-0000-4000-8000-0000000000a2'), ('c0000000-0000-4000-8000-0000000000a3');

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
reset role;
update app.streak_state set last_day = current_date - 5 where user_id = 'c0000000-0000-4000-8000-0000000000a1';
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((app.league_week_summary())->>'eligible', 'false', 'a lapsed streak does not make a member eligible');
reset role;
update app.streak_state set last_day = current_date where user_id = 'c0000000-0000-4000-8000-0000000000a1';
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((app.league_week_summary())->>'eligible', 'true', 'a1 is eligible (old enough, streak of 5)');
select is((app.league_week_summary())->>'mode', 'collective', 'below 16 members the league is collective');
select is((app.league_week_summary())->>'participants', '2', 'two participants: a3 has a streak of 2 and is not counted');
select is((app.league_week_summary())->>'total', '250', 'the total is 100 + 150 (the immersion line does not count)');
select is((app.league_week_summary())->>'mine', '100', 'a member sees its own share');
select is((app.league_week_summary())->>'goal', '600', 'the goal is 80 % of the weekly goals (2 x 375)');
select is((select array_agg(k order by k) from jsonb_object_keys(app.league_week_summary()) k),
  array['days_left', 'eligible', 'goal', 'mine', 'mode', 'participants', 'registered', 'total', 'week_start'], 'no pseudonym and no rank in the summary');
reset role;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a3", "role": "authenticated"}', true);
set local role authenticated;
select is((app.league_week_summary())->>'eligible', 'false', 'a member who is not eligible yet is told so and sees nothing else');
reset role;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a4", "role": "authenticated"}', true);
set local role authenticated;
select is((app.league_week_summary())->>'registered', 'false', 'a non member gets nothing');
reset role;

-- Cooperative challenge ---------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((app.coop_create(array['Nobody here']))->>'status', 'not_friends', 'only friends can be invited');
select is((app.coop_create('{}'))->>'status', 'invalid', 'at least one friend');
select is((app.coop_create(array['Brume claire', 'Tilleul']))->>'status', 'ok', 'a challenge is created with two friends');
select is((app.coop_create(array['Brume claire']))->>'status', 'exists', 'one challenge a week');
reset role;
create temp table cid as select id from app.coop_challenge limit 1;
grant select on pg_temp.cid to authenticated;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a2", "role": "authenticated"}', true);
set local role authenticated;
select is((select jsonb_array_length((app.coop_overview())->'invitations')), 1, 'a2 has one invitation');
select is((app.coop_overview())->'invitations'->0->>'from', 'Lune de mai', 'from the pseudonym of the creator');
select is(((app.coop_overview())->'challenge')::text, 'null', 'and no challenge before joining');
select is((select count(*)::int from app.coop_challenge), 0, 'an invited account does not read the challenge row');
select is(app.coop_join((select id from pg_temp.cid)), 'ok', 'a2 joins');
select is(app.coop_join((select id from pg_temp.cid)), 'unavailable', 'joining twice is refused');
reset role;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a3", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select app.coop_leave((select id from pg_temp.cid))$$, 'a3 declines the invitation without penalty');
select is(((app.coop_overview())->'challenge')::text, 'null', 'and sees no challenge');
select is((select jsonb_array_length((app.coop_overview())->'invitations')), 0, 'nor invitation');
reset role;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(((app.coop_overview())->'challenge'->>'status'), 'active', 'the challenge of the week is active');
select is(((app.coop_overview())->'challenge'->'members')::jsonb @> '[{"pseudonym": "Brume claire", "contribution": 150}]'::jsonb, true, 'a member sees the contributions by pseudonym');
select is((select array_agg(distinct k order by k) from jsonb_array_elements((app.coop_overview())->'challenge'->'members') m, jsonb_object_keys(m) k),
  array['contribution', 'me', 'pseudonym'], 'and nothing else about them');
select is((app.coop_overview())->'challenge'->>'total', '250', 'the total is the sum of the members who joined');
select is((app.coop_overview())->'challenge'->>'goal', '600', 'the goal is 80 % of their weekly goals');
select is((app.coop_overview())->'challenge'->>'reached', 'false', 'not reached yet');
reset role;

insert into app.xp_ledger (user_id, day, amount, reason, meta, league_eligible)
select u, app.social_week_start() + d, 100, 'session.complete', jsonb_build_object('n', n), true
from unnest(array['c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a2']::uuid[]) u, generate_series(1, 3) d, generate_series(1, 2) n;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((app.coop_overview())->'challenge'->>'reached', 'true', 'reached together once the total passes the goal');
reset role;

update app.profile set game_settings = '{"friends": {"enabled": false}, "league": {"enabled": false}}' where user_id = 'c0000000-0000-4000-8000-0000000000a2';
select is((select left_at is not null from app.coop_member where user_id = 'c0000000-0000-4000-8000-0000000000a2'), true,
  'turning the friends switch off leaves the challenge');
select is((select left_at is not null from app.league_membership where user_id = 'c0000000-0000-4000-8000-0000000000a2'), true,
  'turning the league switch off leaves the league');

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(jsonb_array_length((app.coop_overview())->'challenge'->'members'), 1, 'who has left no longer counts in the challenge');
select is(app.league_week_summary()->>'participants', '1', 'nor in the league');
reset role;
update app.profile set game_settings = '{"friends": {"enabled": false}, "league": {"enabled": true}}' where user_id = 'c0000000-0000-4000-8000-0000000000a3';
insert into app.coop_challenge (id, created_by, week_start) values ('c0000000-0000-4000-8000-0000000000c1', 'c0000000-0000-4000-8000-0000000000a3', app.social_week_start());
insert into app.coop_member (challenge_id, user_id, joined_at) values ('c0000000-0000-4000-8000-0000000000c1', 'c0000000-0000-4000-8000-0000000000a3', now());
insert into app.coop_member (challenge_id, user_id) values ('c0000000-0000-4000-8000-0000000000c1', 'c0000000-0000-4000-8000-0000000000a1');
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(app.coop_join('c0000000-0000-4000-8000-0000000000c1'), 'unavailable', 'an invitation from a creator who turned the friends switch off cannot be accepted');
reset role;
update app.profile set game_settings = '{"friends": {"enabled": true}, "league": {"enabled": true}, "streak": {"enabled": false}}' where user_id = 'c0000000-0000-4000-8000-0000000000a3';
insert into app.coop_challenge (id, created_by, week_start) values ('c0000000-0000-4000-8000-0000000000c2', 'c0000000-0000-4000-8000-0000000000a1', app.social_week_start());
insert into app.coop_member (challenge_id, user_id, joined_at) values ('c0000000-0000-4000-8000-0000000000c2', 'c0000000-0000-4000-8000-0000000000a1', now());
insert into app.coop_member (challenge_id, user_id) values ('c0000000-0000-4000-8000-0000000000c2', 'c0000000-0000-4000-8000-0000000000a3');
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(app.friend_remove('tilleul'), true, 'a friend is removed by pseudonym, whatever the case');
reset role;
select is((select left_at is not null from app.coop_member where challenge_id = 'c0000000-0000-4000-8000-0000000000c2' and user_id = 'c0000000-0000-4000-8000-0000000000a3'), true,
  'removing a friend ends the invitation they had from the caller');
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is(app.friend_remove('Tilleul'), false, 'and only once');
select is((select count(*)::int from app.friends_overview()), 0, 'the removed friend is gone from the list, and a2 is hidden by its own switch');
reset role;

-- Constraints --------------------------------------------------------------------------------------------

select throws_ok($$insert into app.friendship (user_a, user_b) values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1')$$, '23514', null, 'no friendship with oneself');
select throws_ok($$insert into app.friendship (user_a, user_b) values ('c0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-0000000000a1')$$, '23514', null, 'a friendship is stored smaller id first');
select throws_ok($$insert into app.friendship (user_a, user_b) values ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a2')$$, '23505', null, 'no duplicate friendship');

select * from finish();
rollback;
