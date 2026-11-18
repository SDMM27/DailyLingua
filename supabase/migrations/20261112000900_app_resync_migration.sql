-- Schema `app`: the data migration becomes a full, replayable RESYNCHRONISATION (review E1, E2, M1, M6, F2, F6).
--
-- app.migrate_user(user):
--  * while profile.app_active_since is null (the user has not written in the new app), the copy in app is
--    realigned on public at every run: changed rows are updated, new rows added, deleted source rows are
--    removed from the copy (a card is marked deleted_at, never physically deleted: its review journal stays);
--  * as soon as app_active_since is set, nothing is touched and {"skipped": "active"} is returned;
--  * a run on unchanged data writes nothing at all (every UPDATE is guarded by IS DISTINCT FROM);
--  * native_language and ui_language are copied once, when the profile is first stamped, never overwritten.
-- app.migrate_all(): one global advisory lock for the whole run; the error of one user is reported in the
--   result ("errors") and does not cancel the others. For a big base, call migrate_user user by user
--   (scripts/migration-verify.mts): one transaction each.
-- The archive (legacy_record) follows its source and is never purged.

-- F6. legacy_map knows its owner and goes with the account.
alter table app.legacy_map add column user_id uuid references auth.users (id) on delete cascade;

update app.legacy_map m
set user_id = x.user_id
from (
  select 'profile' as t, p.user_id::text as id, p.user_id from app.profile p
  union all select 'enrollment', e.id::text, e.user_id from app.enrollment e
  union all select 'skill_estimate', s.user_id::text || '/' || s.language || '/' || s.skill, s.user_id
    from app.skill_estimate s
  union all select 'card_list', l.id::text, l.user_id from app.card_list l
  union all select 'card', c.id::text, c.user_id from app.card c
  union all select 'review_log', r.id::text, r.user_id from app.review_log r
  union all select 'production', p.id::text, p.user_id from app.production p
  union all select 'correction', c.id::text, c.user_id from app.correction c
  union all select 'assessment_result', a.id::text, a.user_id from app.assessment_result a
) x
where m.app_table = x.t and m.app_id = x.id;

-- Entries whose row of app no longer exists have no owner left: they are dropped.
delete from app.legacy_map where user_id is null;
alter table app.legacy_map alter column user_id set not null;
create index legacy_map_user_idx on app.legacy_map (user_id);

-- A card marked deleted does not hold its reference: the same grammar point can be copied again.
drop index app.card_ref_idx;
create unique index card_ref_idx on app.card (user_id, language, kind, ref)
  where ref is not null and deleted_at is null;

-- Sources, as the target rows they must give (internal: executable by nobody, used by the functions below) -----

create function app.legacy_cards(p_user_id uuid)
returns table (
  legacy_table text, legacy_id text, language text, kind text, ref text, front text, back text,
  back_language text, context text, legacy_list_id text, state text, stability real, due_at timestamptz,
  last_review_at timestamptz, reps integer, lapses integer, legacy_box smallint, payload jsonb,
  created_at timestamptz, updated_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  with tz as (select p.time_zone as z from public.profiles p where p.id = p_user_id)
  select 'vocabulary_items'::text, vi.id::text, vi.language, 'word'::text, null::text, vi.term, vi.translation,
    'fr'::text, vi.example, vi.list_id::text,
    (case when vi.status = 'known' then 'known'
          when vi.last_reviewed_on is null then 'new'
          else 'review' end)::text,
    app.leitner_interval(vi.box),
    ((vi.due_on + time '04:00') at time zone tz.z),
    case when vi.last_reviewed_on is not null then ((vi.last_reviewed_on + time '12:00') at time zone tz.z) end,
    vi.review_count,
    (select count(*) from public.vocabulary_reviews vr where vr.item_id = vi.id and vr.grade = 'again')::integer,
    vi.box,
    jsonb_strip_nulls(jsonb_build_object(
      'definition', vi.definition, 'source_name', vi.source_name, 'source_url', vi.source_url,
      'content_id', vi.content_id, 'status', vi.status, 'added_on', vi.added_on
    )),
    vi.created_at, vi.updated_at
  from public.vocabulary_items vi cross join tz
  where vi.user_id = p_user_id
  union all
  select 'grammar_cards'::text, g.id::text, g.language, 'grammar'::text, g.point_id, g.point_id, null::text,
    null::text, null::text, null::text,
    (case when g.status = 'known' then 'known' when g.last_reviewed_on is null then 'new' else 'review' end)::text,
    app.leitner_interval(g.box),
    ((g.due_on + time '04:00') at time zone tz.z),
    case when g.last_reviewed_on is not null then ((g.last_reviewed_on + time '12:00') at time zone tz.z) end,
    g.review_count, 0, g.box,
    jsonb_build_object('status', g.status, 'added_on', g.added_on),
    g.created_at, g.updated_at
  from public.grammar_cards g cross join tz
  where g.user_id = p_user_id
  union all
  select 'alphabet_cards'::text, a.id::text, a.language, 'script'::text, a.group_id, a.group_id, null::text,
    null::text, null::text, null::text,
    (case when a.status = 'known' then 'known' when a.last_reviewed_on is null then 'new' else 'review' end)::text,
    app.leitner_interval(a.box),
    ((a.due_on + time '04:00') at time zone tz.z),
    case when a.last_reviewed_on is not null then ((a.last_reviewed_on + time '12:00') at time zone tz.z) end,
    a.review_count, 0, a.box,
    jsonb_build_object('status', a.status, 'added_on', a.added_on),
    a.created_at, a.updated_at
  from public.alphabet_cards a cross join tz
  where a.user_id = p_user_id
  union all
  select 'correction_cards'::text, cc.id::text, cc.language, 'correction'::text, null::text, cc.original,
    cc.corrected, cc.language, null::text, null::text,
    (case when cc.status = 'known' then 'known' when cc.last_reviewed_on is null then 'new' else 'review' end)::text,
    app.leitner_interval(cc.box),
    ((cc.due_on + time '04:00') at time zone tz.z),
    case when cc.last_reviewed_on is not null then ((cc.last_reviewed_on + time '12:00') at time zone tz.z) end,
    cc.review_count, 0, cc.box,
    jsonb_strip_nulls(jsonb_build_object(
      'category', cc.category, 'explanation', cc.explanation, 'correction_index', cc.correction_index,
      'legacy_session_id', cc.session_id, 'production_id', pm.app_id, 'status', cc.status,
      'added_on', cc.added_on
    )),
    cc.created_at, cc.updated_at
  from public.correction_cards cc cross join tz
  left join app.legacy_map pm
    on pm.user_id = p_user_id and pm.legacy_table = 'production_entries'
       and pm.legacy_id = cc.session_id::text and pm.app_table = 'production'
  where cc.user_id = p_user_id;
$$;

create function app.legacy_productions(p_user_id uuid)
returns table (legacy_id text, language text, mode text, task jsonb, body text, created_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select pe.session_id::text, ms.language,
    case when ms.production ->> 'mode' in ('writing', 'spoken', 'speaking')
         then ms.production ->> 'mode' else 'writing' end,
    coalesce(ms.production, '{}'::jsonb)
      || jsonb_build_object('legacy_session_id', ms.id, 'legacy_mission_id', ms.mission_id),
    pe.body, pe.created_at
  from public.production_entries pe
  join public.mission_sessions ms on ms.id = pe.session_id
  where pe.user_id = p_user_id;
$$;

create function app.legacy_assessments(p_user_id uuid)
returns table (
  legacy_table text, legacy_id text, language text, kind text, taken_at timestamptz, levels jsonb, payload jsonb
)
language sql
stable
set search_path = ''
as $$
  select 'placement_tests'::text, pt.id::text, pt.language, 'placement'::text, pt.taken_at,
    jsonb_strip_nulls(jsonb_build_object(
      'reception', pt.chosen_level, 'estimated', pt.estimated_level, 'start', pt.start_level
    )),
    to_jsonb(pt)
  from public.placement_tests pt
  where pt.user_id = p_user_id
  union all
  select 'assessments'::text, a.id::text, a.language, 'assessment'::text, coalesce(a.graded_at, a.started_at),
    case when a.results is null then '{}'::jsonb
         else jsonb_strip_nulls(jsonb_build_object(
           'reading', a.results -> 'reading' ->> 'level',
           'listening', a.results -> 'listening' ->> 'level',
           'writing', a.results -> 'writing' ->> 'level',
           'speaking', a.results -> 'speaking' ->> 'level'
         )) end,
    to_jsonb(a)
  from public.assessments a
  where a.user_id = p_user_id;
$$;

revoke execute on function
  app.legacy_cards(uuid), app.legacy_productions(uuid), app.legacy_assessments(uuid)
from public, anon, authenticated;

-- migrate_user ---------------------------------------------------------------------------------

create or replace function app.migrate_user(p_user_id uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.profiles;
  v_active timestamptz;
  v_guest boolean;
  v_base smallint;
  v_n integer;
  v_counts jsonb := '{}';
  v_counts_cards jsonb;
begin
  -- One global lock for the whole migration (not one per user: a long run would exhaust the lock table).
  perform set_config('lock_timeout', '5s', true);
  perform pg_advisory_xact_lock(hashtextextended('app.migrate', 0));

  select ap.app_active_since into v_active from app.profile ap where ap.user_id = p_user_id;
  if v_active is not null then
    return jsonb_build_object('skipped', 'active');
  end if;

  select p.* into v_p from public.profiles p where p.id = p_user_id;
  if not found then
    raise exception 'no public.profiles row for user %', p_user_id using errcode = 'P0002';
  end if;
  select coalesce(u.is_anonymous, false) into v_guest from auth.users u where u.id = p_user_id;

  -- A language added to public since the schema was created.
  insert into app.language (code) select l.code from public.languages l on conflict (code) do nothing;

  -- profiles -> profile. Languages are copied when the profile is first stamped, never overwritten.
  with up as (
    insert into app.profile as ap (
      user_id, native_language, ui_language, time_zone, reminder_time, game_settings, is_guest,
      legacy_migrated_at, created_at
    ) values (
      p_user_id, 'fr', 'fr', v_p.time_zone, v_p.generation_time,
      jsonb_build_object('streak', v_p.show_streak), v_guest, now(), v_p.created_at
    )
    on conflict (user_id) do update
      set native_language = case when ap.legacy_migrated_at is null then excluded.native_language else ap.native_language end,
          ui_language = case when ap.legacy_migrated_at is null then excluded.ui_language else ap.ui_language end,
          time_zone = excluded.time_zone,
          reminder_time = excluded.reminder_time,
          game_settings = excluded.game_settings,
          is_guest = excluded.is_guest,
          legacy_migrated_at = coalesce(ap.legacy_migrated_at, excluded.legacy_migrated_at)
      where ap.app_active_since is null
        and (ap.legacy_migrated_at is null
             or (ap.time_zone, ap.reminder_time, ap.game_settings, ap.is_guest)
                is distinct from (excluded.time_zone, excluded.reminder_time, excluded.game_settings, excluded.is_guest))
    returning ap.user_id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id, user_id)
    select 'profiles', up.user_id::text, 'profile', up.user_id::text, up.user_id from up
    on conflict do nothing
  )
  select count(*) into v_n from up;
  v_counts := v_counts || jsonb_build_object('profile', v_n);

  -- user_languages -> enrollment: removed, updated, added (in this order: a language dropped and added
  -- again must not collide with its old copy).
  with gone as (
    select m.legacy_id, m.app_id from app.legacy_map m
    where m.user_id = p_user_id and m.legacy_table = 'user_languages' and m.app_table = 'enrollment'
      and not exists (select 1 from public.user_languages ul where ul.id::text = m.legacy_id)
  ), d1 as (
    delete from app.enrollment e using gone where e.id = gone.app_id::uuid and e.user_id = p_user_id returning e.id
  ), d2 as (
    delete from app.legacy_map m using gone
    where m.user_id = p_user_id and m.legacy_table = 'user_languages' and m.legacy_id = gone.legacy_id
      and m.app_table = 'enrollment'
  )
  select count(*) into v_n from d1;
  v_counts := v_counts || jsonb_build_object('enrollment_deleted', v_n);

  update app.enrollment e
  set purpose = s.purpose, target_level = s.target_level, daily_minutes = s.daily_minutes, days = s.days,
      focus = s.focus
  from (
    select ul.id::text as lid, ul.purpose, ul.target_level,
      greatest(least(ul.weight, 120), 5)::smallint as daily_minutes, ul.days,
      jsonb_build_object('text', ul.focus, 'topics', to_jsonb(ul.topics), 'content_types', to_jsonb(ul.content_types))
        as focus
    from public.user_languages ul where ul.user_id = p_user_id
  ) s
  join app.legacy_map m
    on m.user_id = p_user_id and m.legacy_table = 'user_languages' and m.legacy_id = s.lid and m.app_table = 'enrollment'
  where e.id = m.app_id::uuid and e.user_id = p_user_id
    and (e.purpose, e.target_level, e.daily_minutes, e.days, e.focus)
        is distinct from (s.purpose, s.target_level, s.daily_minutes, s.days, s.focus);
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('enrollment_updated', v_n);

  v_base := coalesce((select max(e.position) + 1 from app.enrollment e where e.user_id = p_user_id), 0);
  with src as materialized (
    select ul.id as legacy_id, gen_random_uuid() as new_id, ul.language, ul.purpose, ul.target_level,
      greatest(least(ul.weight, 120), 5)::smallint as daily_minutes, ul.days,
      jsonb_build_object('text', ul.focus, 'topics', to_jsonb(ul.topics), 'content_types', to_jsonb(ul.content_types))
        as focus,
      (v_base + row_number() over (order by ul.created_at, ul.language) - 1)::smallint as pos,
      ul.created_at, ul.updated_at
    from public.user_languages ul
    where ul.user_id = p_user_id
      and not exists (
        select 1 from app.legacy_map m
        where m.legacy_table = 'user_languages' and m.legacy_id = ul.id::text and m.app_table = 'enrollment'
      )
  ), ins as (
    insert into app.enrollment (
      id, user_id, language, purpose, target_level, daily_minutes, days, focus, position, created_at, updated_at
    )
    select s.new_id, p_user_id, s.language, s.purpose, s.target_level, s.daily_minutes, s.days, s.focus,
      s.pos, s.created_at, s.updated_at
    from src s
    on conflict (user_id, language) do nothing
    returning id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id, user_id)
    select 'user_languages', s.legacy_id::text, 'enrollment', s.new_id::text, p_user_id
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('enrollment', v_n);

  -- user_languages.level / production_level -> skill_estimate (reading, listening, writing; never speaking).
  -- Only the estimates of origin legacy are realigned.
  with gone as (
    select m.legacy_id, m.app_id from app.legacy_map m
    where m.user_id = p_user_id and m.legacy_table = 'user_languages' and m.app_table = 'skill_estimate'
      and not exists (select 1 from public.user_languages ul where ul.id::text = split_part(m.legacy_id, ':', 1))
  ), d1 as (
    delete from app.skill_estimate se using gone
    where se.user_id = p_user_id and se.language = split_part(gone.app_id, '/', 2)
      and se.skill = split_part(gone.app_id, '/', 3) and se.source = 'legacy'
    returning se.skill
  ), d2 as (
    delete from app.legacy_map m using gone
    where m.user_id = p_user_id and m.legacy_table = 'user_languages' and m.legacy_id = gone.legacy_id
      and m.app_table = 'skill_estimate'
  )
  select count(*) into v_n from d1;
  v_counts := v_counts || jsonb_build_object('skill_estimate_deleted', v_n);

  update app.skill_estimate se
  set level_value = s.level_value
  from (
    select ul.language, k.skill, app.legacy_level_value(k.level) as level_value
    from public.user_languages ul
    cross join lateral (values
      ('reading', ul.level), ('listening', ul.level), ('writing', coalesce(ul.production_level, ul.level))
    ) as k (skill, level)
    where ul.user_id = p_user_id
  ) s
  where se.user_id = p_user_id and se.language = s.language and se.skill = s.skill and se.source = 'legacy'
    and se.level_value is distinct from s.level_value;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('skill_estimate_updated', v_n);

  with src as materialized (
    select ul.id::text || ':' || k.skill as legacy_id, ul.language, k.skill,
      app.legacy_level_value(k.level) as level_value
    from public.user_languages ul
    cross join lateral (values
      ('reading', ul.level), ('listening', ul.level), ('writing', coalesce(ul.production_level, ul.level))
    ) as k (skill, level)
    where ul.user_id = p_user_id
      and not exists (
        select 1 from app.legacy_map m
        where m.legacy_table = 'user_languages' and m.legacy_id = ul.id::text || ':' || k.skill
          and m.app_table = 'skill_estimate'
      )
  ), ins as (
    insert into app.skill_estimate (user_id, language, skill, level_value, uncertainty, source)
    select p_user_id, s.language, s.skill, s.level_value, 0.5, 'legacy' from src s
    on conflict (user_id, language, skill) do nothing
    returning language, skill
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id, user_id)
    select 'user_languages', s.legacy_id, 'skill_estimate', p_user_id::text || '/' || s.language || '/' || s.skill,
      p_user_id
    from src s join ins on ins.language = s.language and ins.skill = s.skill
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('skill_estimate', v_n);

  -- production_entries -> production, writing_feedback -> correction: removed, updated, added.
  with gone as (
    select m.legacy_id, m.app_id from app.legacy_map m
    where m.user_id = p_user_id and m.legacy_table = 'writing_feedback' and m.app_table = 'correction'
      and not exists (
        select 1 from public.writing_feedback wf
        join public.production_entries pe on pe.session_id = wf.session_id
        where wf.session_id::text = m.legacy_id and wf.feedback is not null
      )
  ), d1 as (
    delete from app.correction c using gone where c.id = gone.app_id::uuid and c.user_id = p_user_id returning c.id
  ), d2 as (
    delete from app.legacy_map m using gone
    where m.user_id = p_user_id and m.legacy_table = 'writing_feedback' and m.legacy_id = gone.legacy_id
      and m.app_table = 'correction'
  )
  select count(*) into v_n from d1;
  v_counts := v_counts || jsonb_build_object('correction_deleted', v_n);

  with gone as (
    select m.legacy_id, m.app_id from app.legacy_map m
    where m.user_id = p_user_id and m.legacy_table = 'production_entries' and m.app_table = 'production'
      and not exists (select 1 from public.production_entries pe where pe.session_id::text = m.legacy_id)
  ), dc as (
    -- the correction goes with its production (cascade): forget its map entry too
    delete from app.legacy_map x using app.correction c, gone
    where x.user_id = p_user_id and x.app_table = 'correction' and x.app_id = c.id::text
      and c.production_id = gone.app_id::uuid
  ), dp as (
    delete from app.production pr using gone where pr.id = gone.app_id::uuid and pr.user_id = p_user_id returning pr.id
  ), dm as (
    delete from app.legacy_map x using gone
    where x.user_id = p_user_id and x.legacy_table = 'production_entries' and x.legacy_id = gone.legacy_id
      and x.app_table = 'production'
  )
  select count(*) into v_n from dp;
  v_counts := v_counts || jsonb_build_object('production_deleted', v_n);

  update app.production pr
  set text = s.body, mode = s.mode, task = s.task
  from app.legacy_productions(p_user_id) s
  join app.legacy_map m
    on m.user_id = p_user_id and m.legacy_table = 'production_entries' and m.legacy_id = s.legacy_id
       and m.app_table = 'production'
  where pr.id = m.app_id::uuid and pr.user_id = p_user_id
    and (pr.text, pr.mode, pr.task) is distinct from (s.body, s.mode, s.task);
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('production_updated', v_n);

  with src as materialized (
    select s.*, gen_random_uuid() as new_id
    from app.legacy_productions(p_user_id) s
    where not exists (
      select 1 from app.legacy_map m
      where m.legacy_table = 'production_entries' and m.legacy_id = s.legacy_id and m.app_table = 'production'
    )
  ), ins as (
    insert into app.production (id, user_id, language, mode, task, text, created_at)
    select s.new_id, p_user_id, s.language, s.mode, s.task, s.body, s.created_at from src s
    returning id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id, user_id)
    select 'production_entries', s.legacy_id, 'production', s.new_id::text, p_user_id
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('production', v_n);

  update app.correction c
  set feedback = wf.feedback, model = wf.model, prompt_version = wf.prompt_version,
      input_tokens = wf.input_tokens, output_tokens = wf.output_tokens
  from public.writing_feedback wf
  join app.legacy_map m
    on m.user_id = p_user_id and m.legacy_table = 'writing_feedback' and m.legacy_id = wf.session_id::text
       and m.app_table = 'correction'
  where wf.user_id = p_user_id and wf.feedback is not null and c.id = m.app_id::uuid and c.user_id = p_user_id
    and (c.feedback, c.model, c.prompt_version, c.input_tokens, c.output_tokens)
        is distinct from (wf.feedback, wf.model, wf.prompt_version, wf.input_tokens, wf.output_tokens);
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('correction_updated', v_n);

  with src as materialized (
    select wf.session_id as legacy_id, gen_random_uuid() as new_id, ap.id as production_id, wf.feedback,
      wf.model, wf.prompt_version, wf.input_tokens, wf.output_tokens,
      coalesce(wf.reviewed_at, wf.created_at) as created_at
    from public.writing_feedback wf
    join app.legacy_map pm
      on pm.user_id = p_user_id and pm.legacy_table = 'production_entries' and pm.legacy_id = wf.session_id::text
         and pm.app_table = 'production'
    join app.production ap on ap.id = pm.app_id::uuid
    where wf.user_id = p_user_id and wf.feedback is not null
      and not exists (
        select 1 from app.legacy_map m
        where m.legacy_table = 'writing_feedback' and m.legacy_id = wf.session_id::text
          and m.app_table = 'correction'
      )
  ), ins as (
    insert into app.correction (
      id, production_id, user_id, feedback, explanation_language, model, prompt_version, input_tokens,
      output_tokens, created_at
    )
    select s.new_id, s.production_id, p_user_id, s.feedback, 'fr', s.model, s.prompt_version, s.input_tokens,
      s.output_tokens, s.created_at
    from src s
    on conflict (production_id) do nothing
    returning id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id, user_id)
    select 'writing_feedback', s.legacy_id::text, 'correction', s.new_id::text, p_user_id
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('correction', v_n);

  -- vocabulary_lists -> card_list: updated and added here, removed after the cards (below).
  update app.card_list l
  set name = s.name, description = s.description, active = s.active
  from public.vocabulary_lists s
  join app.legacy_map m
    on m.user_id = p_user_id and m.legacy_table = 'vocabulary_lists' and m.legacy_id = s.id::text
       and m.app_table = 'card_list'
  where s.user_id = p_user_id and l.id = m.app_id::uuid and l.user_id = p_user_id
    and (l.name, l.description, l.active) is distinct from (s.name, s.description, s.active);
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('card_list_updated', v_n);

  with src as materialized (
    select vl.id as legacy_id, gen_random_uuid() as new_id, vl.language, vl.name, vl.description, vl.active,
      vl.created_at
    from public.vocabulary_lists vl
    where vl.user_id = p_user_id
      and not exists (
        select 1 from app.legacy_map m
        where m.legacy_table = 'vocabulary_lists' and m.legacy_id = vl.id::text and m.app_table = 'card_list'
      )
  ), ins as (
    insert into app.card_list (id, user_id, language, name, description, active, created_at)
    select s.new_id, p_user_id, s.language, s.name, s.description, s.active, s.created_at from src s
    on conflict (user_id, language, name) do nothing
    returning id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id, user_id)
    select 'vocabulary_lists', s.legacy_id::text, 'card_list', s.new_id::text, p_user_id
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('card_list', v_n);

  -- Cards (word, grammar, script, correction). Source gone: the card is marked deleted, its journal stays.
  update app.card c
  set deleted_at = now()
  from app.legacy_map m
  where m.user_id = p_user_id and m.app_table = 'card'
    and m.legacy_table in ('vocabulary_items', 'grammar_cards', 'alphabet_cards', 'correction_cards')
    and c.id = m.app_id::uuid and c.user_id = p_user_id and c.deleted_at is null
    and not exists (
      select 1 from app.legacy_cards(p_user_id) s where s.legacy_table = m.legacy_table and s.legacy_id = m.legacy_id
    );
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('card_deleted', v_n);

  update app.card c
  set front = s.front, back = s.back, context = s.context, list_id = ml.app_id::uuid, state = s.state,
      stability = s.stability, due_at = s.due_at, last_review_at = s.last_review_at, reps = s.reps,
      lapses = s.lapses, legacy_box = s.legacy_box, payload = s.payload
  from app.legacy_cards(p_user_id) s
  join app.legacy_map m
    on m.user_id = p_user_id and m.legacy_table = s.legacy_table and m.legacy_id = s.legacy_id and m.app_table = 'card'
  left join app.legacy_map ml
    on ml.user_id = p_user_id and ml.legacy_table = 'vocabulary_lists' and ml.legacy_id = s.legacy_list_id
       and ml.app_table = 'card_list'
  where c.id = m.app_id::uuid and c.user_id = p_user_id and c.deleted_at is null
    and (c.front, c.back, c.context, c.list_id, c.state, c.stability, c.due_at, c.last_review_at, c.reps, c.lapses,
         c.legacy_box, c.payload)
        is distinct from
        (s.front, s.back, s.context, ml.app_id::uuid, s.state, s.stability, s.due_at, s.last_review_at, s.reps,
         s.lapses, s.legacy_box, s.payload);
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('card_updated', v_n);

  with src as materialized (
    select s.*, gen_random_uuid() as new_id, ml.app_id::uuid as list_id
    from app.legacy_cards(p_user_id) s
    left join app.legacy_map ml
      on ml.user_id = p_user_id and ml.legacy_table = 'vocabulary_lists' and ml.legacy_id = s.legacy_list_id
         and ml.app_table = 'card_list'
    where not exists (
      select 1 from app.legacy_map m
      where m.legacy_table = s.legacy_table and m.legacy_id = s.legacy_id and m.app_table = 'card'
    )
  ), ins as (
    insert into app.card (
      id, user_id, language, kind, ref, front, back, back_language, context, list_id, state, stability, difficulty,
      due_at, last_review_at, reps, lapses, legacy_box, source, payload, created_at, updated_at
    )
    select s.new_id, p_user_id, s.language, s.kind, s.ref, s.front, s.back, s.back_language, s.context, s.list_id,
      s.state, s.stability, 5.0, s.due_at, s.last_review_at, s.reps, s.lapses, s.legacy_box, 'legacy', s.payload,
      s.created_at, s.updated_at
    from src s
    on conflict (user_id, language, kind, ref) where ref is not null and deleted_at is null do nothing
    returning id, kind
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id, user_id)
    select s.legacy_table, s.legacy_id, 'card', s.new_id::text, p_user_id
    from src s join ins on ins.id = s.new_id
  )
  select jsonb_build_object(
    'card_word', count(*) filter (where kind = 'word'),
    'card_grammar', count(*) filter (where kind = 'grammar'),
    'card_script', count(*) filter (where kind = 'script'),
    'card_correction', count(*) filter (where kind = 'correction')
  ) into v_counts_cards from ins;
  v_counts := v_counts || v_counts_cards;

  -- vocabulary_lists removed from the source: the copy goes (its cards stay, without a list).
  with gone as (
    select m.legacy_id, m.app_id from app.legacy_map m
    where m.user_id = p_user_id and m.legacy_table = 'vocabulary_lists' and m.app_table = 'card_list'
      and not exists (select 1 from public.vocabulary_lists vl where vl.id::text = m.legacy_id)
  ), d1 as (
    delete from app.card_list l using gone where l.id = gone.app_id::uuid and l.user_id = p_user_id returning l.id
  ), d2 as (
    delete from app.legacy_map m using gone
    where m.user_id = p_user_id and m.legacy_table = 'vocabulary_lists' and m.legacy_id = gone.legacy_id
      and m.app_table = 'card_list'
  )
  select count(*) into v_n from d1;
  v_counts := v_counts || jsonb_build_object('card_list_deleted', v_n);

  -- vocabulary_reviews -> review_log (journal: only ever added). The review instant is the local noon of
  -- the review day (spec); the real instant is kept in created_at.
  with src as materialized (
    select o.*, nextval(pg_get_serial_sequence('app.review_log', 'id')) as new_id
    from (
      select vr.id as legacy_id, mc.app_id::uuid as card_id,
        case vr.grade when 'again' then 1 when 'hard' then 2 when 'good' then 3 else 4 end::smallint as rating,
        vr.mode,
        ((vr.reviewed_on + time '12:00') at time zone v_p.time_zone) as reviewed_at,
        vr.days_since_last::real as elapsed_days,
        (vr.due_on_after - vr.reviewed_on)::real as scheduled_days,
        vr.reviewed_at as created_at
      from public.vocabulary_reviews vr
      join app.legacy_map mc
        on mc.user_id = p_user_id and mc.legacy_table = 'vocabulary_items' and mc.legacy_id = vr.item_id::text
           and mc.app_table = 'card'
      where vr.user_id = p_user_id
        and not exists (
          select 1 from app.legacy_map m
          where m.legacy_table = 'vocabulary_reviews' and m.legacy_id = vr.id::text and m.app_table = 'review_log'
        )
      order by vr.reviewed_on, vr.reviewed_at, vr.id
    ) o
  ), ins as (
    insert into app.review_log (
      id, user_id, card_id, rating, mode, reviewed_at, elapsed_days, scheduled_days, origin, created_at
    )
    overriding system value
    select s.new_id, p_user_id, s.card_id, s.rating, s.mode, s.reviewed_at, s.elapsed_days, s.scheduled_days,
      'leitner', s.created_at
    from src s
    returning id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id, user_id)
    select 'vocabulary_reviews', s.legacy_id::text, 'review_log', s.new_id::text, p_user_id
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('review_log', v_n);

  -- placement_tests, assessments -> assessment_result: removed, updated, added.
  with gone as (
    select m.legacy_table, m.legacy_id, m.app_id from app.legacy_map m
    where m.user_id = p_user_id and m.app_table = 'assessment_result'
      and m.legacy_table in ('placement_tests', 'assessments')
      and not exists (
        select 1 from app.legacy_assessments(p_user_id) s
        where s.legacy_table = m.legacy_table and s.legacy_id = m.legacy_id
      )
  ), d1 as (
    delete from app.assessment_result r using gone where r.id = gone.app_id::uuid and r.user_id = p_user_id
    returning r.id
  ), d2 as (
    delete from app.legacy_map m using gone
    where m.user_id = p_user_id and m.legacy_table = gone.legacy_table and m.legacy_id = gone.legacy_id
      and m.app_table = 'assessment_result'
  )
  select count(*) into v_n from d1;
  v_counts := v_counts || jsonb_build_object('assessment_deleted', v_n);

  update app.assessment_result r
  set taken_at = s.taken_at, levels = s.levels, payload = s.payload
  from app.legacy_assessments(p_user_id) s
  join app.legacy_map m
    on m.user_id = p_user_id and m.legacy_table = s.legacy_table and m.legacy_id = s.legacy_id
       and m.app_table = 'assessment_result'
  where r.id = m.app_id::uuid and r.user_id = p_user_id
    and (r.taken_at, r.levels, r.payload) is distinct from (s.taken_at, s.levels, s.payload);
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('assessment_updated', v_n);

  with src as materialized (
    select s.*, gen_random_uuid() as new_id
    from app.legacy_assessments(p_user_id) s
    where not exists (
      select 1 from app.legacy_map m
      where m.legacy_table = s.legacy_table and m.legacy_id = s.legacy_id and m.app_table = 'assessment_result'
    )
  ), ins as (
    insert into app.assessment_result (id, user_id, language, kind, taken_at, levels, payload)
    select s.new_id, p_user_id, s.language, s.kind, s.taken_at, s.levels, s.payload from src s
    returning id, kind
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id, user_id)
    select s.legacy_table, s.legacy_id, 'assessment_result', s.new_id::text, p_user_id
    from src s join ins on ins.id = s.new_id
  )
  select jsonb_build_object(
    'assessment_placement', count(*) filter (where kind = 'placement'),
    'assessment_assessment', count(*) filter (where kind = 'assessment')
  ) into v_counts_cards from ins;
  v_counts := v_counts || v_counts_cards;

  -- Study days (same definition as the current app); a day of origin legacy that is no longer a study
  -- day in the source is removed. The streak itself is computed by the TypeScript domain.
  delete from app.study_day sd
  where sd.user_id = p_user_id and sd.origin = 'legacy'
    and not exists (select 1 from app.legacy_study_days(p_user_id) as d (day) where d.day = sd.day);
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('study_day_deleted', v_n);

  insert into app.study_day (user_id, day, origin)
  select p_user_id, d.day, 'legacy' from app.legacy_study_days(p_user_id) as d (day)
  on conflict (user_id, day) do nothing;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('study_day', v_n);

  insert into app.streak_state as s (user_id, last_day)
  values (p_user_id, (select max(sd.day) from app.study_day sd where sd.user_id = p_user_id))
  on conflict (user_id) do update set last_day = excluded.last_day
    where s.last_day is distinct from excluded.last_day;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('streak_state', v_n);

  -- Archive of what has no equivalent yet; it follows its source but writes only when the content differs.
  insert into app.legacy_record as r (user_id, legacy_table, legacy_id, payload)
  select p_user_id, a.legacy_table, a.legacy_id, a.payload
  from (
    select 'missions' as legacy_table, m.id::text as legacy_id,
      to_jsonb(m) || jsonb_build_object('sessions', coalesce((
        select jsonb_agg(
          to_jsonb(s) || jsonb_build_object(
            'activities', coalesce((
              select jsonb_agg(
                to_jsonb(act) || jsonb_build_object('progress', (
                  select to_jsonb(ap) from public.activity_progress ap where ap.activity_id = act.id
                )) order by act.position
              ) from public.mission_activities act where act.session_id = s.id
            ), '[]'::jsonb),
            'quiz_answers', coalesce((
              select jsonb_agg(to_jsonb(q) order by q.question_id)
              from public.quiz_answers q where q.session_id = s.id
            ), '[]'::jsonb)
          ) order by s.position
        ) from public.mission_sessions s where s.mission_id = m.id
      ), '[]'::jsonb)) as payload
    from public.missions m where m.user_id = p_user_id
    union all
    select 'feedback', f.id::text, to_jsonb(f) from public.feedback f where f.user_id = p_user_id
    union all
    select 'content_refusals', cr.user_id::text || ':' || cr.content_id::text, to_jsonb(cr)
    from public.content_refusals cr where cr.user_id = p_user_id
    union all
    select 'user_source_access', usa.user_id::text || ':' || usa.source_id::text, to_jsonb(usa)
    from public.user_source_access usa where usa.user_id = p_user_id
    union all
    select 'mission_requests', mr.user_id::text || ':' || mr.mission_date::text || ':' || mr.language, to_jsonb(mr)
    from public.mission_requests mr where mr.user_id = p_user_id
    union all
    select 'profiles', p.id::text, to_jsonb(p) from public.profiles p where p.id = p_user_id
    union all
    select 'user_languages', ul.id::text, to_jsonb(ul) from public.user_languages ul where ul.user_id = p_user_id
    union all
    select 'writing_feedback', wf.session_id::text, to_jsonb(wf)
    from public.writing_feedback wf where wf.user_id = p_user_id
  ) a
  on conflict (legacy_table, legacy_id) do update
    set payload = excluded.payload, archived_at = now()
    where r.user_id = excluded.user_id and r.payload is distinct from excluded.payload;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('legacy_record', v_n);

  return v_counts;
end;
$$;

-- migrate_all ----------------------------------------------------------------------------------
-- The error of a user is reported, the others go on. Result: {"users": n, "skipped_active": k,
-- "errors": [{"user_id", "sqlstate", "message"}], "<table>": rows created, ...}.

create or replace function app.migrate_all() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_one jsonb;
  v_kv record;
  v_total jsonb := '{}';
  v_users integer := 0;
  v_skipped integer := 0;
  v_errors jsonb := '[]';
begin
  perform set_config('lock_timeout', '5s', true);
  perform pg_advisory_xact_lock(hashtextextended('app.migrate', 0));

  for v_user in select p.id from public.profiles p order by p.id loop
    v_users := v_users + 1;
    begin
      v_one := app.migrate_user(v_user);
    exception when others then
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object('user_id', v_user, 'sqlstate', sqlstate, 'message', sqlerrm)
      );
      continue;
    end;
    if v_one ? 'skipped' then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    for v_kv in select e.key, e.value from jsonb_each_text(v_one) as e loop
      v_total := jsonb_set(
        v_total, array[v_kv.key], to_jsonb(coalesce((v_total ->> v_kv.key)::integer, 0) + v_kv.value::integer)
      );
    end loop;
  end loop;
  return jsonb_build_object('users', v_users, 'skipped_active', v_skipped, 'errors', v_errors) || v_total;
end;
$$;
