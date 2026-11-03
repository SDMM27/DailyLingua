-- Minutes per language (phase M1): user_languages.weight is no longer a relative share (1..10)
-- but the minutes of that language per day (10..120, steps of 5 in the UI).
--
--  * The inline check on weight (user_languages_weight_check) is replaced by 10..120, default 10.
--  * Existing rows are converted like weightsToMinutes (src/lib/domain/time-budget.ts): each
--    language gets round(daily_minutes * weight / sum(weights) / 5) * 5 minutes, at least 10; while
--    a user's total exceeds 120, 5 minutes are taken off the largest share above 10 (the first on
--    a tie, in the order of descending former weight, then creation date, then language).
--  * profiles.daily_minutes becomes the sum of the user's minutes (still within its 10..120 check).
--  * save_preferences keeps its signature but computes daily_minutes from the goals' weights;
--    p_daily_minutes is ignored. The body is otherwise that of 20261026000100_show_streak.sql.

alter table public.user_languages
  drop constraint if exists user_languages_weight_check;

do $convert$
declare
  u record;
  mins int[];
  w int[];
  total int;
  daily int;
  wsum int;
  largest int;
  i int;
begin
  for u in select distinct user_id from public.user_languages loop
    select array_agg(ul.weight::int order by ul.weight desc, ul.created_at, ul.language)
      into w
    from public.user_languages ul where ul.user_id = u.user_id;

    select p.daily_minutes into daily from public.profiles p where p.id = u.user_id;
    wsum := (select sum(x) from unnest(w) as x);
    mins := array[]::int[];
    for i in 1..array_length(w, 1) loop
      mins := mins || greatest(10, (round(daily::numeric * w[i] / wsum / 5) * 5)::int);
    end loop;

    loop
      total := (select sum(x) from unnest(mins) as x);
      exit when total <= 120;
      largest := null;
      for i in 1..array_length(mins, 1) loop
        if mins[i] > 10 and (largest is null or mins[i] > mins[largest]) then
          largest := i;
        end if;
      end loop;
      exit when largest is null;
      mins[largest] := mins[largest] - 5;
    end loop;

    -- Rows are matched through the same ordering as above.
    with ranked as (
      select ul.language,
             row_number() over (order by ul.weight desc, ul.created_at, ul.language) as rn
      from public.user_languages ul where ul.user_id = u.user_id
    )
    update public.user_languages ul
    set weight = mins[ranked.rn]
    from ranked
    where ul.user_id = u.user_id and ul.language = ranked.language;

    update public.profiles set daily_minutes = (select sum(x) from unnest(mins) as x) where id = u.user_id;
  end loop;
end;
$convert$;

alter table public.user_languages
  add constraint user_languages_weight_check check (weight between 10 and 120),
  alter column weight set default 10;

create or replace function public.save_preferences(
  p_daily_minutes integer,
  p_topics text[],
  p_content_types text[],
  p_difficulty text,
  p_generation_time time,
  p_time_zone text,
  p_goals jsonb,
  p_show_streak boolean default true
) returns void
language plpgsql
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  profile_topics text[];
  profile_content_types text[];
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(p_goals) is distinct from 'array' or jsonb_array_length(p_goals) not between 1 and 4 then
    raise exception 'between 1 and 4 languages are required' using errcode = '23514';
  end if;

  -- Top-level topics / content types are only sent by old clients; without them the profile keeps its own.
  -- p_daily_minutes is ignored: the day's total is the sum of the languages' minutes (weight).
  -- Clients still send it for the signature's sake; the server recomputes it.
  update public.profiles
  set daily_minutes = (select sum((g.weight)::integer) from jsonb_to_recordset(p_goals) as g (weight integer)),
      topics = coalesce(p_topics, topics),
      content_types = coalesce(p_content_types, content_types),
      difficulty = p_difficulty,
      generation_time = p_generation_time,
      time_zone = p_time_zone,
      show_streak = coalesce(p_show_streak, show_streak)
  where id = uid
  returning topics, content_types into profile_topics, profile_content_types;
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
  set level = g.level, target_level = g.target_level, focus = coalesce(g.focus, ''), weight = g.weight,
      purpose = coalesce(g.purpose, 'general'),
      topics = coalesce(g.topics, ul.topics),
      content_types = coalesce(g.content_types, ul.content_types)
  from jsonb_to_recordset(p_goals) as g (
    language text, level text, target_level text, focus text, weight integer, purpose text,
    topics text[], content_types text[]
  )
  where ul.user_id = uid and ul.language = g.language;

  insert into public.user_languages (user_id, language, level, target_level, focus, weight, purpose, topics, content_types)
  select uid, g.language, g.level, g.target_level, coalesce(g.focus, ''), g.weight, coalesce(g.purpose, 'general'),
         coalesce(g.topics, profile_topics), coalesce(g.content_types, profile_content_types)
  from jsonb_to_recordset(p_goals) as g (
    language text, level text, target_level text, focus text, weight integer, purpose text,
    topics text[], content_types text[]
  )
  where not exists (
    select 1 from public.user_languages ul where ul.user_id = uid and ul.language = g.language
  );
end;
$$;

revoke execute on function public.save_preferences(integer, text[], text[], text, time, text, jsonb, boolean)
  from public, anon;
grant execute on function public.save_preferences(integer, text[], text[], text, time, text, jsonb, boolean)
  to authenticated;
