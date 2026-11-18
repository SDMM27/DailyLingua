-- pgTAP tests for app.save_enrollments. Run with `npm run db:test`. Everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(65);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'learner@test.invalid'),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'other@test.invalid');

-- The other user has an enrollment, an estimate and must never be touched.
insert into app.enrollment (user_id, language, daily_minutes, position)
  values ('c0000000-0000-4000-8000-0000000000f2', 'it', 15, 0);
insert into app.skill_estimate (user_id, language, skill, level_value, uncertainty, source)
  values ('c0000000-0000-4000-8000-0000000000f2', 'it', 'reading', 3.5, 0.5, 'placement');

-- Access ------------------------------------------------------------------------------------------------

set local role anon;
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":15}]')$$, '42501', null,
  'anon cannot call save_enrollments');
reset role;

select set_config('request.jwt.claims', '{}', true);
set local role authenticated;
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":15}]')$$, '28000', null,
  'a call without a signed-in user is refused');
reset role;

set local role service_role;
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":15}]')$$, '42501', null,
  'service_role cannot call it either (no auth.uid())');
reset role;

select is((select count(*)::int from app.enrollment where user_id = 'c0000000-0000-4000-8000-0000000000f1'), 0,
  'the refused calls changed nothing');

-- Nominal case: two languages ---------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select language, daily_minutes::int, days::text, target_level, purpose, position::int, active
    from app.save_enrollments('[
      {"language":"it","daily_minutes":20,"days":[1,3,5],"target_level":"B1","purpose":"travel","start_level":"A2"},
      {"language":"es","daily_minutes":15}
    ]'::jsonb)$$,
  $$values ('it', 20, '{1,3,5}', 'B1', 'travel', 0, true),
           ('es', 15, '{1,2,3,4,5,6,7}', null, null, 1, true)$$,
  'two languages are saved, in order, with the defaults (every day)');
reset role;

select is((select count(*)::int from app.enrollment where user_id = 'c0000000-0000-4000-8000-0000000000f1'), 2,
  'two enrollments exist');
select is((select count(*)::int from app.skill_estimate where user_id = 'c0000000-0000-4000-8000-0000000000f1'), 4,
  'only the language with a start level got estimates (4 skills)');
select results_eq(
  $$select skill, level_value::text, uncertainty::text, source from app.skill_estimate
    where user_id = 'c0000000-0000-4000-8000-0000000000f1' and language = 'it' order by skill$$,
  $$values ('listening', '2.50', '1.00', 'declared'), ('reading', '2.50', '1.00', 'declared'),
           ('speaking', '2.50', '1.00', 'declared'), ('writing', '2.50', '1.00', 'declared')$$,
  'A2 gives the middle of its band (2.5), uncertainty 1.0, source declared');
select ok((select app_active_since is not null from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000f1'),
  'app_active_since is set');
select is((select app_active_since from app.profile where user_id = 'c0000000-0000-4000-8000-0000000000f2'), null,
  'and only for the caller');

-- Replacement, cards kept, focus kept, estimates never overwritten --------------------------------------

update app.enrollment set focus = '{"topic":"food"}' where user_id = 'c0000000-0000-4000-8000-0000000000f1' and language = 'it';
insert into app.card (user_id, language, kind, front, state, due_at)
  values ('c0000000-0000-4000-8000-0000000000f1', 'es', 'word', 'hola', 'new', now());
update app.skill_estimate set level_value = 3.1, source = 'placement'
  where user_id = 'c0000000-0000-4000-8000-0000000000f1' and language = 'it' and skill = 'reading';

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
set local role authenticated;
select results_eq(
  $$select language, daily_minutes::int, position::int from app.save_enrollments('[
      {"language":"it","daily_minutes":30,"start_level":"C1"}
    ]')$$,
  $$values ('it', 30, 0)$$,
  'a replacement returns only the active enrollments');
reset role;

select results_eq(
  $$select language, active from app.enrollment where user_id = 'c0000000-0000-4000-8000-0000000000f1' order by language$$,
  $$values ('es', false), ('it', true)$$,
  'the language that was dropped is inactive, not deleted');
select is((select count(*)::int from app.card where user_id = 'c0000000-0000-4000-8000-0000000000f1' and language = 'es'), 1,
  'its cards remain');
select is((select focus::text from app.enrollment where user_id = 'c0000000-0000-4000-8000-0000000000f1' and language = 'it'),
  '{"topic": "food"}', 'focus is kept on update');
select is((select purpose from app.enrollment where user_id = 'c0000000-0000-4000-8000-0000000000f1' and language = 'it'), null,
  'an omitted purpose is replaced by null');
select is((select days::text from app.enrollment where user_id = 'c0000000-0000-4000-8000-0000000000f1' and language = 'it'),
  '{1,2,3,4,5,6,7}', 'and omitted days by every day');
select results_eq(
  $$select skill, level_value::text, source from app.skill_estimate
    where user_id = 'c0000000-0000-4000-8000-0000000000f1' and language = 'it' and skill in ('reading', 'writing') order by skill$$,
  $$values ('reading', '3.10', 'placement'), ('writing', '2.50', 'declared')$$,
  'existing estimates are not overwritten and no estimate is added when some exist');

-- Reactivation, idempotence, no duplicate estimates -----------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
set local role authenticated;
select results_eq(
  $$select language, position::int from app.save_enrollments('[
      {"language":"es","daily_minutes":10,"start_level":"B2"},
      {"language":"it","daily_minutes":30}
    ]')$$,
  $$values ('es', 0), ('it', 1)$$,
  'a language is reactivated and the positions follow the array');
select results_eq(
  $$select language, position::int from app.save_enrollments('[
      {"language":"es","daily_minutes":10,"start_level":"B2"},
      {"language":"it","daily_minutes":30}
    ]')$$,
  $$values ('es', 0), ('it', 1)$$,
  'the same call twice gives the same state');
reset role;

select is((select count(*)::int from app.enrollment where user_id = 'c0000000-0000-4000-8000-0000000000f1'), 2,
  'still two rows, no duplicate');
select is((select count(*)::int from app.skill_estimate where user_id = 'c0000000-0000-4000-8000-0000000000f1' and language = 'es'), 4,
  'declared estimates are created once (4 rows after two calls)');
select is((select level_value::text from app.skill_estimate
           where user_id = 'c0000000-0000-4000-8000-0000000000f1' and language = 'es' and skill = 'speaking'), '4.50',
  'B2 gives 4.5');

-- Boundary values that are valid ------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":5,"days":[7],"target_level":null,"purpose":null,"start_level":"A0"}]')$$,
  'minimum minutes, one day and explicit nulls are accepted');
select lives_ok('select * from app.save_enrollments(''[{"language":"it","daily_minutes":120,"purpose":"' || repeat('x', 200) || '"}]'')',
  '120 minutes and a 200 character purpose are accepted');
select lives_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20.0}]')$$,
  'an integral number written 20.0 is accepted');
select lives_ok($$select * from app.save_enrollments('[
  {"language":"it","daily_minutes":60,"days":[1,2,3]},{"language":"es","daily_minutes":60,"days":[1,2,3]},
  {"language":"de","daily_minutes":60,"days":[4,5,6]},{"language":"nl","daily_minutes":60,"days":[4,5,6]}]')$$,
  'four languages totalling exactly 120 minutes a day are accepted');
select is((select count(*)::int from app.save_enrollments('[{"language":"it","daily_minutes":20}]')), 1,
  'back to one language');

-- Malformed input: 22023 ----------------------------------------------------------------------------------

select throws_ok($$select * from app.save_enrollments(null)$$, '22023', null, 'null input');
select throws_ok($$select * from app.save_enrollments('{"language":"it"}')$$, '22023', null, 'an object instead of an array');
select throws_ok($$select * from app.save_enrollments('"it"')$$, '22023', null, 'a string instead of an array');
select throws_ok($$select * from app.save_enrollments('[]')$$, '22023', null, 'an empty array');
select throws_ok($$select * from app.save_enrollments('["it"]')$$, '22023', null, 'an element that is not an object');
select throws_ok($$select * from app.save_enrollments('[{"daily_minutes":20}]')$$, '22023', null, 'a missing language');
select throws_ok($$select * from app.save_enrollments('[{"language":5,"daily_minutes":20}]')$$, '22023', null, 'a numeric language');
select throws_ok($$select * from app.save_enrollments('[{"language":"it"}]')$$, '22023', null, 'missing daily_minutes');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":"20"}]')$$, '22023', null, 'daily_minutes as a string');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":null}]')$$, '22023', null, 'daily_minutes null');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":4}]')$$, '22023', null, 'daily_minutes below 5');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":121}]')$$, '22023', null, 'daily_minutes above 120');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20.5}]')$$, '22023', null, 'a fractional daily_minutes');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":1e400}]')$$, '22023', null, 'an enormous daily_minutes');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"days":[]}]')$$, '22023', null, 'empty days');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"days":[1,1]}]')$$, '22023', null, 'duplicate days');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"days":[0]}]')$$, '22023', null, 'weekday 0');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"days":[8]}]')$$, '22023', null, 'weekday 8');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"days":["1"]}]')$$, '22023', null, 'weekday as a string');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"days":[1.5]}]')$$, '22023', null, 'a fractional weekday');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"days":"1"}]')$$, '22023', null, 'days that is not an array');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"days":null}]')$$, '22023', null, 'days null');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"target_level":"A0"}]')$$, '22023', null, 'target_level A0');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"target_level":3}]')$$, '22023', null, 'target_level not a string');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"start_level":"D1"}]')$$, '22023', null, 'unknown start_level');
select throws_ok('select * from app.save_enrollments(''[{"language":"it","daily_minutes":20,"purpose":"' || repeat('x', 201) || '"}]'')', '22023', null, 'a purpose of 201 characters');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"purpose":7}]')$$, '22023', null, 'a purpose that is not text');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20,"user_id":"c0000000-0000-4000-8000-0000000000f2"}]')$$, '22023', null,
  'an unknown key (a user id for instance) is refused');

-- Domain errors -------------------------------------------------------------------------------------------

select throws_ok($$select * from app.save_enrollments('[{"language":"xx","daily_minutes":20}]')$$, '23503', null, 'an unknown language');
select throws_ok($$select * from app.save_enrollments('[{"language":"fr","daily_minutes":20}]')$$, '23514', null, 'the native language');
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20},{"language":"it","daily_minutes":20}]')$$, '23514', null,
  'a duplicate language');
select throws_ok($$select * from app.save_enrollments('[
  {"language":"it","daily_minutes":5},{"language":"es","daily_minutes":5},{"language":"de","daily_minutes":5},
  {"language":"nl","daily_minutes":5},{"language":"pt","daily_minutes":5}]')$$, '23514', null, 'more than 4 languages');
select throws_ok($$select * from app.save_enrollments('[
  {"language":"it","daily_minutes":60,"days":[1]},{"language":"es","daily_minutes":61,"days":[1]}]')$$, '23514', null,
  'more than 120 minutes on one weekday');
reset role;

select results_eq(
  $$select language, daily_minutes::int, active from app.enrollment
    where user_id = 'c0000000-0000-4000-8000-0000000000f1' and active order by language$$,
  $$values ('it', 20, true)$$,
  'every refused call left the state untouched');

-- Another user is never affected --------------------------------------------------------------------------

select results_eq(
  $$select language, daily_minutes::int, active, position::int from app.enrollment
    where user_id = 'c0000000-0000-4000-8000-0000000000f2'$$,
  $$values ('it', 15, true, 0)$$, 'the enrollments of another user are untouched');
select results_eq(
  $$select skill, level_value::text, source from app.skill_estimate where user_id = 'c0000000-0000-4000-8000-0000000000f2'$$,
  $$values ('reading', '3.50', 'placement')$$, 'and so are their estimates');

-- A language of the learner's native language cannot be learned once the profile changes -------------------

update app.profile set native_language = 'it' where user_id = 'c0000000-0000-4000-8000-0000000000f1';
select set_config('request.jwt.claims',
  '{"sub": "c0000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select * from app.save_enrollments('[{"language":"it","daily_minutes":20}]')$$, '23514', null,
  'the native language is the one of the current profile');
select is((select count(*)::int from app.save_enrollments('[{"language":"fr","daily_minutes":20}]')), 1,
  'and French becomes learnable');
reset role;

select * from finish();
rollback;
