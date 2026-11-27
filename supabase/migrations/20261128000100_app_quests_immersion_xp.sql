-- Schema `app`, milestone 7, lot 1: quests and XP of declared immersion. Spec: docs/refonte/specs/j7-social.md.
--
-- 1. Game settings: the boolean keys of the social mechanics (quests, immersionXp, badges, league, friends).
-- 2. app.immersion_close: the days of immersion that are closed (append only), and app.close_immersion_days.
-- 3. app.quest_assignment and app.complete_quest.
-- Additive only. Everything is computed lazily for one user by the service (no scheduled task).

-- Game settings ---------------------------------------------------------------------------------------------------
-- Same bodies as before (is_valid_game_setting: 20261117000400; save_game_settings: 20261118000200), with the
-- new keys `<group>.enabled`.

create or replace function app.is_valid_game_setting(p_key text, p_value jsonb) returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_type text := jsonb_typeof(p_value);
  v_num numeric;
  v_el jsonb;
  v_days integer[] := '{}';
  v_day integer;
begin
  if v_type is null or v_type = 'null' then
    return false;
  end if;

  if p_key in ('xpVisible', 'ring.enabled', 'streak.enabled', 'sound.enabled', 'haptics',
               'notifications.enabled', 'notifications.weeklySummary',
               'quests.enabled', 'immersionXp.enabled', 'badges.enabled', 'league.enabled', 'friends.enabled') then
    return v_type = 'boolean';
  end if;

  if p_key in ('ring.tier', 'streak.weeklyTarget', 'sound.volume') then
    if v_type <> 'number' then
      return false;
    end if;
    v_num := (p_value #>> '{}')::numeric;
    if v_num <> trunc(v_num) then
      return false;
    end if;
    return case p_key
      when 'ring.tier' then v_num in (10, 15, 20, 30)
      when 'streak.weeklyTarget' then v_num between 2 and 7
      else v_num between 1 and 3
    end;
  end if;

  if p_key = 'streak.mode' then
    return v_type = 'string' and (p_value #>> '{}') in ('daily', 'weekly');
  end if;
  if p_key = 'celebrations' then
    return v_type = 'string' and (p_value #>> '{}') in ('full', 'reduced');
  end if;
  if p_key = 'answerTolerance.accents' then
    return v_type = 'string' and (p_value #>> '{}') in ('strict', 'lenient');
  end if;
  if p_key = 'notifications.time' then
    return v_type = 'string' and (p_value #>> '{}') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$';
  end if;

  if p_key = 'streak.restDays' then
    if v_type <> 'array' or jsonb_array_length(p_value) > 2 then
      return false;
    end if;
    for v_el in select e.value from jsonb_array_elements(p_value) as e loop
      if jsonb_typeof(v_el) <> 'number' then
        return false;
      end if;
      v_num := (v_el #>> '{}')::numeric;
      if v_num <> trunc(v_num) or v_num < 1 or v_num > 7 then
        return false;
      end if;
      v_day := v_num::integer;
      if v_day = any (v_days) then
        return false;
      end if;
      v_days := v_days || v_day;
    end loop;
    return true;
  end if;

  return false;
end;
$$;

create or replace function app.save_game_settings(p_settings jsonb) returns app.profile
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_profile app.profile;
  v_new jsonb;
  v_keys text[] := '{}';
  v_vals jsonb[] := '{}';
  v_groups constant text[] := array['ring', 'streak', 'sound', 'notifications', 'answerTolerance',
    'quests', 'immersionXp', 'badges', 'league', 'friends'];
  v_k text;
  v_v jsonb;
  v_k2 text;
  v_v2 jsonb;
  v_old jsonb;
  v_today date;
  v_next date;
  v_monday date;
  v_path text[];
  v_time text;
  i integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Serialises concurrent calls of the same user.
  select * into v_profile from app.profile p where p.user_id = uid for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'settings must be a JSON object' using errcode = '22023';
  end if;

  -- Pass 1: validate everything, write nothing.
  for v_k, v_v in select e.key, e.value from jsonb_each(p_settings) as e loop
    if v_k = any (v_groups) then
      if jsonb_typeof(v_v) <> 'object' then
        raise exception 'settings: % must be an object', v_k using errcode = '22023';
      end if;
      for v_k2, v_v2 in select e.key, e.value from jsonb_each(v_v) as e loop
        if not app.is_valid_game_setting(v_k || '.' || v_k2, v_v2) then
          raise exception 'settings: unknown key or invalid value for %.%', v_k, v_k2 using errcode = '22023';
        end if;
        v_keys := v_keys || (v_k || '.' || v_k2);
        v_vals := v_vals || v_v2;
      end loop;
    else
      if not app.is_valid_game_setting(v_k, v_v) then
        raise exception 'settings: unknown key or invalid value for %', v_k using errcode = '22023';
      end if;
      v_keys := v_keys || v_k;
      v_vals := v_vals || v_v;
    end if;
  end loop;

  -- I4: a ceiling on the journal this function can grow (nothing else limits the calls of a client).
  if (select count(*) from app.setting_change c
      where c.user_id = uid and c.changed_at > now() - interval '24 hours') > 50 then
    raise exception 'too many setting changes in the last 24 hours' using errcode = '23514';
  end if;

  -- Pass 2: write. The effect day follows the current learning day of the user.
  v_today := app.learning_day_at(v_profile.time_zone, now());
  v_next := v_today + 1;
  v_monday := date_trunc('week', v_today::timestamp)::date + 7;
  v_new := v_profile.game_settings;

  for i in 1 .. coalesce(array_length(v_keys, 1), 0) loop
    if v_keys[i] = 'notifications.time' then
      v_old := case when v_profile.reminder_time is null then null
                    else to_jsonb(to_char(v_profile.reminder_time, 'HH24:MI')) end;
    else
      v_old := v_profile.game_settings #> string_to_array(v_keys[i], '.');
    end if;

    if v_old is not distinct from v_vals[i] then
      continue;
    end if;

    insert into app.setting_change (user_id, key, value, effective_day)
    values (uid, v_keys[i], v_vals[i],
            case when v_keys[i] in ('streak.mode', 'streak.weeklyTarget') then v_monday else v_next end);

    if v_keys[i] <> 'notifications.time' then
      v_path := string_to_array(v_keys[i], '.');
      if array_length(v_path, 1) = 2 then
        v_new := jsonb_set(v_new, array[v_path[1]], coalesce(v_new -> v_path[1], '{}'::jsonb), true);
      end if;
      v_new := jsonb_set(v_new, v_path, v_vals[i], true);
    end if;
  end loop;

  v_time := (select v_vals[array_position(v_keys, 'notifications.time')] #>> '{}');

  update app.profile
  set game_settings = v_new,
      reminder_time = coalesce(v_time::time, reminder_time),
      app_active_since = coalesce(app_active_since, now())
  where user_id = uid
  returning * into v_profile;

  return v_profile;
end;
$$;
