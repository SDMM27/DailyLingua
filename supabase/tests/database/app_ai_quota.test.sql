-- pgTAP tests for the AI quota and cost functions (migration 20261114000100): behaviour, validation,
-- and the fact that only service_role can execute them. Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(67);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid');

-- Privileges --------------------------------------------------------------------------------------------

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app'
     and p.proname in ('claim_quota', 'release_quota', 'record_ai_call', 'ai_spend', 'ai_spend_month')),
  5, 'the five functions exist');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app'
     and p.proname in ('claim_quota', 'release_quota', 'record_ai_call', 'ai_spend', 'ai_spend_month')
     and p.prosecdef and has_function_privilege('service_role', p.oid, 'execute')
     and not has_function_privilege('anon', p.oid, 'execute')
     and not has_function_privilege('authenticated', p.oid, 'execute')),
  5, 'all five are security definer, executable by service_role and by no client role');

set local role anon;
select throws_ok($$select app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'ai', 5, '2030-01-01')$$, '42501', null, 'anon: claim_quota refused');
select throws_ok($$select app.release_quota('c0000000-0000-4000-8000-0000000000a1', 'ai', '2030-01-01')$$, '42501', null, 'anon: release_quota refused');
select throws_ok($$select app.record_ai_call('p', 'm', null, 1, 1, 0, 0, false, 0.1, null, 'ok')$$, '42501', null, 'anon: record_ai_call refused');
select throws_ok($$select * from app.ai_spend('2030-01-01', '2030-02-01')$$, '42501', null, 'anon: ai_spend refused');
select throws_ok($$select app.ai_spend_month('2030-01-15')$$, '42501', null, 'anon: ai_spend_month refused');
reset role;

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'ai', 5, '2030-01-01')$$, '42501', null, 'authenticated: claim_quota refused');
select throws_ok($$select app.release_quota('c0000000-0000-4000-8000-0000000000a1', 'ai', '2030-01-01')$$, '42501', null, 'authenticated: release_quota refused');
select throws_ok($$select app.record_ai_call('p', 'm', null, 1, 1, 0, 0, false, 0.1, null, 'ok')$$, '42501', null, 'authenticated: record_ai_call refused');
select throws_ok($$select * from app.ai_spend('2030-01-01', '2030-02-01')$$, '42501', null, 'authenticated: ai_spend refused');
select throws_ok($$select app.ai_spend_month('2030-01-15')$$, '42501', null, 'authenticated: ai_spend_month refused');
reset role;

-- claim_quota ---------------------------------------------------------------------------------------------

set local role service_role;

select is(app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'writing_feedback', 2, '2030-01-01'), true, 'claim 1/2 passes');
select is(app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'writing_feedback', 2, '2030-01-01'), true, 'claim 2/2 passes');
select is(app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'writing_feedback', 2, '2030-01-01'), false, 'claim 3/2 is refused');
select is(app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'writing_feedback', 2, '2030-01-01'), false, 'a refused claim stays refused');
select is((select used from app.quota_usage where user_id = 'c0000000-0000-4000-8000-0000000000a1' and kind = 'writing_feedback' and day = '2030-01-01'),
  2, 'a refused claim changes nothing (used stays at the limit)');

select is(app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'writing_feedback', 2, '2030-01-02'), true, 'another day has its own counter');
select is(app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'gloss', 2, '2030-01-01'), true, 'another kind has its own counter');
select is(app.claim_quota('c0000000-0000-4000-8000-0000000000a2', 'writing_feedback', 2, '2030-01-01'), true, 'another user has their own counter');

select is(app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'zero_limit', 0, '2030-01-01'), false, 'limit 0: false');
select is(app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'zero_limit', -3, '2030-01-01'), false, 'negative limit: false');
select is((select count(*)::int from app.quota_usage where kind = 'zero_limit'), 0, 'limit <= 0 creates no row');

select is(app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'lowered', 3, '2030-01-01'), true, 'claim at limit 3');
select is(app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'lowered', 1, '2030-01-01'), false, 'a lowered limit at or below the usage refuses');
select is((select used from app.quota_usage where user_id = 'c0000000-0000-4000-8000-0000000000a1' and kind = 'lowered'), 1, 'and changes nothing');

select throws_ok($$select app.claim_quota(null, 'ai', 5, '2030-01-01')$$, '22023', null, 'null user refused');
select throws_ok($$select app.claim_quota('c0000000-0000-4000-8000-0000000000a1', null, 5, '2030-01-01')$$, '22023', null, 'null kind refused');
select throws_ok($$select app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'ai', null, '2030-01-01')$$, '22023', null, 'null limit refused');
select throws_ok($$select app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'ai', 5, null)$$, '22023', null, 'null day refused');
select throws_ok($$select app.claim_quota('c0000000-0000-4000-8000-0000000000a1', '', 5, '2030-01-01')$$, '22023', null, 'empty kind refused');
select throws_ok($$select app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'Bad-Kind', 5, '2030-01-01')$$, '22023', null, 'kind outside [a-z_] refused');
select throws_ok(format($$select app.claim_quota('c0000000-0000-4000-8000-0000000000a1', %L, 5, '2030-01-01')$$, repeat('a', 41)),
  '22023', null, 'kind longer than 40 characters refused');
select lives_ok(format($$select app.claim_quota('c0000000-0000-4000-8000-0000000000a1', %L, 5, '2030-01-01')$$, repeat('a', 40)),
  'kind of exactly 40 characters accepted');
select throws_ok($$select app.claim_quota('c0000000-0000-4000-8000-0000000000ff', 'ai', 5, '2030-01-01')$$, '23503', null, 'unknown user refused');

-- release_quota -------------------------------------------------------------------------------------------

select lives_ok($$select app.release_quota('c0000000-0000-4000-8000-0000000000a1', 'writing_feedback', '2030-01-01')$$, 'release runs');
select is((select used from app.quota_usage where user_id = 'c0000000-0000-4000-8000-0000000000a1' and kind = 'writing_feedback' and day = '2030-01-01'),
  1, 'release gives one unit back');
select is(app.claim_quota('c0000000-0000-4000-8000-0000000000a1', 'writing_feedback', 2, '2030-01-01'), true, 'the released unit can be claimed again');
select app.release_quota('c0000000-0000-4000-8000-0000000000a1', 'gloss', '2030-01-01');
select app.release_quota('c0000000-0000-4000-8000-0000000000a1', 'gloss', '2030-01-01');
select is((select used from app.quota_usage where user_id = 'c0000000-0000-4000-8000-0000000000a1' and kind = 'gloss'), 0, 'release never goes below 0');
select lives_ok($$select app.release_quota('c0000000-0000-4000-8000-0000000000a1', 'never_claimed', '2030-01-01')$$, 'release without a row is a no-op');
select is((select count(*)::int from app.quota_usage where kind = 'never_claimed'), 0, 'and creates no row');
select throws_ok($$select app.release_quota(null, 'ai', '2030-01-01')$$, '22023', null, 'release: null user refused');
select throws_ok($$select app.release_quota('c0000000-0000-4000-8000-0000000000a1', 'BAD', '2030-01-01')$$, '22023', null, 'release: bad kind refused');
select throws_ok($$select app.release_quota('c0000000-0000-4000-8000-0000000000a1', 'ai', null)$$, '22023', null, 'release: null day refused');

-- record_ai_call ------------------------------------------------------------------------------------------

select ok(app.record_ai_call('writing_feedback', 'claude-test', 'v1', 1000, 200, 300, 50, false, 0.012345, 'c0000000-0000-4000-8000-0000000000a1', 'ok') > 0,
  'record_ai_call returns an id');
select is((select row(purpose, model, prompt_version, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, batch, cost_usd, user_id, status)::text
           from app.ai_call where purpose = 'writing_feedback'),
  '(writing_feedback,claude-test,v1,1000,200,300,50,f,0.012345,c0000000-0000-4000-8000-0000000000a1,ok)',
  'every field is stored as given');
select lives_ok($$select app.record_ai_call('gloss', 'claude-test', null, null, null, null, null, null, null, null, 'error')$$,
  'nulls (counts, batch, cost, user, prompt version) are accepted');
select is((select row(input_tokens, output_tokens, batch, cost_usd, user_id)::text from app.ai_call where purpose = 'gloss'),
  '(0,0,f,0.000000,)', 'and default to 0 / false / no user');
select throws_ok($$select app.record_ai_call('p', 'm', null, -1, 0, 0, 0, false, 0, null, 'ok')$$, '22023', null, 'negative input tokens refused');
select throws_ok($$select app.record_ai_call('p', 'm', null, 0, -1, 0, 0, false, 0, null, 'ok')$$, '22023', null, 'negative output tokens refused');
select throws_ok($$select app.record_ai_call('p', 'm', null, 0, 0, -1, 0, false, 0, null, 'ok')$$, '22023', null, 'negative cache read tokens refused');
select throws_ok($$select app.record_ai_call('p', 'm', null, 0, 0, 0, -1, false, 0, null, 'ok')$$, '22023', null, 'negative cache write tokens refused');
select throws_ok($$select app.record_ai_call('p', 'm', null, 0, 0, 0, 0, false, -0.01, null, 'ok')$$, '22023', null, 'negative cost refused');
select throws_ok($$select app.record_ai_call('p', 'm', null, 0, 0, 0, 0, false, 0, null, 'weird')$$, '22023', null, 'unknown status refused');
select throws_ok($$select app.record_ai_call('', 'm', null, 0, 0, 0, 0, false, 0, null, 'ok')$$, '22023', null, 'empty purpose refused');
select throws_ok($$select app.record_ai_call('p', null, null, 0, 0, 0, 0, false, 0, null, 'ok')$$, '22023', null, 'null model refused');
select throws_ok($$select app.record_ai_call('p', 'm', null, 0, 0, 0, 0, false, 0, 'c0000000-0000-4000-8000-0000000000ff', 'ok')$$, '23503', null, 'unknown user refused');
select is((select count(*)::int from app.ai_call), 2, 'refused calls are not journaled');

-- ai_spend and ai_spend_month -------------------------------------------------------------------------------
-- Known rows at fixed timestamps (service_role may delete from the journal).

delete from app.ai_call;
insert into app.ai_call (purpose, model, input_tokens, output_tokens, cost_usd, status, created_at) values
  ('gloss', 'm1', 100, 10, 0.001000, 'ok', '2030-01-01 00:00:00+00'),
  ('gloss', 'm1', 200, 20, 0.002000, 'ok', '2030-01-31 23:59:59+00'),
  ('gloss', 'm2', 300, 30, 0.004000, 'error', '2030-01-15 12:00:00+00'),
  ('roleplay', 'm1', 1000, 500, 0.100000, 'ok', '2030-01-10 12:00:00+00'),
  ('gloss', 'm1', 999, 99, 5.000000, 'ok', '2030-02-01 00:00:00+00'),
  ('gloss', 'm1', 999, 99, 7.000000, 'ok', '2029-12-31 23:59:59+00');

select is((select jsonb_agg(to_jsonb(s) order by s.purpose, s.model) from app.ai_spend('2030-01-01 00:00:00+00', '2030-02-01 00:00:00+00') s),
  '[{"purpose":"gloss","model":"m1","calls":2,"input_tokens":300,"output_tokens":30,"cost_usd":0.003},
    {"purpose":"gloss","model":"m2","calls":1,"input_tokens":300,"output_tokens":30,"cost_usd":0.004},
    {"purpose":"roleplay","model":"m1","calls":1,"input_tokens":1000,"output_tokens":500,"cost_usd":0.1}]'::jsonb,
  'ai_spend groups by purpose and model; from is inclusive and to exclusive');
select is((select count(*)::int from app.ai_spend('2031-01-01', '2031-02-01')), 0, 'ai_spend: empty period gives no row');
select throws_ok($$select * from app.ai_spend(null, '2030-02-01')$$, '22023', null, 'ai_spend: null bound refused');
select throws_ok($$select * from app.ai_spend('2030-02-01', '2030-01-01')$$, '22023', null, 'ai_spend: reversed period refused');
select is(app.ai_spend_month('2030-01-20 08:00:00+00'), 0.107000::numeric, 'ai_spend_month: January total, boundaries included');
select is(app.ai_spend_month('2030-02-20 08:00:00+00'), 5.000000::numeric, 'ai_spend_month: February total');
select is(app.ai_spend_month('2030-03-20 08:00:00+00'), 0::numeric, 'ai_spend_month: empty month is 0');
select is(app.ai_spend_month('2030-01-31 23:30:00-05:00'), 5.000000::numeric, 'ai_spend_month: the month is the UTC one (23:30 at -05:00 is already February)');
select throws_ok($$select app.ai_spend_month(null)$$, '22023', null, 'ai_spend_month: null refused');

reset role;
select * from finish();
rollback;
