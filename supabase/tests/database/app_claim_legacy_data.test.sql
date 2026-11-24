-- pgTAP tests for app.claim_legacy_data (20261125000100): a user of the old app brings their data along at
-- sign-in. Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (instance_id, id, aud, role, email, is_anonymous) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'claim-a@test.invalid', false),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'claim-b@test.invalid', false),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'claim-c@test.invalid', false),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', null, true),
  ('00000000-0000-0000-0000-000000000000', 'e0000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'claim-e@test.invalid', false);

-- A and B come from the old app (two languages for A, one for B); C is a new account; D is a guest;
-- E has no profiles row at all.
update public.profiles set time_zone = 'Pacific/Auckland' where id = 'a0000000-0000-4000-8000-0000000000c1';
insert into public.user_languages (user_id, language, level, target_level, weight, days) values
  ('a0000000-0000-4000-8000-0000000000c1', 'es', 'B1', 'C1', 20, '{1,2,3,4,5,6,7}'),
  ('a0000000-0000-4000-8000-0000000000c1', 'ja', 'A2', 'C1', 15, '{1,3,5}'),
  ('b0000000-0000-4000-8000-0000000000c1', 'it', 'B2', 'C1', 30, '{1,2,3,4,5,6,7}'),
  ('d0000000-0000-4000-8000-0000000000c1', 'es', 'A1', 'C1', 15, '{1,2,3,4,5,6,7}');
delete from public.profiles where id = 'e0000000-0000-4000-8000-0000000000c1';

-- Access ------------------------------------------------------------------------------------------------

set local role anon;
select throws_ok($$select app.claim_legacy_data()$$, '42501', null, 'anon cannot call claim_legacy_data');
reset role;

select set_config('request.jwt.claims', '{}', true);
set local role authenticated;
select throws_ok($$select app.claim_legacy_data()$$, '28000', null, 'a call without a signed-in user is refused');
reset role;

select ok((select prosecdef and proconfig = array['search_path=""'] from pg_proc where oid = 'app.claim_legacy_data()'::regprocedure),
  'it is security definer with an empty search_path');
select ok(has_function_privilege('authenticated', 'app.claim_legacy_data()', 'execute')
  and not has_function_privilege('anon', 'app.claim_legacy_data()', 'execute')
  and not has_function_privilege('public', 'app.claim_legacy_data()', 'execute'),
  'executable by authenticated only');

-- The skipped branches ---------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "d0000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);
set local role authenticated;
select is(app.claim_legacy_data(), '{"skipped": "guest"}'::jsonb, 'a guest is skipped');
reset role;
select is((select count(*)::int from app.enrollment where user_id = 'd0000000-0000-4000-8000-0000000000c1'), 0,
  'and nothing is copied for the guest');

select set_config('request.jwt.claims', '{"sub": "e0000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);
set local role authenticated;
select is(app.claim_legacy_data(), '{"skipped": "no_legacy"}'::jsonb, 'a user without a public.profiles row has nothing to claim');
reset role;

-- Active users: nothing is touched ------------------------------------------------------------------------------

select app.mark_active('c0000000-0000-4000-8000-0000000000c1');
select set_config('request.jwt.claims', '{"sub": "c0000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);
set local role authenticated;
select is(app.claim_legacy_data(), '{"skipped": "active"}'::jsonb, 'a user already active in the new app is skipped');
reset role;
select is((select count(*)::int from app.legacy_claim_log where user_id = 'c0000000-0000-4000-8000-0000000000c1'), 0,
  'a skipped call is not counted against the rate limit');

-- The claim ------------------------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "a0000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);
create temporary table first_claim (j jsonb) on commit drop;
grant all on first_claim to authenticated;
set local role authenticated;
insert into first_claim select app.claim_legacy_data();
reset role;

select is((select j ->> 'skipped' from first_claim), null, 'a legacy user is not skipped');
select is((select j -> 'enrollment' from first_claim), '2'::jsonb, 'the result is the one of migrate_user (two enrollments created)');
select is((select array_agg(language order by language) from app.enrollment where user_id = 'a0000000-0000-4000-8000-0000000000c1'),
  array['es', 'ja'], 'the enrollments of the old app are in app');
select is((select time_zone from app.profile where user_id = 'a0000000-0000-4000-8000-0000000000c1'), 'Pacific/Auckland',
  'the profile follows public.profiles');
select is((select app_active_since from app.profile where user_id = 'a0000000-0000-4000-8000-0000000000c1'), null,
  'the claim does not mark the user active');
select is((select count(*)::int from app.enrollment where user_id = 'b0000000-0000-4000-8000-0000000000c1'), 0,
  'another user is not touched');
select is((select count(*)::int from app.legacy_map where user_id = 'b0000000-0000-4000-8000-0000000000c1' and legacy_table = 'user_languages'), 0,
  'and has no mapping either');

-- Idempotence: a second call changes no count -------------------------------------------------------------------------

create temporary table counts_before on commit drop as
select (select count(*) from app.enrollment where user_id = 'a0000000-0000-4000-8000-0000000000c1') as enrollments,
       (select count(*) from app.skill_estimate where user_id = 'a0000000-0000-4000-8000-0000000000c1') as estimates,
       (select count(*) from app.legacy_map where user_id = 'a0000000-0000-4000-8000-0000000000c1') as maps,
       (select count(*) from app.profile where user_id = 'a0000000-0000-4000-8000-0000000000c1') as profiles;
set local role authenticated;
select lives_ok($$select app.claim_legacy_data()$$, 'a second call succeeds');
reset role;
select is((select count(*) from app.enrollment where user_id = 'a0000000-0000-4000-8000-0000000000c1'), (select enrollments from counts_before), 'same number of enrollments');
select is((select count(*) from app.skill_estimate where user_id = 'a0000000-0000-4000-8000-0000000000c1'), (select estimates from counts_before), 'same number of estimates');
select is((select count(*) from app.legacy_map where user_id = 'a0000000-0000-4000-8000-0000000000c1'), (select maps from counts_before), 'same number of mappings');
select is((select count(*) from app.profile where user_id = 'a0000000-0000-4000-8000-0000000000c1'), (select profiles from counts_before), 'same number of profiles');

-- The old app goes on until the first write in the new app: a change is picked up by the next claim ---------------------

insert into public.user_languages (user_id, language, level, target_level, weight, days)
values ('a0000000-0000-4000-8000-0000000000c1', 'de', 'A1', 'C1', 10, '{2,4}');
set local role authenticated;
select lives_ok($$select app.claim_legacy_data()$$, 'a claim before any write in the new app resynchronises');
reset role;
select is((select count(*)::int from app.enrollment where user_id = 'a0000000-0000-4000-8000-0000000000c1'), 3,
  'the language added in the old app is picked up');

-- legacy_migrated_at follows the last resynchronisation (the app uses it to know how fresh the copy is).
update app.profile set legacy_migrated_at = '2020-01-01 00:00+00' where user_id = 'a0000000-0000-4000-8000-0000000000c1';
set local role authenticated;
select lives_ok($$select app.claim_legacy_data()$$, 'another claim before any write');
reset role;
select ok((select legacy_migrated_at > now() - interval '1 minute' from app.profile where user_id = 'a0000000-0000-4000-8000-0000000000c1'),
  'legacy_migrated_at is the time of the last resynchronisation');

-- The claim takes the per-user lock of app.ingest_batch (checked in the function body).
select ok((select prosrc like '%app.ingest:%' from pg_proc where oid = 'app.claim_legacy_data()'::regprocedure),
  'claim_legacy_data takes the advisory lock of the ingestion of the user');

-- After the first write in the new app, nothing is resynchronised any more ----------------------------------------------

set local role authenticated;
select lives_ok($$select app.save_profile('fr', 'fr', 'Europe/Paris')$$, 'a write in the new app');
reset role;
select isnt((select app_active_since from app.profile where user_id = 'a0000000-0000-4000-8000-0000000000c1'), null,
  'it marks the user active');
insert into public.user_languages (user_id, language, level, target_level, weight, days)
values ('a0000000-0000-4000-8000-0000000000c1', 'ko', 'A1', 'C1', 10, '{2,4}');
set local role authenticated;
select is(app.claim_legacy_data(), '{"skipped": "active"}'::jsonb, 'the next claim is skipped');
reset role;
select is((select count(*)::int from app.enrollment where user_id = 'a0000000-0000-4000-8000-0000000000c1'), 3,
  'and the old app change is not copied');

-- Rate limit: 20 effective calls per 24 hours -----------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "b0000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);
insert into app.legacy_claim_log (user_id, claimed_at)
select 'b0000000-0000-4000-8000-0000000000c1', now() - interval '2 days' from generate_series(1, 20);
insert into app.legacy_claim_log (user_id, claimed_at)
select 'b0000000-0000-4000-8000-0000000000c1', now() - interval '1 hour' from generate_series(1, 19);
set local role authenticated;
select lives_ok($$select app.claim_legacy_data()$$, 'the 20th call within 24 hours goes through (older calls do not count)');
select is(app.claim_legacy_data(), '{"skipped": "rate_limited"}'::jsonb, 'the 21st is refused without an error');
reset role;

select * from finish();
rollback;
