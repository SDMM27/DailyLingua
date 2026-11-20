begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0010000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'reminder@test.invalid');
insert into app.enrollment (user_id, language, daily_minutes)
values ('c0010000-0000-4000-8000-0000000000a1', 'it', 15);
update app.profile set time_zone = 'Europe/Paris' where user_id = 'c0010000-0000-4000-8000-0000000000a1';

select ok(not has_function_privilege('anon', 'app.configure_reminder(boolean,text,boolean,text,text,text,text,boolean)', 'execute'),
  'anon cannot configure reminders');
select ok(not has_function_privilege('authenticated', 'app.reminders_due(timestamptz,uuid,uuid)', 'execute'),
  'the due list cannot be read by clients');
select ok(not has_function_privilege('authenticated', 'app.claim_reminder(uuid,date,timestamptz,text,text)', 'execute'),
  'clients cannot claim a reminder or read push keys');

select set_config('request.jwt.claims', '{"sub":"c0010000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select app.configure_reminder(true, '19:00', true,
  'https://fcm.googleapis.com/valid', 'B' || repeat('A', 86), repeat('A', 22))$$, 'the owner can opt in atomically');
reset role;

select is((select count(*) from app.reminders_due('2026-11-20 17:59:00+00', null, 'c0010000-0000-4000-8000-0000000000a1')),
  0::bigint, 'nothing is due before the chosen local time');
select is((select count(*) from app.reminders_due('2026-11-20 18:04:00+00', null, 'c0010000-0000-4000-8000-0000000000a1')),
  1::bigint, 'a due reminder respects the accepted profile time zone');
insert into app.push_subscription (user_id, endpoint, p256dh, auth, created_at)
values ('c0010000-0000-4000-8000-0000000000a1', 'https://fcm.googleapis.com/malformed', 'bad', 'bad', now() + interval '1 minute');
select results_eq(
  $$select endpoint from app.claim_reminder('c0010000-0000-4000-8000-0000000000a1', '2026-11-20', '2026-11-20 18:04:00+00', 'session', 'daily')$$,
  $$values ('https://fcm.googleapis.com/valid'::text)$$, 'only one valid device gets the reservation');
select is((select count(*) from app.claim_reminder('c0010000-0000-4000-8000-0000000000a1', '2026-11-20', '2026-11-20 18:19:00+00', 'session', 'daily')),
  0::bigint, 'retry of a reservation cannot send a second reminder');
select is((select count(*) from app.notification_log where user_id = 'c0010000-0000-4000-8000-0000000000a1'),
  1::bigint, 'one daily reservation exists');

update app.profile set reminder_time = '22:03' where user_id = 'c0010000-0000-4000-8000-0000000000a1';
select is((select count(*) from app.reminders_due('2026-11-21 21:04:00+00', null, 'c0010000-0000-4000-8000-0000000000a1')),
  1::bigint, 'a deliberately selected overnight time can be found by the quarter-hour scheduler');
select is((select count(*) from app.reminders_due('2026-11-21 21:34:00+00', null, 'c0010000-0000-4000-8000-0000000000a1')),
  0::bigint, 'the next slot outside the reminder window is skipped');
update app.profile set reminder_time = '03:55' where user_id = 'c0010000-0000-4000-8000-0000000000a1';
select is((select day from app.reminders_due('2026-11-23 03:04:00+00', null, 'c0010000-0000-4000-8000-0000000000a1')),
  '2026-11-22'::date, 'the learning date follows the scheduled slot across 04:00');

set local role authenticated;
select lives_ok($$select app.configure_reminder(false, '19:00', true, 'https://fcm.googleapis.com/valid')$$,
  'the subscribed owner can turn reminders off');
reset role;

select * from finish();
rollback;
