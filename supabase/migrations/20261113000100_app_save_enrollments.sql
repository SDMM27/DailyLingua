-- app.save_enrollments: the client-callable way to choose the languages being learned.
-- Acts on auth.uid(), never on an identifier received as an argument. It validates its whole
-- JSON input itself, so a malformed input raises a documented SQLSTATE and never a raw cast error.
-- Nothing in `public` is modified. Spec: docs/refonte/specs/j1-pr2-donnees-i18n.md (lot A).
--
-- p_enrollments: JSON array of 1 to 4 objects
--   language       text, in app.language, not the native language, no duplicate
--   daily_minutes  integer 5..120 (required)
--   days           array of distinct integers 1..7, non-empty (default: every day)
--   target_level   null or A1..C2
--   purpose        null or text of at most 200 characters
--   start_level    null or A0, A1..C2 (declared starting level)
-- Unknown keys are refused. Errors:
--   28000 no signed-in user; 22023 malformed input (type, bound, shape, empty array);
--   23503 unknown language; 23514 native language, duplicate, more than 4 languages,
--   more than 120 minutes on one weekday.

create function app.save_enrollments(p_enrollments jsonb) returns setof app.enrollment
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_native text;
  v_el jsonb;
  v_pos integer;
  v_n integer;
  v_lang text;
  v_minutes numeric;
  v_days smallint[];
  v_day_el jsonb;
  v_day numeric;
  v_seen text[] := '{}';
  v_per_day integer[] := array[0, 0, 0, 0, 0, 0, 0];
  v_levels constant text[] := array['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  v_start text;
  v_idx integer;
  v_skill text;
  d smallint;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Serialise concurrent calls of the same user and read the native language.
  select p.native_language into v_native from app.profile p where p.user_id = uid for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if p_enrollments is null or jsonb_typeof(p_enrollments) <> 'array' then
    raise exception 'enrollments must be a JSON array' using errcode = '22023';
  end if;
  v_n := jsonb_array_length(p_enrollments);
  if v_n < 1 then
    raise exception 'enrollments must not be empty' using errcode = '22023';
  end if;
  if v_n > 4 then
    raise exception 'at most 4 languages can be learned' using errcode = '23514';
  end if;

  -- Pass 1: validate everything, write nothing.
  for v_el, v_pos in
    select e.value, e.ordinality::integer from jsonb_array_elements(p_enrollments) with ordinality as e
  loop
    if jsonb_typeof(v_el) <> 'object' then
      raise exception 'enrollment % must be an object', v_pos using errcode = '22023';
    end if;
    if exists (
      select 1 from jsonb_object_keys(v_el) as k
      where k <> all (array['language', 'daily_minutes', 'days', 'target_level', 'purpose', 'start_level'])
    ) then
      raise exception 'enrollment % has an unknown key', v_pos using errcode = '22023';
    end if;

    if jsonb_typeof(v_el -> 'language') is distinct from 'string' then
      raise exception 'enrollment %: language must be a string', v_pos using errcode = '22023';
    end if;
    v_lang := v_el ->> 'language';

    if jsonb_typeof(v_el -> 'daily_minutes') is distinct from 'number' then
      raise exception 'enrollment %: daily_minutes must be a number', v_pos using errcode = '22023';
    end if;
    v_minutes := (v_el ->> 'daily_minutes')::numeric;
    if v_minutes <> trunc(v_minutes) or v_minutes < 5 or v_minutes > 120 then
      raise exception 'enrollment %: daily_minutes must be an integer from 5 to 120', v_pos using errcode = '22023';
    end if;

    if v_el ? 'days' then
      if jsonb_typeof(v_el -> 'days') <> 'array' or jsonb_array_length(v_el -> 'days') = 0
         or jsonb_array_length(v_el -> 'days') > 7 then
        raise exception 'enrollment %: days must be a non-empty array of at most 7 weekdays', v_pos
          using errcode = '22023';
      end if;
      v_days := '{}';
      for v_day_el in select value from jsonb_array_elements(v_el -> 'days') loop
        if jsonb_typeof(v_day_el) <> 'number' then
          raise exception 'enrollment %: days must contain integers', v_pos using errcode = '22023';
        end if;
        v_day := (v_day_el #>> '{}')::numeric;
        if v_day <> trunc(v_day) or v_day < 1 or v_day > 7 then
          raise exception 'enrollment %: weekdays go from 1 to 7', v_pos using errcode = '22023';
        end if;
        if v_day::smallint = any (v_days) then
          raise exception 'enrollment %: duplicate weekday', v_pos using errcode = '22023';
        end if;
        v_days := v_days || v_day::smallint;
      end loop;
    else
      v_days := array[1, 2, 3, 4, 5, 6, 7]::smallint[];
    end if;

    if v_el ? 'target_level' and jsonb_typeof(v_el -> 'target_level') <> 'null'
       and (jsonb_typeof(v_el -> 'target_level') <> 'string'
            or (v_el ->> 'target_level') <> all (array['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])) then
      raise exception 'enrollment %: target_level must be null or A1..C2', v_pos using errcode = '22023';
    end if;
    if v_el ? 'start_level' and jsonb_typeof(v_el -> 'start_level') <> 'null'
       and (jsonb_typeof(v_el -> 'start_level') <> 'string'
            or (v_el ->> 'start_level') <> all (v_levels)) then
      raise exception 'enrollment %: start_level must be null or A0..C2', v_pos using errcode = '22023';
    end if;
    if v_el ? 'purpose' and jsonb_typeof(v_el -> 'purpose') <> 'null'
       and (jsonb_typeof(v_el -> 'purpose') <> 'string' or char_length(v_el ->> 'purpose') > 200) then
      raise exception 'enrollment %: purpose must be null or a text of at most 200 characters', v_pos
        using errcode = '22023';
    end if;

    if not exists (select 1 from app.language l where l.code = v_lang) then
      raise exception 'unknown language: %', v_lang using errcode = '23503';
    end if;
    if v_lang = v_native then
      raise exception 'the native language cannot be learned' using errcode = '23514';
    end if;
    if v_lang = any (v_seen) then
      raise exception 'duplicate language: %', v_lang using errcode = '23514';
    end if;
    v_seen := v_seen || v_lang;

    foreach d in array v_days loop
      v_per_day[d] := v_per_day[d] + v_minutes::integer;
    end loop;
  end loop;

  if exists (select 1 from unnest(v_per_day) as m where m > 120) then
    raise exception 'more than 120 minutes planned on one weekday' using errcode = '23514';
  end if;

  -- Pass 2: write. The input is validated, the casts below cannot fail.
  for v_el, v_pos in
    select e.value, e.ordinality::integer from jsonb_array_elements(p_enrollments) with ordinality as e
  loop
    v_lang := v_el ->> 'language';
    if v_el ? 'days' then
      select array_agg((t.x #>> '{}')::smallint order by t.o) into v_days
      from jsonb_array_elements(v_el -> 'days') with ordinality as t(x, o);
    else
      v_days := array[1, 2, 3, 4, 5, 6, 7]::smallint[];
    end if;

    insert into app.enrollment (user_id, language, purpose, target_level, daily_minutes, days, position, active)
    values (uid, v_lang, v_el ->> 'purpose', v_el ->> 'target_level',
            (v_el ->> 'daily_minutes')::numeric::smallint, v_days, (v_pos - 1)::smallint, true)
    on conflict (user_id, language) do update
    set purpose = excluded.purpose,
        target_level = excluded.target_level,
        daily_minutes = excluded.daily_minutes,
        days = excluded.days,
        position = excluded.position,
        active = true;

    v_start := v_el ->> 'start_level';
    if v_start is not null
       and not exists (select 1 from app.skill_estimate s where s.user_id = uid and s.language = v_lang) then
      v_idx := array_position(v_levels, v_start);
      foreach v_skill in array array['reading', 'listening', 'writing', 'speaking'] loop
        insert into app.skill_estimate (user_id, language, skill, level_value, uncertainty, source)
        values (uid, v_lang, v_skill, v_idx - 0.5, 1.0, 'declared')
        on conflict (user_id, language, skill) do nothing;
      end loop;
    end if;
  end loop;

  update app.enrollment e
  set active = false
  where e.user_id = uid and e.active and e.language <> all (v_seen);

  perform app.mark_active(uid);

  return query
    select e.* from app.enrollment e where e.user_id = uid and e.active order by e.position;
end;
$$;

revoke execute on function app.save_enrollments(jsonb) from public, anon;
grant execute on function app.save_enrollments(jsonb) to authenticated;
