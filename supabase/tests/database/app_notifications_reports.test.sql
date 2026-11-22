-- pgTAP tests for push subscriptions, the notification log and content reports (migration
-- 20261117000500): closed list of push hosts, column privileges, ownership, limits.
-- Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(80);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'u1@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'u2@test.invalid');

insert into app.text (id, language, level_band, density, theme, prompt_version, title, body, word_count, status) values
  ('c0000000-0000-4000-8000-000000000101', 'it', 'B1', 2, 'voyage', 'v1', 'Un viaggio', 'Testo.', 1, 'published'),
  ('c0000000-0000-4000-8000-000000000102', 'it', 'B1', 2, 'cucina', 'v1', 'La cucina', 'Testo.', 1, 'checked');
insert into app.text_item (id, text_id, step, kind, position, prompt) values
  ('c0000000-0000-4000-8000-000000000201', 'c0000000-0000-4000-8000-000000000101', 'reading', 'mcq', 0, '{}'),
  ('c0000000-0000-4000-8000-000000000202', 'c0000000-0000-4000-8000-000000000102', 'reading', 'mcq', 0, '{}');
insert into app.production (id, user_id, language, mode, text) values
  ('c0000000-0000-4000-8000-000000000041', 'c0000000-0000-4000-8000-0000000000a1', 'it', 'writing', 'Ciao'),
  ('c0000000-0000-4000-8000-000000000042', 'c0000000-0000-4000-8000-0000000000a2', 'it', 'writing', 'Mio');
insert into app.correction (id, production_id, user_id, feedback, explanation_language) values
  ('c0000000-0000-4000-8000-000000000051', 'c0000000-0000-4000-8000-000000000041', 'c0000000-0000-4000-8000-0000000000a1', '{}', 'fr'),
  ('c0000000-0000-4000-8000-000000000052', 'c0000000-0000-4000-8000-000000000042', 'c0000000-0000-4000-8000-0000000000a2', '{}', 'fr');
insert into app.error_item (id, user_id, correction_id, error_ref, prompt, answer, created_day) values
  ('c0000000-0000-4000-8000-000000000061', 'c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-000000000051', 'e1', '{}', '{}', '2030-01-01'),
  ('c0000000-0000-4000-8000-000000000062', 'c0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-000000000052', 'e1', '{}', '{}', '2030-01-01');

-- Structure and privileges ------------------------------------------------------------------------------------------

select is((select count(*)::int from pg_tables where schemaname = 'app'
  and tablename in ('push_subscription', 'notification_log', 'content_report') and rowsecurity), 3, 'RLS is enabled on the three tables');
select is(
  (select count(*)::int from pg_proc p where p.pronamespace = 'app'::regnamespace
   and p.proname in ('save_push_subscription', 'delete_push_subscription', 'report_content')
   and p.prosecdef and has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute')),
  3, 'the three client functions are security definer, executable by authenticated and not by anon');
select ok(not has_function_privilege('authenticated', 'app.is_allowed_push_endpoint(text)', 'execute')
  and not has_function_privilege('anon', 'app.is_allowed_push_endpoint(text)', 'execute'),
  'the host check is internal');

-- The closed list of hosts ------------------------------------------------------------------------------------------------

select ok(app.is_allowed_push_endpoint('https://web.push.apple.com/QGxyz'), 'Apple is allowed');
select ok(app.is_allowed_push_endpoint('https://fcm.googleapis.com/fcm/send/abc'), 'Firebase is allowed');
select ok(app.is_allowed_push_endpoint('https://updates.push.services.mozilla.com/wpush/v2/abc'), 'Mozilla is allowed');
select ok(app.is_allowed_push_endpoint('https://db5p.notify.windows.com/w/?token=abc'), 'Windows notification service is allowed');
select ok(app.is_allowed_push_endpoint('https://fcm.googleapis.com:443/fcm/send/abc'), 'the default port is allowed');
select ok(not app.is_allowed_push_endpoint('http://web.push.apple.com/x'), 'http is refused');
select ok(not app.is_allowed_push_endpoint('https://example.com/x'), 'an unknown host is refused');
select ok(not app.is_allowed_push_endpoint('https://web.push.apple.com.evil.example/x'), 'a host that only starts like a service is refused');
select ok(not app.is_allowed_push_endpoint('https://evil.example/web.push.apple.com/'), 'a service name in the path is refused');
select ok(not app.is_allowed_push_endpoint('https://web.push.apple.com@evil.example/x'), 'user information is refused');
select ok(not app.is_allowed_push_endpoint('https://web.push.apple.com\@evil.example/x'), 'a backslash is refused');
select ok(not app.is_allowed_push_endpoint('https://fcm.googleapis.com:8443/x'), 'another port is refused');
select ok(not app.is_allowed_push_endpoint('https://127.0.0.1/x'), 'an IP address is refused');
select ok(not app.is_allowed_push_endpoint('https://localhost/x'), 'localhost is refused');
select ok(not app.is_allowed_push_endpoint('https://FCM.googleapis.com/x'), 'a host with capitals is refused (browsers send lowercase)');
select ok(not app.is_allowed_push_endpoint('https://fcm.googleapis.com'), 'an address without path is refused');
select ok(not app.is_allowed_push_endpoint('https://fcm.googleapis.com/ x'), 'a space is refused');
select ok(not app.is_allowed_push_endpoint('https://evil-notify.windows.com.example/x'), 'a lookalike of the Windows host is refused');
select ok(not app.is_allowed_push_endpoint('https://fcm.googleapis.com/' || repeat('a', 1000)), 'more than 1000 characters is refused');
select ok(not app.is_allowed_push_endpoint(null), 'null is refused');

-- anon and no user ------------------------------------------------------------------------------------------------------------

set local role anon;
select throws_ok($$select app.save_push_subscription('https://fcm.googleapis.com/a', 'abc', 'def', 'ua')$$, '42501', null, 'anon: save_push_subscription refused');
select throws_ok($$select app.delete_push_subscription('https://fcm.googleapis.com/a')$$, '42501', null, 'anon: delete_push_subscription refused');
select throws_ok($$select app.report_content('text', 'c0000000-0000-4000-8000-000000000101', 'other')$$, '42501', null, 'anon: report_content refused');
reset role;

set local role authenticated;
select throws_ok($$select app.save_push_subscription('https://fcm.googleapis.com/a', 'abc', 'def', 'ua')$$, '28000', null, 'no auth.uid(): save refused');
select throws_ok($$select app.report_content('text', 'c0000000-0000-4000-8000-000000000101', 'other')$$, '28000', null, 'no auth.uid(): report refused');
reset role;

-- Push subscriptions ------------------------------------------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;

select throws_ok($$select app.save_push_subscription('https://example.com/a', 'abc', 'def', 'ua')$$, '22023', null, 'a host outside the list is refused');
select throws_ok($$select app.save_push_subscription('https://fcm.googleapis.com/a', 'a b', 'def', 'ua')$$, '22023', null, 'invalid p256dh is refused');
select throws_ok($$select app.save_push_subscription('https://fcm.googleapis.com/a', 'abc', '', 'ua')$$, '22023', null, 'an empty auth key is refused');
select throws_ok($$select app.save_push_subscription('https://fcm.googleapis.com/a', null, 'def', 'ua')$$, '22023', null, 'a null key is refused');
select isnt(app.save_push_subscription('https://fcm.googleapis.com/a', 'abc', 'def', repeat('u', 400)), null, 'a valid subscription returns its id');
select is((select count(*)::int from app.push_subscription), 1, 'and is readable by its owner');
select is((select length(user_agent) from app.push_subscription), 300, 'a long user agent is cut to 300 characters');
select throws_ok($$select p256dh from app.push_subscription$$, '42501', null, 'p256dh is unreadable by a client');
select throws_ok($$select auth from app.push_subscription$$, '42501', null, 'auth is unreadable by a client');
select throws_ok($$select * from app.push_subscription$$, '42501', null, 'so is select *');
select throws_ok($$insert into app.push_subscription (user_id, endpoint, p256dh, auth)
  values ('c0000000-0000-4000-8000-0000000000a1', 'https://example.com/x', 'a', 'b')$$, '42501', null, 'a client cannot write the table directly');

select lives_ok($$select app.save_push_subscription('https://fcm.googleapis.com/a', 'abc2', 'def2', 'ua2')$$, 'saving the same endpoint again');
select is((select count(*)::int from app.push_subscription), 1, 'keeps a single row');
select lives_ok($$select app.save_push_subscription('https://web.push.apple.com/b', 'abc', 'def', null)$$, 'a second endpoint without user agent');
select is((select count(*)::int from app.push_subscription), 2, 'is a second row');

select is(app.delete_push_subscription('https://web.push.apple.com/b'), true, 'a subscription is deleted');
select is(app.delete_push_subscription('https://web.push.apple.com/b'), false, 'a second deletion reports nothing deleted');
reset role;

-- The same browser used by a second account: the endpoint is handed over; the first user cannot delete it any more.
select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a2", "role": "authenticated"}', true);
set local role authenticated;
select is(app.delete_push_subscription('https://fcm.googleapis.com/a'), false, 'a user cannot delete the subscription of another');
select throws_ok($$select app.save_push_subscription('https://fcm.googleapis.com/a', 'k1', 'k2', 'ua3')$$, '22023', null, 'knowing the endpoint is insufficient to take it over');
select lives_ok($$select app.save_push_subscription('https://fcm.googleapis.com/a', 'abc2', 'def2', 'ua3')$$, 'the same browser takes the endpoint over with the existing keys');
select is((select count(*)::int from app.push_subscription), 1, 'and reads it');
reset role;
select is((select user_id from app.push_subscription where endpoint = 'https://fcm.googleapis.com/a'),
  'c0000000-0000-4000-8000-0000000000a2'::uuid, 'the row now belongs to the second user');

-- At most 10 subscriptions per user.
set local role authenticated;
select lives_ok($$select app.save_push_subscription('https://fcm.googleapis.com/n' || g, 'abc', 'def', 'ua') from generate_series(1, 9) g$$, 'nine more subscriptions (ten in total)');
select throws_ok($$select app.save_push_subscription('https://fcm.googleapis.com/eleven', 'abc', 'def', 'ua')$$, '23514', null, 'the eleventh is refused');
select lives_ok($$select app.save_push_subscription('https://fcm.googleapis.com/n1', 'abc3', 'def3', 'ua')$$, 'renewing an existing one is still possible');
reset role;

-- Notification log ---------------------------------------------------------------------------------------------------------------

set local role service_role;
select lives_ok($$insert into app.notification_log (user_id, day, kind, template)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01', 'daily', 'daily.1')$$, 'service_role logs a notification');
select throws_ok($$insert into app.notification_log (user_id, day, kind, template)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01', 'daily', 'daily.2')$$, '23505', null, 'one notification of a kind per day');
select lives_ok($$insert into app.notification_log (user_id, day, kind, template)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-01', 'weekly_summary', 'weekly.1')$$, 'another kind the same day');
select throws_ok($$insert into app.notification_log (user_id, day, kind, template)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-02', 'promo', 'x')$$, '23514', null, 'kind is a closed list');
select throws_ok($$insert into app.notification_log (user_id, day, kind, template, status)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-02', 'daily', 'x', 'lost')$$, '23514', null, 'status is a closed list');
select lives_ok($$update app.notification_log set opened_at = now() where kind = 'daily'$$, 'a notification can be marked opened');
reset role;

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from app.notification_log), 2, 'a user reads their notification log');
select throws_ok($$insert into app.notification_log (user_id, day, kind, template)
  values ('c0000000-0000-4000-8000-0000000000a1', '2030-01-05', 'daily', 'x')$$, '42501', null, 'and cannot write it');

-- Content reports -----------------------------------------------------------------------------------------------------------------

select isnt(app.report_content('text', 'c0000000-0000-4000-8000-000000000101', 'unnatural', 'bizarre'), null, 'a published text can be reported');
select isnt(app.report_content('text_item', 'c0000000-0000-4000-8000-000000000201', 'wrong_answer'), null, 'an item of a published text can be reported');
select isnt(app.report_content('correction', 'c0000000-0000-4000-8000-000000000051', 'other'), null, 'own correction can be reported');
select isnt(app.report_content('error_item', 'c0000000-0000-4000-8000-000000000061', 'wrong_answer'), null, 'own error item can be reported');
select throws_ok($$select app.report_content('text', 'c0000000-0000-4000-8000-000000000102', 'other')$$, '23503', null, 'an unpublished text cannot');
select throws_ok($$select app.report_content('text_item', 'c0000000-0000-4000-8000-000000000202', 'other')$$, '23503', null, 'nor its item');
select throws_ok($$select app.report_content('correction', 'c0000000-0000-4000-8000-000000000052', 'other')$$, '23503', null, 'the correction of another user cannot');
select throws_ok($$select app.report_content('error_item', 'c0000000-0000-4000-8000-000000000062', 'other')$$, '23503', null, 'nor their error item');
select throws_ok($$select app.report_content('text', 'c0000000-0000-4000-8000-0000000009ff', 'other')$$, '23503', null, 'an unknown target is refused');
select throws_ok($$select app.report_content('essay', 'c0000000-0000-4000-8000-000000000101', 'other')$$, '22023', null, 'target_kind is a closed list');
select throws_ok($$select app.report_content('text', 'c0000000-0000-4000-8000-000000000101', 'boring')$$, '22023', null, 'reason is a closed list');
select throws_ok($$select app.report_content('text', 'not-a-uuid', 'other')$$, '22023', null, 'target_id must be an identifier');
select throws_ok($$select app.report_content('text', 'c0000000-0000-4000-8000-000000000101', 'other', repeat('n', 501))$$, '22023', null, 'a note is at most 500 characters');
select is((select count(*)::int from app.content_report), 4, 'the owner reads their reports');
select throws_ok($$insert into app.content_report (user_id, target_kind, target_id, reason)
  values ('c0000000-0000-4000-8000-0000000000a1', 'text', 'x', 'other')$$, '42501', null, 'a client cannot write the table directly');
reset role;

-- The daily limit: 20 reports a day, per user.
select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000a2", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(app.report_content('text', 'c0000000-0000-4000-8000-000000000101', 'other'))::int from generate_series(1, 20)), 20,
  'twenty reports in a day are accepted');
select throws_ok($$select app.report_content('text', 'c0000000-0000-4000-8000-000000000101', 'other')$$, '23514', null, 'the twenty-first is refused');
reset role;
select is((select count(*)::int from app.content_report where user_id = 'c0000000-0000-4000-8000-0000000000a1'), 4,
  'the limit of one user does not touch another');
update app.content_report set created_at = created_at - interval '2 days' where user_id = 'c0000000-0000-4000-8000-0000000000a2';
set local role authenticated;
select isnt(app.report_content('text', 'c0000000-0000-4000-8000-000000000101', 'other'), null, 'the next day the counter starts again');
reset role;

select * from finish();
rollback;
