-- pgTAP tests for the badges (migration 20261128000400): the owner reads, nobody else does, clients cannot write or call
-- award_badges, the awards are append only and unique per (badge, language), a replay awards nothing.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid');

select is((select rowsecurity from pg_tables where schemaname = 'app' and tablename = 'badge_award'), true, 'RLS is enabled');
select ok(not has_function_privilege('authenticated', 'app.award_badges(uuid, jsonb)', 'execute')
  and not has_function_privilege('anon', 'app.award_badges(uuid, jsonb)', 'execute')
  and has_function_privilege('service_role', 'app.award_badges(uuid, jsonb)', 'execute'), 'award_badges: service_role only');

set local role service_role;
select is(app.award_badges('c0000000-0000-4000-8000-0000000000a1',
  '[{"badge_id": "words_100", "language": "it", "meta": {"value": 104}}, {"badge_id": "practice_10h", "language": null}, {"badge_id": "words_100", "language": "ru"}]'), 3,
  'awards are recorded (the same badge in another language is another badge)');
select is(app.award_badges('c0000000-0000-4000-8000-0000000000a1',
  '[{"badge_id": "words_100", "language": "it"}, {"badge_id": "practice_10h", "language": null}]'), 0, 'a replay awards nothing, also for a badge without language');
select is(app.award_badges('c0000000-0000-4000-8000-0000000000a2', '[{"badge_id": "words_100", "language": "it"}]'), 1, 'another account earns its own');
select throws_ok($$select app.award_badges('c0000000-0000-4000-8000-0000000000a1', '{}')$$, '22023', null, 'the payload must be an array');
reset role;

select is((select count(*)::int from app.badge_award where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 3, 'three rows for the first account');
select throws_ok($$update app.badge_award set badge_id = 'x'$$, '42501', 'badge_award is append-only', 'an award is append only (the trigger)');
select throws_ok($$delete from app.badge_award where user_id = 'c0000000-0000-4000-8000-0000000000a1'$$, '42501', null, 'and cannot be deleted');

set local role anon;
select throws_ok($$select count(*) from app.badge_award$$, '42501', null, 'anon cannot read');
reset role;

select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from app.badge_award), 3, 'a client reads its own badges only');
select throws_ok($$insert into app.badge_award (user_id, badge_id) values ('c0000000-0000-4000-8000-0000000000a1', 'words_250')$$, '42501', null, 'a client cannot insert');
select throws_ok($$update app.badge_award set badge_id = 'x'$$, '42501', null, 'a client cannot update');
select throws_ok($$delete from app.badge_award$$, '42501', null, 'a client cannot delete');
select throws_ok($$select app.award_badges('c0000000-0000-4000-8000-0000000000a1', '[]')$$, '42501', null, 'a client cannot call award_badges');
reset role;

select * from finish();
rollback;
