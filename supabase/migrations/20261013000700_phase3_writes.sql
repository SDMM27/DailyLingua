-- Phase 3: what the app needs to write.
--
-- 1. Calendar days are never defaulted by the database.
--    `current_date` is the date of the database server (UTC), not the day of the user, so a
--    word added at 00:30 in Paris would be dated the day before. The app always computes the
--    day in the user's time zone (src/lib/domain/dates.ts) and passes it explicitly; without a
--    default, forgetting it is an error instead of a silently wrong date.
--
-- 2. save_preferences: profile settings and language goals are saved in one transaction
--    (a half-saved onboarding would leave the user without languages).
--
-- 3. record_vocabulary_review: moves a word to its next review state and appends the journal
--    entry atomically. The new state is computed by the app (src/lib/domain/spaced-repetition.ts
--    stays the single source of truth for the intervals); this function only writes it.
--
-- 4. sync_mission_progress: missions.started_at / completed_at follow the activity progress,
--    maintained by a trigger so they cannot drift from what the user actually ticked.
--
-- The two functions above are SECURITY INVOKER: they run as the signed-in user, so RLS and the
-- column grants of migration 5 still apply.

alter table public.vocabulary_items
  alter column due_on drop default,
  alter column added_on drop default;

-- Preferences ----------------------------------------------------------------------------------

create function public.save_preferences(
  p_daily_minutes integer,
  p_topics text[],
  p_content_types text[],
  p_difficulty text,
  p_generation_time time,
  p_time_zone text,
  p_goals jsonb
) returns void
language plpgsql
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(p_goals) is distinct from 'array' or jsonb_array_length(p_goals) not between 1 and 4 then
    raise exception 'between 1 and 4 languages are required' using errcode = '23514';
  end if;

  update public.profiles
  set daily_minutes = p_daily_minutes,
      topics = p_topics,
      content_types = p_content_types,
      difficulty = p_difficulty,
      generation_time = p_generation_time,
      time_zone = p_time_zone
  where id = uid;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  -- Removed languages first, so the 4-language limit is never exceeded on the way.
  delete from public.user_languages ul
  where ul.user_id = uid
    and ul.language not in (select g.language from jsonb_to_recordset(p_goals) as g (language text));

  -- Update before insert: the "max 4 languages" trigger fires before ON CONFLICT is resolved,
  -- so an upsert of an existing language would be rejected for a user who already has four.
  update public.user_languages ul
  set level = g.level, target_level = g.target_level, focus = coalesce(g.focus, ''), weight = g.weight
  from jsonb_to_recordset(p_goals) as g (language text, level text, target_level text, focus text, weight integer)
  where ul.user_id = uid and ul.language = g.language;

  insert into public.user_languages (user_id, language, level, target_level, focus, weight)
  select uid, g.language, g.level, g.target_level, coalesce(g.focus, ''), g.weight
  from jsonb_to_recordset(p_goals) as g (language text, level text, target_level text, focus text, weight integer)
  where not exists (
    select 1 from public.user_languages ul where ul.user_id = uid and ul.language = g.language
  );
end;
$$;

revoke execute on function public.save_preferences(integer, text[], text[], text, time, text, jsonb)
  from public, anon;
grant execute on function public.save_preferences(integer, text[], text[], text, time, text, jsonb)
  to authenticated;

-- Spaced repetition ----------------------------------------------------------------------------

-- Returns false when the word was not updated: it no longer exists, or it was reviewed since
-- the app read it (p_expected_review_count differs), e.g. a double tap or a second device.
create function public.record_vocabulary_review(
  p_item_id uuid,
  p_grade text,
  p_reviewed_on date,
  p_box_after smallint,
  p_due_on_after date,
  p_expected_review_count integer
) returns boolean
language plpgsql
set search_path = ''
as $$
declare
  item public.vocabulary_items;
begin
  select * into item
  from public.vocabulary_items
  where id = p_item_id and review_count = p_expected_review_count
  for update;
  if not found then
    return false;
  end if;

  update public.vocabulary_items
  set box = p_box_after,
      due_on = p_due_on_after,
      last_reviewed_on = p_reviewed_on,
      review_count = review_count + 1
  where id = item.id;

  insert into public.vocabulary_reviews (user_id, item_id, reviewed_on, grade, box_before, box_after, due_on_after)
  values (item.user_id, item.id, p_reviewed_on, p_grade, item.box, p_box_after, p_due_on_after);

  return true;
end;
$$;

revoke execute on function public.record_vocabulary_review(uuid, text, date, smallint, date, integer)
  from public, anon;
grant execute on function public.record_vocabulary_review(uuid, text, date, smallint, date, integer)
  to authenticated;

-- Mission progress -----------------------------------------------------------------------------

-- started_at is set by the first activity touched; completed_at is set when every activity of
-- the mission is completed and cleared again if one is unticked. SECURITY DEFINER because the
-- trigger runs for the user, who may only update these two columns through the API.
create function public.sync_mission_progress() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mission_id uuid;
  v_total integer;
  v_done integer;
begin
  select s.mission_id into v_mission_id
  from public.mission_activities a
  join public.mission_sessions s on s.id = a.session_id
  where a.id = new.activity_id;

  select count(*)::integer, count(p.completed_at)::integer into v_total, v_done
  from public.mission_activities a
  join public.mission_sessions s on s.id = a.session_id
  left join public.activity_progress p on p.activity_id = a.id
  where s.mission_id = v_mission_id;

  update public.missions
  set started_at = coalesce(started_at, now()),
      completed_at = case when v_total > 0 and v_done = v_total then coalesce(completed_at, now()) end
  where id = v_mission_id;

  return null;
end;
$$;

create trigger activity_progress_sync_mission
  after insert or update of completed_at on public.activity_progress
  for each row execute function public.sync_mission_progress();

revoke execute on function public.sync_mission_progress() from public, anon, authenticated;
