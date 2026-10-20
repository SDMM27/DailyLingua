-- pgTAP tests for migration 20261019000400: the global cap on guest missions, reserved in a log
-- that deleting or upgrading an account does not shrink. Run with `npm run db:test`. Rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (instance_id, id, aud, role, email, is_anonymous) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', null, true),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', null, true),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', null, true);

-- The cap leaves room for exactly two more reservations, whatever the local data already holds.
create temporary table cap on commit drop as
  select (count(*) + 2)::integer as n
  from public.guest_mission_reservations where created_at >= now() - interval '24 hours';
grant select on cap to service_role;

set local role service_role;
select ok(public.reserve_guest_mission('a0000000-0000-4000-8000-0000000000c1', current_date, (select n from cap)),
  'a first guest gets a slot');
select ok(public.reserve_guest_mission('a0000000-0000-4000-8000-0000000000c1', current_date, (select n from cap)),
  'asking again for the same guest and day is allowed');
select ok(public.reserve_guest_mission('a0000000-0000-4000-8000-0000000000c2', current_date, (select n from cap)),
  'the retry did not use a slot: a second guest still gets one');
select ok(not public.reserve_guest_mission('a0000000-0000-4000-8000-0000000000c3', current_date, (select n from cap)),
  'a third guest is refused once the cap is reached');
reset role;

-- Deleting a guest (its missions cascade away) or upgrading it must not free a slot.
delete from auth.users where id = 'a0000000-0000-4000-8000-0000000000c1';
update auth.users set is_anonymous = false, email = 'upgraded-cap@test.invalid'
where id = 'a0000000-0000-4000-8000-0000000000c2';

set local role service_role;
select ok(not public.reserve_guest_mission('a0000000-0000-4000-8000-0000000000c3', current_date, (select n from cap)),
  'deleting or upgrading guest accounts does not free their slots');
reset role;

select is((select count(*)::int from public.guest_mission_reservations
  where user_id in ('a0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-0000000000c2')), 2,
  'the reservations outlive the accounts');

-- Privileges ----------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "a0000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.reserve_guest_mission('a0000000-0000-4000-8000-0000000000c3', current_date, 1000)$$,
  '42501', null, 'a user cannot reserve a slot directly');
select throws_ok($$delete from public.guest_mission_reservations$$, '42501', null,
  'a user cannot erase the reservations');
reset role;
set local role anon;
select throws_ok($$select public.reserve_guest_mission('a0000000-0000-4000-8000-0000000000c3', current_date, 1000)$$,
  '42501', null, 'anon cannot reserve a slot');
reset role;

select * from finish();
rollback;
