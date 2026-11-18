-- Schema `app`, milestone 2, block S3 (function): app.save_game_settings, the client-callable way to change
-- the game settings. It acts on auth.uid(), never on an identifier received as an argument, validates the
-- whole input itself (closed list of keys, types and bounds) and journals each changed key in
-- app.setting_change with the day from which it applies, so the streak recomputation stays replayable.
-- Nothing in `public` is modified. Spec: docs/refonte/specs/j2-jeu-xp-serie.md section 8,
-- docs/refonte/specs/j2-pr1-lots.md (lot S3).
--
-- p_settings: JSON object, nested by group as stored in profile.game_settings. It is a patch: the keys
-- given replace the stored ones, the others stay as they are. Closed list:
--   xpVisible bool; celebrations 'full'|'reduced'; haptics bool;
--   ring { enabled bool, tier 10|15|20|30 };
--   streak { enabled bool, mode 'daily'|'weekly', weeklyTarget 2..7, restDays [0 to 2 distinct ISO weekdays 1..7] };
--   sound { enabled bool, volume 1..3 };
--   notifications { enabled bool, time 'HH:mm', weeklySummary bool } (time is stored in profile.reminder_time);
--   answerTolerance { accents 'strict'|'lenient' }.
-- Effect day written in setting_change: the day after the current learning day; the next Monday for
-- streak.mode and streak.weeklyTarget.
-- Errors: 28000 no signed-in user; 22023 anything outside the closed list; P0002 no profile.

-- Validation of one key (dotted path) and value. Internal.
create function app.is_valid_game_setting(p_key text, p_value jsonb) returns boolean
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
               'notifications.enabled', 'notifications.weeklySummary') then
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

create function app.save_game_settings(p_settings jsonb) returns app.profile
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
  v_groups constant text[] := array['ring', 'streak', 'sound', 'notifications', 'answerTolerance'];
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

revoke execute on function app.is_valid_game_setting(text, jsonb) from public, anon, authenticated;
grant execute on function app.is_valid_game_setting(text, jsonb) to service_role;

revoke execute on function app.save_game_settings(jsonb) from public, anon;
grant execute on function app.save_game_settings(jsonb) to authenticated;
