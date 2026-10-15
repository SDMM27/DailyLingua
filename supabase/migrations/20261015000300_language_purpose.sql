-- Per-language learning purpose: it sets the register and the kind of exercises of the missions.
-- Mirrors LANGUAGE_PURPOSES in src/lib/schemas/preferences.ts.

alter table public.user_languages
  add column purpose text not null default 'general'
    check (purpose in ('general', 'conversational', 'professional', 'travel', 'exam'));

-- save_preferences also writes the purpose (same signature as in 20261013000700_phase3_writes.sql;
-- a payload without purpose means general).
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
  set level = g.level, target_level = g.target_level, focus = coalesce(g.focus, ''), weight = g.weight,
      purpose = coalesce(g.purpose, 'general')
  from jsonb_to_recordset(p_goals) as g (
    language text, level text, target_level text, focus text, weight integer, purpose text
  )
  where ul.user_id = uid and ul.language = g.language;

  insert into public.user_languages (user_id, language, level, target_level, focus, weight, purpose)
  select uid, g.language, g.level, g.target_level, coalesce(g.focus, ''), g.weight, coalesce(g.purpose, 'general')
  from jsonb_to_recordset(p_goals) as g (
    language text, level text, target_level text, focus text, weight integer, purpose text
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
