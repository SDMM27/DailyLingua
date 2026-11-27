-- pgTAP tests for the immersion journal (migration 20261127000100): the owner reads, nobody else does, clients
-- cannot write, the constraints hold, the entries go with the account. Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid');

insert into app.immersion_entry (id, user_id, language, day, minutes, kind) values
  ('c0000000-0000-4000-8000-000000000101', 'c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-01', 30, 'video'),
  ('c0000000-0000-4000-8000-000000000102', 'c0000000-0000-4000-8000-0000000000a2', 'it', '2030-01-01', 45, 'audio');

-- Structure -------------------------------------------------------------------------------------------

select is((select rowsecurity from pg_tables where schemaname = 'app' and tablename = 'immersion_entry'), true, 'RLS is enabled');

-- anon ------------------------------------------------------------------------------------------------

set local role anon;
select throws_ok($$select count(*) from app.immersion_entry$$, '42501', null, 'anon cannot read');
reset role;

-- authenticated ---------------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from app.immersion_entry), 1, 'a client reads its own entry only');
select is((select id from app.immersion_entry), 'c0000000-0000-4000-8000-000000000101'::uuid, 'and it is theirs');
select throws_ok($$insert into app.immersion_entry (user_id, language, day, minutes, kind)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-02', 10, 'video')$$, '42501', null, 'a client cannot insert');
select throws_ok($$update app.immersion_entry set minutes = 5$$, '42501', null, 'a client cannot update');
select throws_ok($$delete from app.immersion_entry$$, '42501', null, 'a client cannot delete');
reset role;

-- service_role and constraints ------------------------------------------------------------------------

set local role service_role;
select lives_ok($$insert into app.immersion_entry (user_id, language, day, minutes, kind)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-02', 600, 'conversation')$$, 'service_role inserts (600 minutes is allowed)');
select throws_ok($$insert into app.immersion_entry (user_id, language, day, minutes, kind)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-02', 0, 'video')$$, '23514', null, 'minutes start at 1');
select throws_ok($$insert into app.immersion_entry (user_id, language, day, minutes, kind)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-02', 601, 'video')$$, '23514', null, 'minutes stop at 600');
select throws_ok($$insert into app.immersion_entry (user_id, language, day, minutes, kind)
  values ('c0000000-0000-4000-8000-0000000000a1', 'it', '2030-01-02', 10, 'game')$$, '23514', null, 'kind is a closed list');
select throws_ok($$insert into app.immersion_entry (user_id, language, day, minutes, kind)
  values ('c0000000-0000-4000-8000-0000000000a1', 'xx', '2030-01-02', 10, 'video')$$, '23503', null, 'the language must exist');
select throws_ok($$insert into app.immersion_entry (user_id, language, day, minutes, kind)
  values ('c0000000-0000-4000-8000-0000000000ff', 'it', '2030-01-02', 10, 'video')$$, '23503', null, 'the user must exist');
select lives_ok($$update app.immersion_entry set minutes = 20 where id = 'c0000000-0000-4000-8000-000000000101'$$, 'service_role updates');
select lives_ok($$delete from app.immersion_entry where id = 'c0000000-0000-4000-8000-000000000102'$$, 'service_role deletes');
reset role;

-- Cascade -----------------------------------------------------------------------------------------------

delete from auth.users where id = 'c0000000-0000-4000-8000-0000000000a1';
select is((select count(*)::int from app.immersion_entry where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 0,
  'the entries go with the account');

select * from finish();
rollback;
