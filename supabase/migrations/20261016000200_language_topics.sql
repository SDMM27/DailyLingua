-- Topics and content types per language: a learner of English for work and of Spanish for pleasure
-- no longer share the same interests. Mirrors TOPICS / CONTENT_TYPES (src/lib/schemas).
--
--  * user_languages gets `topics` and `content_types`, with the same element checks as the
--    profiles columns, filled from the profile for the existing rows, then not null and non-empty.
--    The defaults are those of profiles, so a direct insert still works.
--  * profiles.topics / profiles.content_types are kept and still accepted (old clients, and a
--    later migration drops them once production has run a while without error).
--  * save_preferences: each language of p_goals may carry topics / content_types. When an item
--    lacks them, the language keeps its current values, else the profile's (old clients keep
--    working). p_topics / p_content_types may be null (new clients): the profile is then left as is.

alter table public.user_languages
  add column topics text[],
  add column content_types text[];

update public.user_languages ul
set topics = p.topics, content_types = p.content_types
from public.profiles p
where p.id = ul.user_id;

alter table public.user_languages
  alter column topics set default array['société', 'culture'],
  alter column topics set not null,
  alter column content_types set default array['article', 'podcast'],
  alter column content_types set not null,
  add constraint user_languages_topics_not_empty check (cardinality(topics) >= 1),
  add constraint user_languages_content_types_valid check (
    cardinality(content_types) >= 1
    and content_types <@ array['article', 'podcast', 'video', 'interview']
  );

create or replace function public.save_preferences(
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
      time_zone = p_time_zone
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

revoke execute on function public.save_preferences(integer, text[], text[], text, time, text, jsonb)
  from public, anon;
grant execute on function public.save_preferences(integer, text[], text[], text, time, text, jsonb)
  to authenticated;
