-- Schema `app`: verify_migration for the resynchronising migration (review E1, M1, F3, F7).
--
-- One row per discrepancy and per user; no row = nothing lost. Compared: the counts (cards by type,
-- review journal, productions, corrections, assessments, lists, enrollments, skill estimates), the
-- FIELDS of every copied row (cards: text, state, schedule, list, payload; enrollments; level values;
-- assessments; productions; profile), the checksums of the terms and production texts, the due day of
-- every card, the study days, and the presence of every source row in legacy_map or legacy_record.
--
-- A user who has started writing in the new app (profile.app_active_since set) is NOT checked and gives
-- no row: from that moment the copy diverges from public on purpose and the absence of loss at the instant of
-- activation can no longer be verified. Run verify_migration (and fix any gap) before such a user acts.
-- Cards marked deleted_at are the copies of source rows that no longer exist: they and their (kept) review
-- journal are not counted.

create or replace function app.verify_migration()
returns table (user_id uuid, check_name text, expected text, actual text)
language sql
stable
security definer
set search_path = ''
as $$
  with u as (
    select p.id, p.time_zone
    from public.profiles p
    left join app.profile ap on ap.user_id = p.id
    where ap.app_active_since is null
  ), src_cards as (
    select u.id as user_id, s.*
    from u cross join lateral app.legacy_cards(u.id) s
  ), src_due as (
    select x.user_id, 'vocabulary_items' as lt, x.id::text as lid, x.due_on from public.vocabulary_items x
    union all select x.user_id, 'grammar_cards', x.id::text, x.due_on from public.grammar_cards x
    union all select x.user_id, 'alphabet_cards', x.id::text, x.due_on from public.alphabet_cards x
    union all select x.user_id, 'correction_cards', x.id::text, x.due_on from public.correction_cards x
  ), app_cards as (
    select c.*, m.legacy_table as lt, m.legacy_id as lid
    from app.card c
    join app.legacy_map m on m.app_table = 'card' and m.app_id = c.id::text
    join u on u.id = c.user_id
    where c.deleted_at is null
  ), recomputed as (
    select u.id as user_id, d.day from u cross join lateral app.legacy_study_days(u.id) as d (day)
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
  ), expected_counts as (
    select s.user_id, 'cards_' || s.kind as name, count(*) as n from src_cards s group by s.user_id, s.kind
    union all select x.user_id, 'review_log_leitner', count(*) from public.vocabulary_reviews x
      join u on u.id = x.user_id group by x.user_id
    union all select x.user_id, 'productions', count(*) from public.production_entries x
      join u on u.id = x.user_id group by x.user_id
    union all select wf.user_id, 'corrections', count(*) from public.writing_feedback wf
      join u on u.id = wf.user_id
      where wf.feedback is not null
        and exists (select 1 from public.production_entries pe where pe.session_id = wf.session_id)
      group by wf.user_id
    union all select a.user_id, 'assessment_results', count(*) from (
        select x.user_id from public.placement_tests x union all select x.user_id from public.assessments x
      ) a join u on u.id = a.user_id group by a.user_id
    union all select x.user_id, 'card_lists', count(*) from public.vocabulary_lists x
      join u on u.id = x.user_id group by x.user_id
    union all select x.user_id, 'enrollments', count(*) from public.user_languages x
      join u on u.id = x.user_id group by x.user_id
    union all select x.user_id, 'skill_estimates', 3 * count(*) from public.user_languages x
      join u on u.id = x.user_id group by x.user_id
  ), actual_counts as (
    select c.user_id, 'cards_' || c.kind as name, count(*) as n from app_cards c group by c.user_id, c.kind
    union all select r.user_id, 'review_log_leitner', count(*) from app.review_log r
      join u on u.id = r.user_id
      join app.card c on c.id = r.card_id and c.deleted_at is null
      where r.origin = 'leitner' group by r.user_id
    union all select p.user_id, 'productions', count(*) from app.production p join u on u.id = p.user_id
      where exists (select 1 from app.legacy_map m where m.app_table = 'production' and m.app_id = p.id::text
                    and m.legacy_table = 'production_entries')
      group by p.user_id
    union all select c.user_id, 'corrections', count(*) from app.correction c join u on u.id = c.user_id
      where exists (select 1 from app.legacy_map m where m.app_table = 'correction' and m.app_id = c.id::text
                    and m.legacy_table = 'writing_feedback')
      group by c.user_id
    union all select r.user_id, 'assessment_results', count(*) from app.assessment_result r join u on u.id = r.user_id
      where exists (select 1 from app.legacy_map m where m.app_table = 'assessment_result' and m.app_id = r.id::text
                    and m.legacy_table in ('placement_tests', 'assessments'))
      group by r.user_id
    union all select l.user_id, 'card_lists', count(*) from app.card_list l join u on u.id = l.user_id
      where exists (select 1 from app.legacy_map m where m.app_table = 'card_list' and m.app_id = l.id::text
                    and m.legacy_table = 'vocabulary_lists')
      group by l.user_id
    union all select e.user_id, 'enrollments', count(*) from app.enrollment e join u on u.id = e.user_id
      where exists (select 1 from app.legacy_map m where m.app_table = 'enrollment' and m.app_id = e.id::text
                    and m.legacy_table = 'user_languages')
      group by e.user_id
    union all select m.user_id, 'skill_estimates', count(*) from app.legacy_map m join u on u.id = m.user_id
      join app.skill_estimate se
        on se.user_id = m.user_id and se.language = split_part(m.app_id, '/', 2) and se.skill = split_part(m.app_id, '/', 3)
      where m.app_table = 'skill_estimate' group by m.user_id
  ), checks as (
    -- The profile exists and carries the migration stamp; its fields follow the source.
    select u.id as user_id, 'profile' as check_name, '1' as expected,
      (select count(*) from app.profile ap where ap.user_id = u.id and ap.legacy_migrated_at is not null)::text as actual
    from u
    union all
    select u.id, 'profile_fields', '0', '1'
    from u
    join public.profiles p on p.id = u.id
    join app.profile ap on ap.user_id = u.id
    where (ap.time_zone, ap.reminder_time, ap.game_settings, ap.is_guest)
      is distinct from (p.time_zone, p.generation_time, jsonb_build_object('streak', p.show_streak),
                        coalesce((select au.is_anonymous from auth.users au where au.id = u.id), false))

    -- Counts (full outer join: a count absent on one side is 0).
    union all
    select coalesce(e.user_id, a.user_id), coalesce(e.name, a.name), coalesce(e.n, 0)::text, coalesce(a.n, 0)::text
    from expected_counts e
    full join actual_counts a on a.user_id = e.user_id and a.name = e.name

    -- Fields of every card.
    union all
    select s.user_id, 'card_fields', '0', count(*)::text
    from src_cards s
    left join app_cards c on c.user_id = s.user_id and c.lt = s.legacy_table and c.lid = s.legacy_id
    left join app.legacy_map ml
      on ml.user_id = s.user_id and ml.legacy_table = 'vocabulary_lists' and ml.legacy_id = s.legacy_list_id
         and ml.app_table = 'card_list'
    where c.id is null
       or (c.language, c.kind, c.ref, c.front, c.back, c.back_language, c.context, c.list_id, c.state, c.stability,
           c.due_at, c.last_review_at, c.reps, c.lapses, c.legacy_box, c.payload)
          is distinct from
          (s.language, s.kind, s.ref, s.front, s.back, s.back_language, s.context, ml.app_id::uuid, s.state,
           s.stability, s.due_at, s.last_review_at, s.reps, s.lapses, s.legacy_box, s.payload)
    group by s.user_id

    -- Due day of every card: the local day of due_at is the source due_on.
    union all
    select u.id, 'due_day', '0', count(*)::text
    from u
    join src_due s on s.user_id = u.id
    left join app_cards c on c.user_id = u.id and c.lt = s.lt and c.lid = s.lid
    where c.id is null or (c.due_at at time zone u.time_zone)::date <> s.due_on
    group by u.id

    -- Fields of enrollments, skill estimates, assessments, productions.
    union all
    select u.id, 'enrollment_fields', '0', count(*)::text
    from u
    join public.user_languages ul on ul.user_id = u.id
    left join app.legacy_map m
      on m.user_id = u.id and m.legacy_table = 'user_languages' and m.legacy_id = ul.id::text and m.app_table = 'enrollment'
    left join app.enrollment e on e.id::text = m.app_id and e.user_id = u.id
    where e.id is null
       or (e.language, e.purpose, e.target_level, e.daily_minutes, e.days, e.focus)
          is distinct from
          (ul.language, ul.purpose, ul.target_level, greatest(least(ul.weight, 120), 5)::smallint, ul.days,
           jsonb_build_object('text', ul.focus, 'topics', to_jsonb(ul.topics), 'content_types', to_jsonb(ul.content_types)))
    group by u.id
    union all
    select u.id, 'skill_values', '0', count(*)::text
    from u
    join public.user_languages ul on ul.user_id = u.id
    cross join lateral (values
      ('reading', ul.level), ('listening', ul.level), ('writing', coalesce(ul.production_level, ul.level))
    ) as k (skill, level)
    left join app.skill_estimate se
      on se.user_id = u.id and se.language = ul.language and se.skill = k.skill and se.source = 'legacy'
    where se.user_id is null or se.level_value is distinct from app.legacy_level_value(k.level)
    group by u.id
    union all
    select u.id, 'assessment_fields', '0', count(*)::text
    from u
    cross join lateral app.legacy_assessments(u.id) s
    left join app.legacy_map m
      on m.user_id = u.id and m.legacy_table = s.legacy_table and m.legacy_id = s.legacy_id
         and m.app_table = 'assessment_result'
    left join app.assessment_result r on r.id::text = m.app_id and r.user_id = u.id
    where r.id is null
       or (r.language, r.kind, r.taken_at, r.levels, r.payload)
          is distinct from (s.language, s.kind, s.taken_at, s.levels, s.payload)
    group by u.id
    union all
    select u.id, 'production_fields', '0', count(*)::text
    from u
    cross join lateral app.legacy_productions(u.id) s
    left join app.legacy_map m
      on m.user_id = u.id and m.legacy_table = 'production_entries' and m.legacy_id = s.legacy_id
         and m.app_table = 'production'
    left join app.production p on p.id::text = m.app_id and p.user_id = u.id
    where p.id is null
       or (p.language, p.mode, p.task, p.text) is distinct from (s.language, s.mode, s.task, s.body)
    group by u.id

    -- Checksums of the terms and of the production texts.
    union all
    select u.id, 'md5_terms',
      (select md5(coalesce(string_agg(x.language || ':' || x.term, E'\n'
          order by x.language collate "C", x.term collate "C"), ''))
       from public.vocabulary_items x where x.user_id = u.id),
      (select md5(coalesce(string_agg(c.language || ':' || c.front, E'\n'
          order by c.language collate "C", c.front collate "C"), ''))
       from app_cards c where c.user_id = u.id and c.kind = 'word')
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

    -- Study days: every recomputed day is there, and no day marked legacy is unexplained.
    union all
    select r.user_id, 'study_day_missing', '0', count(*)::text
    from recomputed r
    where not exists (select 1 from app.study_day sd where sd.user_id = r.user_id and sd.day = r.day)
    group by r.user_id
    union all
    select sd.user_id, 'study_day_extra', '0', count(*)::text
    from app.study_day sd
    join u on u.id = sd.user_id
    where sd.origin = 'legacy'
      and not exists (select 1 from recomputed r where r.user_id = sd.user_id and r.day = sd.day)
    group by sd.user_id

    -- Every source row has its entry in legacy_map or legacy_record.
    union all
    select s.user_id, 'unmapped:' || s.t, '0', count(*)::text
    from src_all s
    join u on u.id = s.user_id
    where not exists (select 1 from app.legacy_map m where m.legacy_table = s.t and m.legacy_id = s.lid)
      and not exists (select 1 from app.legacy_record r where r.legacy_table = s.t and r.legacy_id = s.lid)
    group by s.user_id, s.t
  )
  select c.user_id, c.check_name, c.expected, c.actual
  from checks c
  where c.expected is distinct from c.actual
  order by c.user_id, c.check_name;
$$;
