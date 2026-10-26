-- Day streak preference (phase J3): the streak on the home page can be switched off.
--
--  * profiles.show_streak, shown by default.
--  * save_preferences gets p_show_streak (default true). The old signature is dropped first so no
--    ambiguous overload remains; the body is otherwise that of 20261016000200_language_topics.sql.

alter table public.profiles
  add column show_streak boolean not null default true;

drop function public.save_preferences(integer, text[], text[], text, time, text, jsonb);

create function public.save_preferences(
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
  update public.profiles
  set daily_minutes = p_daily_minutes,
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
