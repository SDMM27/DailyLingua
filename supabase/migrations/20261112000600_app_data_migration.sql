-- Schema `app`, block 6: replayable data migration from `public` (service_role only).
--
--   app.migrate_user(user)   copies one user's data; returns the rows created per table
--   app.migrate_all()        the same for every row of public.profiles
--   app.verify_migration()   one row per discrepancy; no row = everything is in place
--
-- Replayable: every row copied is recorded in app.legacy_map (source table + id -> app table + id)
-- and is skipped on the next run, so a second run creates nothing and changes nothing. A source
-- row that appeared since is copied by the next run. Nothing in `public` is read for writing.
-- What has no equivalent in app yet goes to app.legacy_record, as the whole source row.
-- Spec: docs/refonte/specs/j1-pr1-schema-app.md, sections 4 and 4.1.

-- Helpers (internal: executable by nobody, only by the SECURITY DEFINER functions below) ----------

-- Leitner box -> interval in days (src/lib/domain/spaced-repetition.ts, BOX_INTERVALS_DAYS).
create function app.leitner_interval(p_box integer) returns real
language sql
immutable
set search_path = ''
as $$
  select (array[1, 2, 4, 8, 16, 32, 64]::real[])[least(greatest(p_box, 0), 6) + 1];
$$;

-- CEFR level -> middle of its band on the continuous scale 0..7 (see app.skill_estimate).
create function app.legacy_level_value(p_level text) returns numeric
language sql
immutable
set search_path = ''
as $$
  select case p_level
    when 'A1' then 1.5
    when 'A2' then 2.5
    when 'B1' then 3.5
    when 'B2' then 4.5
    when 'C1' then 5.5
    when 'C2' then 6.5
  end;
$$;

-- A study day of the current app: a mission with at least one completed activity, or a vocabulary
-- review (src/lib/data/supabase-repository.ts, getStudyDates). Grammar and alphabet practice do
-- not count: they only keep their last review date.
create function app.legacy_study_days(p_user_id uuid) returns setof date
language sql
stable
set search_path = ''
as $$
  select m.mission_date
  from public.missions m
  where m.user_id = p_user_id
    and exists (
      select 1
      from public.mission_sessions s
      join public.mission_activities a on a.session_id = s.id
      join public.activity_progress p on p.activity_id = a.id
      where s.mission_id = m.id and p.completed_at is not null
    )
  union
  select r.reviewed_on from public.vocabulary_reviews r where r.user_id = p_user_id;
$$;

revoke execute on function
  app.leitner_interval(integer),
  app.legacy_level_value(text),
  app.legacy_study_days(uuid)
from public, anon, authenticated;

-- migrate_user ---------------------------------------------------------------------------------

create function app.migrate_user(p_user_id uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.profiles;
  v_tz text;
  v_guest boolean;
  v_base smallint;
  v_n integer;
  v_counts jsonb := '{}';
begin
  perform pg_advisory_xact_lock(hashtextextended('app.migrate_user:' || p_user_id::text, 0));

  select p.* into v_p from public.profiles p where p.id = p_user_id;
  if not found then
    raise exception 'no public.profiles row for user %', p_user_id using errcode = 'P0002';
  end if;
  v_tz := v_p.time_zone;
  select coalesce(u.is_anonymous, false) into v_guest from auth.users u where u.id = p_user_id;

  -- A language added to public since the schema was created.
  insert into app.language (code) select l.code from public.languages l on conflict (code) do nothing;

  -- profiles -> profile. The row may exist already (signup trigger): updated only while the
  -- migration has not stamped it.
  with up as (
    insert into app.profile as ap (
      user_id, native_language, ui_language, time_zone, reminder_time, game_settings, is_guest,
      legacy_migrated_at, created_at
    ) values (
      p_user_id, 'fr', 'fr', v_p.time_zone, v_p.generation_time,
      jsonb_build_object('streak', v_p.show_streak), v_guest, now(), v_p.created_at
    )
    on conflict (user_id) do update
      set native_language = excluded.native_language,
          ui_language = excluded.ui_language,
          time_zone = excluded.time_zone,
          reminder_time = excluded.reminder_time,
          game_settings = excluded.game_settings,
          is_guest = excluded.is_guest,
          legacy_migrated_at = excluded.legacy_migrated_at
      where ap.legacy_migrated_at is null
    returning ap.user_id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'profiles', up.user_id::text, 'profile', up.user_id::text from up
    on conflict do nothing
  )
  select count(*) into v_n from up;
  v_counts := v_counts || jsonb_build_object('profile', v_n);

  -- user_languages -> enrollment (topics and content types, which have no column, go in focus).
  v_base := coalesce((select max(e.position) + 1 from app.enrollment e where e.user_id = p_user_id), 0);
  with src as materialized (
    select ul.id as legacy_id, gen_random_uuid() as new_id, ul.language, ul.purpose, ul.target_level,
      greatest(least(ul.weight, 120), 5)::smallint as daily_minutes, ul.days,
      jsonb_build_object(
        'text', ul.focus, 'topics', to_jsonb(ul.topics), 'content_types', to_jsonb(ul.content_types)
      ) as focus,
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
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'user_languages', s.legacy_id::text, 'enrollment', s.new_id::text
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('enrollment', v_n);

  -- user_languages.level / production_level -> skill_estimate (reading, listening, writing; never speaking).
  with src as materialized (
    select ul.id::text || ':' || k.skill as legacy_id, ul.language, k.skill,
      app.legacy_level_value(k.level) as level_value
    from public.user_languages ul
    cross join lateral (values
      ('reading', ul.level),
      ('listening', ul.level),
      ('writing', coalesce(ul.production_level, ul.level))
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
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'user_languages', s.legacy_id, 'skill_estimate', p_user_id::text || '/' || s.language || '/' || s.skill
    from src s join ins on ins.language = s.language and ins.skill = s.skill
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('skill_estimate', v_n);

  -- vocabulary_lists -> card_list
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
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'vocabulary_lists', s.legacy_id::text, 'card_list', s.new_id::text
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('card_list', v_n);

  -- vocabulary_items -> card (word). Leitner -> initial FSRS state (section 4.1 of the spec):
  -- stability = interval of the box, difficulty 5, due at 04:00 and last review at 12:00 local time.
  with src as materialized (
    select vi.id as legacy_id, gen_random_uuid() as new_id, vi.language, vi.term, vi.translation, vi.example,
      ml.app_id::uuid as list_id,
      case when vi.status = 'known' then 'known'
           when vi.last_reviewed_on is null then 'new'
           else 'review' end as state,
      app.leitner_interval(vi.box) as stability,
      ((vi.due_on + time '04:00') at time zone v_tz) as due_at,
      case when vi.last_reviewed_on is not null
           then ((vi.last_reviewed_on + time '12:00') at time zone v_tz) end as last_review_at,
      vi.review_count as reps,
      coalesce((select count(*) from public.vocabulary_reviews vr
                where vr.item_id = vi.id and vr.grade = 'again'), 0)::integer as lapses,
      vi.box as legacy_box,
      jsonb_strip_nulls(jsonb_build_object(
        'definition', vi.definition, 'source_name', vi.source_name, 'source_url', vi.source_url,
        'content_id', vi.content_id, 'status', vi.status, 'added_on', vi.added_on
      )) as payload,
      vi.created_at, vi.updated_at
    from public.vocabulary_items vi
    left join app.legacy_map ml
      on ml.legacy_table = 'vocabulary_lists' and ml.legacy_id = vi.list_id::text and ml.app_table = 'card_list'
    where vi.user_id = p_user_id
      and not exists (
        select 1 from app.legacy_map m
        where m.legacy_table = 'vocabulary_items' and m.legacy_id = vi.id::text and m.app_table = 'card'
      )
  ), ins as (
    insert into app.card (
      id, user_id, language, kind, front, back, back_language, context, list_id, state, stability, difficulty,
      due_at, last_review_at, reps, lapses, legacy_box, source, payload, created_at, updated_at
    )
    select s.new_id, p_user_id, s.language, 'word', s.term, s.translation, 'fr', s.example, s.list_id, s.state,
      s.stability, 5.0, s.due_at, s.last_review_at, s.reps, s.lapses, s.legacy_box, 'legacy', s.payload,
      s.created_at, s.updated_at
    from src s
    returning id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'vocabulary_items', s.legacy_id::text, 'card', s.new_id::text
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('card_word', v_n);

  -- grammar_cards -> card (grammar); ref = point_id
  with src as materialized (
    select g.id as legacy_id, gen_random_uuid() as new_id, g.language, g.point_id,
      case when g.status = 'known' then 'known'
           when g.last_reviewed_on is null then 'new'
           else 'review' end as state,
      app.leitner_interval(g.box) as stability,
      ((g.due_on + time '04:00') at time zone v_tz) as due_at,
      case when g.last_reviewed_on is not null
           then ((g.last_reviewed_on + time '12:00') at time zone v_tz) end as last_review_at,
      g.review_count as reps, g.box as legacy_box,
      jsonb_build_object('status', g.status, 'added_on', g.added_on) as payload,
      g.created_at, g.updated_at
    from public.grammar_cards g
    where g.user_id = p_user_id
      and not exists (
        select 1 from app.legacy_map m
        where m.legacy_table = 'grammar_cards' and m.legacy_id = g.id::text and m.app_table = 'card'
      )
  ), ins as (
    insert into app.card (
      id, user_id, language, kind, ref, front, state, stability, difficulty, due_at, last_review_at, reps, lapses,
      legacy_box, source, payload, created_at, updated_at
    )
    select s.new_id, p_user_id, s.language, 'grammar', s.point_id, s.point_id, s.state, s.stability, 5.0, s.due_at,
      s.last_review_at, s.reps, 0, s.legacy_box, 'legacy', s.payload, s.created_at, s.updated_at
    from src s
    on conflict (user_id, language, kind, ref) where ref is not null do nothing
    returning id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'grammar_cards', s.legacy_id::text, 'card', s.new_id::text
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('card_grammar', v_n);

  -- alphabet_cards -> card (script); ref = group_id
  with src as materialized (
    select a.id as legacy_id, gen_random_uuid() as new_id, a.language, a.group_id,
      case when a.status = 'known' then 'known'
           when a.last_reviewed_on is null then 'new'
           else 'review' end as state,
      app.leitner_interval(a.box) as stability,
      ((a.due_on + time '04:00') at time zone v_tz) as due_at,
      case when a.last_reviewed_on is not null
           then ((a.last_reviewed_on + time '12:00') at time zone v_tz) end as last_review_at,
      a.review_count as reps, a.box as legacy_box,
      jsonb_build_object('status', a.status, 'added_on', a.added_on) as payload,
      a.created_at, a.updated_at
    from public.alphabet_cards a
    where a.user_id = p_user_id
      and not exists (
        select 1 from app.legacy_map m
        where m.legacy_table = 'alphabet_cards' and m.legacy_id = a.id::text and m.app_table = 'card'
      )
  ), ins as (
    insert into app.card (
      id, user_id, language, kind, ref, front, state, stability, difficulty, due_at, last_review_at, reps, lapses,
      legacy_box, source, payload, created_at, updated_at
    )
    select s.new_id, p_user_id, s.language, 'script', s.group_id, s.group_id, s.state, s.stability, 5.0, s.due_at,
      s.last_review_at, s.reps, 0, s.legacy_box, 'legacy', s.payload, s.created_at, s.updated_at
    from src s
    on conflict (user_id, language, kind, ref) where ref is not null do nothing
    returning id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'alphabet_cards', s.legacy_id::text, 'card', s.new_id::text
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('card_script', v_n);

  -- vocabulary_reviews -> review_log (origin leitner). The review instant is the local noon of
  -- the review day (spec); the real instant is kept in created_at. Identity values are taken from
  -- the sequence up front so each journal row can be tied to its source row in legacy_map.
  with src as materialized (
    select o.*, nextval(pg_get_serial_sequence('app.review_log', 'id')) as new_id
    from (
      select vr.id as legacy_id, mc.app_id::uuid as card_id,
        case vr.grade when 'again' then 1 when 'hard' then 2 when 'good' then 3 else 4 end::smallint as rating,
        vr.mode,
        ((vr.reviewed_on + time '12:00') at time zone v_tz) as reviewed_at,
        vr.days_since_last::real as elapsed_days,
        (vr.due_on_after - vr.reviewed_on)::real as scheduled_days,
        vr.reviewed_at as created_at
      from public.vocabulary_reviews vr
      join app.legacy_map mc
        on mc.legacy_table = 'vocabulary_items' and mc.legacy_id = vr.item_id::text and mc.app_table = 'card'
      join app.card c on c.id = mc.app_id::uuid
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
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'vocabulary_reviews', s.legacy_id::text, 'review_log', s.new_id::text
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('review_log', v_n);

  -- production_entries -> production. The task is the instruction of the session it belongs to.
  with src as materialized (
    select pe.session_id as legacy_id, gen_random_uuid() as new_id, ms.language,
      case when ms.production ->> 'mode' in ('writing', 'spoken', 'speaking')
           then ms.production ->> 'mode' else 'writing' end as mode,
      coalesce(ms.production, '{}'::jsonb)
        || jsonb_build_object('legacy_session_id', ms.id, 'legacy_mission_id', ms.mission_id) as task,
      pe.body, pe.created_at
    from public.production_entries pe
    join public.mission_sessions ms on ms.id = pe.session_id
    where pe.user_id = p_user_id
      and not exists (
        select 1 from app.legacy_map m
        where m.legacy_table = 'production_entries' and m.legacy_id = pe.session_id::text
          and m.app_table = 'production'
      )
  ), ins as (
    insert into app.production (id, user_id, language, mode, task, text, created_at)
    select s.new_id, p_user_id, s.language, s.mode, s.task, s.body, s.created_at from src s
    returning id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'production_entries', s.legacy_id::text, 'production', s.new_id::text
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('production', v_n);

  -- writing_feedback -> correction (only when there is a feedback and a production to attach it to;
  -- every writing_feedback row is archived whole in legacy_record below).
  with src as materialized (
    select wf.session_id as legacy_id, gen_random_uuid() as new_id, ap.id as production_id, wf.feedback,
      wf.model, wf.prompt_version, wf.input_tokens, wf.output_tokens,
      coalesce(wf.reviewed_at, wf.created_at) as created_at
    from public.writing_feedback wf
    join app.legacy_map pm
      on pm.legacy_table = 'production_entries' and pm.legacy_id = wf.session_id::text
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
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'writing_feedback', s.legacy_id::text, 'correction', s.new_id::text
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('correction', v_n);

  -- correction_cards -> card (correction): front = faulty passage, back = correction (in the language
  -- learned, so back_language is the language of the card, not 'fr').
  with src as materialized (
    select cc.id as legacy_id, gen_random_uuid() as new_id, cc.language, cc.original, cc.corrected,
      case when cc.status = 'known' then 'known'
           when cc.last_reviewed_on is null then 'new'
           else 'review' end as state,
      app.leitner_interval(cc.box) as stability,
      ((cc.due_on + time '04:00') at time zone v_tz) as due_at,
      case when cc.last_reviewed_on is not null
           then ((cc.last_reviewed_on + time '12:00') at time zone v_tz) end as last_review_at,
      cc.review_count as reps, cc.box as legacy_box,
      jsonb_strip_nulls(jsonb_build_object(
        'category', cc.category, 'explanation', cc.explanation, 'correction_index', cc.correction_index,
        'legacy_session_id', cc.session_id, 'production_id', pm.app_id, 'status', cc.status,
        'added_on', cc.added_on
      )) as payload,
      cc.created_at, cc.updated_at
    from public.correction_cards cc
    left join app.legacy_map pm
      on pm.legacy_table = 'production_entries' and pm.legacy_id = cc.session_id::text
         and pm.app_table = 'production'
    where cc.user_id = p_user_id
      and not exists (
        select 1 from app.legacy_map m
        where m.legacy_table = 'correction_cards' and m.legacy_id = cc.id::text and m.app_table = 'card'
      )
  ), ins as (
    insert into app.card (
      id, user_id, language, kind, front, back, back_language, state, stability, difficulty, due_at,
      last_review_at, reps, lapses, legacy_box, source, payload, created_at, updated_at
    )
    select s.new_id, p_user_id, s.language, 'correction', s.original, s.corrected, s.language, s.state,
      s.stability, 5.0, s.due_at, s.last_review_at, s.reps, 0, s.legacy_box, 'legacy', s.payload,
      s.created_at, s.updated_at
    from src s
    returning id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'correction_cards', s.legacy_id::text, 'card', s.new_id::text
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('card_correction', v_n);

  -- placement_tests -> assessment_result
  with src as materialized (
    select pt.id as legacy_id, gen_random_uuid() as new_id, pt.language, pt.taken_at,
      jsonb_strip_nulls(jsonb_build_object(
        'reception', pt.chosen_level, 'estimated', pt.estimated_level, 'start', pt.start_level
      )) as levels,
      to_jsonb(pt) as payload
    from public.placement_tests pt
    where pt.user_id = p_user_id
      and not exists (
        select 1 from app.legacy_map m
        where m.legacy_table = 'placement_tests' and m.legacy_id = pt.id::text and m.app_table = 'assessment_result'
      )
  ), ins as (
    insert into app.assessment_result (id, user_id, language, kind, taken_at, levels, payload)
    select s.new_id, p_user_id, s.language, 'placement', s.taken_at, s.levels, s.payload from src s
    returning id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'placement_tests', s.legacy_id::text, 'assessment_result', s.new_id::text
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('assessment_placement', v_n);

  -- assessments -> assessment_result (in-progress ones too: they are rows of the source)
  with src as materialized (
    select a.id as legacy_id, gen_random_uuid() as new_id, a.language,
      coalesce(a.graded_at, a.started_at) as taken_at,
      case when a.results is null then '{}'::jsonb
           else jsonb_strip_nulls(jsonb_build_object(
             'reading', a.results -> 'reading' ->> 'level',
             'listening', a.results -> 'listening' ->> 'level',
             'writing', a.results -> 'writing' ->> 'level',
             'speaking', a.results -> 'speaking' ->> 'level'
           )) end as levels,
      to_jsonb(a) as payload
    from public.assessments a
    where a.user_id = p_user_id
      and not exists (
        select 1 from app.legacy_map m
        where m.legacy_table = 'assessments' and m.legacy_id = a.id::text and m.app_table = 'assessment_result'
      )
  ), ins as (
    insert into app.assessment_result (id, user_id, language, kind, taken_at, levels, payload)
    select s.new_id, p_user_id, s.language, 'assessment', s.taken_at, s.levels, s.payload from src s
    returning id
  ), map as (
    insert into app.legacy_map (legacy_table, legacy_id, app_table, app_id)
    select 'assessments', s.legacy_id::text, 'assessment_result', s.new_id::text
    from src s join ins on ins.id = s.new_id
  )
  select count(*) into v_n from ins;
  v_counts := v_counts || jsonb_build_object('assessment_assessment', v_n);

  -- Study days (same definition as the current app) and the last day of the streak state. The streak
  -- itself is computed by the TypeScript domain, not here: current and best stay at 0.
  insert into app.study_day (user_id, day, origin)
  select p_user_id, d.day, 'legacy' from app.legacy_study_days(p_user_id) as d (day)
  on conflict (user_id, day) do nothing;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('study_day', v_n);

  insert into app.streak_state as s (user_id, last_day)
  values (p_user_id, (select max(sd.day) from app.study_day sd where sd.user_id = p_user_id))
  on conflict (user_id) do update set last_day = excluded.last_day
    where excluded.last_day is not null and (s.last_day is null or s.last_day < excluded.last_day);

  -- Archive of what has no equivalent yet. Unlike the copies above, an archive row follows its
  -- source (a mission started after the first run is not lost) but only writes when the content
  -- differs, so a replay on unchanged data changes nothing.
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
    -- Fields without a column in app (difficulty, topics, daily minutes...), and the raw rows.
    select 'profiles', p.id::text, to_jsonb(p) from public.profiles p where p.id = p_user_id
    union all
    select 'user_languages', ul.id::text, to_jsonb(ul) from public.user_languages ul where ul.user_id = p_user_id
    union all
    select 'writing_feedback', wf.session_id::text, to_jsonb(wf)
    from public.writing_feedback wf where wf.user_id = p_user_id
  ) a
  on conflict (legacy_table, legacy_id) do update
    set payload = excluded.payload, archived_at = now()
    where r.payload is distinct from excluded.payload;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('legacy_record', v_n);

  return v_counts;
end;
$$;

-- migrate_all ----------------------------------------------------------------------------------

create function app.migrate_all() returns jsonb
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
begin
  for v_user in select p.id from public.profiles p order by p.id loop
    v_one := app.migrate_user(v_user);
    v_users := v_users + 1;
    for v_kv in select e.key, e.value from jsonb_each_text(v_one) as e loop
      v_total := jsonb_set(
        v_total, array[v_kv.key], to_jsonb(coalesce((v_total ->> v_kv.key)::integer, 0) + v_kv.value::integer)
      );
    end loop;
  end loop;
  return jsonb_build_object('users', v_users) || v_total;
end;
$$;

-- verify_migration -----------------------------------------------------------------------------
-- One row per discrepancy and per user; no row = nothing lost. The counts compare the source with
-- the rows that the migration created (found through legacy_map), so rows the new app adds later do
-- not count as a discrepancy.

create function app.verify_migration()
returns table (user_id uuid, check_name text, expected text, actual text)
language sql
stable
security definer
set search_path = ''
as $$
  with u as (
    select p.id, p.time_zone from public.profiles p
  ), src_cards as (
    select x.user_id, 'vocabulary_items' as lt, x.id::text as lid, x.due_on from public.vocabulary_items x
    union all select x.user_id, 'grammar_cards', x.id::text, x.due_on from public.grammar_cards x
    union all select x.user_id, 'alphabet_cards', x.id::text, x.due_on from public.alphabet_cards x
    union all select x.user_id, 'correction_cards', x.id::text, x.due_on from public.correction_cards x
  ), src_all as (
    select x.id as user_id, 'profiles' as t, x.id::text as lid from public.profiles x
    union all select x.user_id, 'user_languages', x.id::text from public.user_languages x
    union all select x.user_id, 'vocabulary_lists', x.id::text from public.vocabulary_lists x
    union all select x.user_id, 'vocabulary_items', x.id::text from public.vocabulary_items x
    union all select x.user_id, 'vocabulary_reviews', x.id::text from public.vocabulary_reviews x
    union all select x.user_id, 'grammar_cards', x.id::text from public.grammar_cards x
    union all select x.user_id, 'alphabet_cards', x.id::text from public.alphabet_cards x
    union all select x.user_id, 'correction_cards', x.id::text from public.correction_cards x
    union all select x.user_id, 'production_entries', x.session_id::text from public.production_entries x
    union all select x.user_id, 'writing_feedback', x.session_id::text from public.writing_feedback x
    union all select x.user_id, 'placement_tests', x.id::text from public.placement_tests x
    union all select x.user_id, 'assessments', x.id::text from public.assessments x
    union all select x.user_id, 'missions', x.id::text from public.missions x
    union all select x.user_id, 'feedback', x.id::text from public.feedback x
    union all select x.user_id, 'content_refusals', x.user_id::text || ':' || x.content_id::text
      from public.content_refusals x
    union all select x.user_id, 'user_source_access', x.user_id::text || ':' || x.source_id::text
      from public.user_source_access x
    union all select x.user_id, 'mission_requests',
      x.user_id::text || ':' || x.mission_date::text || ':' || x.language from public.mission_requests x
  ), checks as (
    -- The profile row exists and carries the migration stamp.
    select u.id as user_id, 'profile' as check_name, '1' as expected,
      (select count(*) from app.profile ap where ap.user_id = u.id and ap.legacy_migrated_at is not null)::text
        as actual
    from u

    -- 1. Cards per type.
    union all
    select u.id, 'cards_' || t.kind,
      (select count(*) from src_cards s where s.user_id = u.id and s.lt = t.lt)::text,
      (select count(*) from app.card c
       where c.user_id = u.id and c.kind = t.kind
         and exists (
           select 1 from app.legacy_map m
           where m.app_table = 'card' and m.app_id = c.id::text and m.legacy_table = t.lt
         ))::text
    from u
    cross join (values
      ('vocabulary_items', 'word'), ('grammar_cards', 'grammar'),
      ('alphabet_cards', 'script'), ('correction_cards', 'correction')
    ) as t (lt, kind)

    -- 2. Review journal.
    union all
    select u.id, 'review_log_leitner',
      (select count(*) from public.vocabulary_reviews x where x.user_id = u.id)::text,
      (select count(*) from app.review_log r where r.user_id = u.id and r.origin = 'leitner')::text
    from u

    -- 3. Productions, corrections, assessment results (and lists, enrollments).
    union all
    select u.id, 'productions',
      (select count(*) from public.production_entries x where x.user_id = u.id)::text,
      (select count(*) from app.production p
       where p.user_id = u.id
         and exists (select 1 from app.legacy_map m
                     where m.app_table = 'production' and m.app_id = p.id::text
                       and m.legacy_table = 'production_entries'))::text
    from u
    union all
    select u.id, 'corrections',
      (select count(*) from public.writing_feedback wf
       where wf.user_id = u.id and wf.feedback is not null
         and exists (select 1 from public.production_entries pe where pe.session_id = wf.session_id))::text,
      (select count(*) from app.correction c
       where c.user_id = u.id
         and exists (select 1 from app.legacy_map m
                     where m.app_table = 'correction' and m.app_id = c.id::text
                       and m.legacy_table = 'writing_feedback'))::text
    from u
    union all
    select u.id, 'assessment_results',
      ((select count(*) from public.placement_tests x where x.user_id = u.id)
       + (select count(*) from public.assessments x where x.user_id = u.id))::text,
      (select count(*) from app.assessment_result r
       where r.user_id = u.id
         and exists (select 1 from app.legacy_map m
                     where m.app_table = 'assessment_result' and m.app_id = r.id::text
                       and m.legacy_table in ('placement_tests', 'assessments')))::text
    from u
    union all
    select u.id, 'card_lists',
      (select count(*) from public.vocabulary_lists x where x.user_id = u.id)::text,
      (select count(*) from app.card_list l
       where l.user_id = u.id
         and exists (select 1 from app.legacy_map m
                     where m.app_table = 'card_list' and m.app_id = l.id::text
                       and m.legacy_table = 'vocabulary_lists'))::text
    from u
    union all
    select u.id, 'enrollments',
      (select count(*) from public.user_languages x where x.user_id = u.id)::text,
      (select count(*) from app.enrollment e
       where e.user_id = u.id
         and exists (select 1 from app.legacy_map m
                     where m.app_table = 'enrollment' and m.app_id = e.id::text
                       and m.legacy_table = 'user_languages'))::text
    from u

    -- 4. Checksums of the terms and of the production texts.
    union all
    select u.id, 'md5_terms',
      (select md5(coalesce(string_agg(x.language || ':' || x.term, E'\n'
          order by x.language collate "C", x.term collate "C"), ''))
       from public.vocabulary_items x where x.user_id = u.id),
      (select md5(coalesce(string_agg(c.language || ':' || c.front, E'\n'
          order by c.language collate "C", c.front collate "C"), ''))
       from app.card c
       where c.user_id = u.id and c.kind = 'word'
         and exists (select 1 from app.legacy_map m
                     where m.app_table = 'card' and m.app_id = c.id::text and m.legacy_table = 'vocabulary_items'))
    from u
    union all
    select u.id, 'md5_production_texts',
      (select md5(coalesce(string_agg(x.body, E'\n' order by x.body collate "C"), ''))
       from public.production_entries x where x.user_id = u.id),
      (select md5(coalesce(string_agg(p.text, E'\n' order by p.text collate "C"), ''))
       from app.production p
       where p.user_id = u.id
         and exists (select 1 from app.legacy_map m
                     where m.app_table = 'production' and m.app_id = p.id::text
                       and m.legacy_table = 'production_entries'))
    from u

    -- 5. Due day of every card: the local day of due_at is the source due_on.
    union all
    select u.id, 'due_day', '0', count(*)::text
    from u
    join src_cards s on s.user_id = u.id
    left join app.legacy_map m on m.legacy_table = s.lt and m.legacy_id = s.lid and m.app_table = 'card'
    left join app.card c on c.id::text = m.app_id
    where c.id is null or (c.due_at at time zone u.time_zone)::date <> s.due_on
    group by u.id

    -- 6. Study days: every recomputed day is there, and no day marked legacy is unexplained.
    union all
    select u.id, 'study_day_missing', '0', count(*)::text
    from u
    cross join lateral app.legacy_study_days(u.id) as d (day)
    where not exists (select 1 from app.study_day sd where sd.user_id = u.id and sd.day = d.day)
    group by u.id
    union all
    select sd.user_id, 'study_day_extra', '0', count(*)::text
    from app.study_day sd
    join u on u.id = sd.user_id
    where sd.origin = 'legacy'
      and not exists (select 1 from app.legacy_study_days(sd.user_id) as d (day) where d.day = sd.day)
    group by sd.user_id

    -- 7. Every source row has its entry in legacy_map or legacy_record.
    union all
    select s.user_id, 'unmapped:' || s.t, '0', count(*)::text
    from src_all s
    where not exists (select 1 from app.legacy_map m where m.legacy_table = s.t and m.legacy_id = s.lid)
      and not exists (select 1 from app.legacy_record r where r.legacy_table = s.t and r.legacy_id = s.lid)
    group by s.user_id, s.t
  )
  select c.user_id, c.check_name, c.expected, c.actual
  from checks c
  where c.expected is distinct from c.actual
  order by c.user_id, c.check_name;
$$;

-- Privileges -----------------------------------------------------------------------------------

revoke execute on function app.migrate_user(uuid), app.migrate_all(), app.verify_migration()
  from public, anon, authenticated;
grant execute on function app.migrate_user(uuid), app.migrate_all(), app.verify_migration()
  to service_role;
