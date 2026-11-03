-- Assessment grading: freeze the answers that were graded.
--
-- The answers stay editable while a grading runs (the model call takes several seconds), so what
-- was sent to the grader could differ from what is stored when the result is written. The grader
-- now hands back the exact answers it graded and complete_assessment_grading stores them together
-- with the result, in the same transaction: the answers shown next to a result are the ones graded.

drop function public.complete_assessment_grading(uuid, uuid, jsonb, text, text, text, integer, integer);

create function public.complete_assessment_grading(
  p_assessment_id uuid,
  p_user_id uuid,
  p_answers jsonb,
  p_results jsonb,
  p_production_level text,
  p_model text,
  p_prompt_version text,
  p_input_tokens integer,
  p_output_tokens integer
) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_language text;
begin
  if jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'the answers must be an object' using errcode = '22023';
  end if;

  update public.assessments a
  set status = 'graded',
      answers = p_answers,
      results = p_results,
      model = p_model,
      prompt_version = p_prompt_version,
      input_tokens = p_input_tokens,
      output_tokens = p_output_tokens,
      graded_at = now()
  where a.id = p_assessment_id and a.user_id = p_user_id and a.status = 'in_progress'
  returning a.language into v_language;
  if not found then
    raise exception 'assessment not found' using errcode = 'P0002';
  end if;

  if p_production_level is not null then
    update public.user_languages ul
    set production_level = p_production_level
    where ul.user_id = p_user_id and ul.language = v_language;
  end if;
end;
$$;

revoke execute on function public.complete_assessment_grading(uuid, uuid, jsonb, jsonb, text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.complete_assessment_grading(uuid, uuid, jsonb, jsonb, text, text, text, integer, integer)
  to service_role;
