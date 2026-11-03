-- Skills assessment (phase O4): the learner confirms the reception level of a graded assessment and
-- it becomes their level for the language.
--
--  * apply_assessment_reception_level: sets user_languages.level, as record_placement_test does for
--    the placement test, and raises target_level when it would end up below the level (a target
--    below the current level has no meaning). The app computes the level from the stored results
--    (the lowest of reading and listening) and never takes it from the browser; the function checks
--    it against the same results anyway, as it is callable by any signed-in user.
--
-- Errors the app maps:
--   28000  not signed in
--   P0002  assessment missing / not the user's / not graded, or language no longer studied -> not found
--   22023  not a CEFR level, or not the reception level of the assessment                  -> invalid

create function public.apply_assessment_reception_level(p_assessment_id uuid, p_level text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_levels constant text[] := array['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  v_language text;
  v_results jsonb;
  v_rank integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Same error for a missing, foreign or unfinished assessment: do not reveal another user's.
  select a.language, a.results into v_language, v_results
  from public.assessments a
  where a.id = p_assessment_id and a.user_id = uid and a.status = 'graded';
  if not found then
    raise exception 'assessment not found' using errcode = 'P0002';
  end if;

  if p_level is null or array_position(v_levels, p_level) is null then
    raise exception 'not a CEFR level' using errcode = '22023';
  end if;

  -- Reception level: the lowest of reading and listening that were assessed.
  select min(array_position(v_levels, s.level)) into v_rank
  from (values (v_results -> 'reading' ->> 'level'), (v_results -> 'listening' ->> 'level')) as s (level)
  where s.level is not null;
  if v_rank is distinct from array_position(v_levels, p_level) then
    raise exception 'not the reception level of the assessment' using errcode = '22023';
  end if;

  update public.user_languages ul
  set level = p_level,
      target_level = case
        when array_position(v_levels, ul.target_level) < array_position(v_levels, p_level) then p_level
        else ul.target_level
      end
  where ul.user_id = uid and ul.language = v_language;
  if not found then
    raise exception 'language % is not one of the user''s', v_language using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.apply_assessment_reception_level(uuid, text) from public, anon;
grant execute on function public.apply_assessment_reception_level(uuid, text) to authenticated;
