-- Phase 5: generation of the daily mission.
--
-- The app writes a mission in three steps, all as the service role (users cannot call these
-- functions; they keep reading missions through RLS as before):
--
--  1. claim_mission_generation: takes the right to generate the mission of (user, day). The unique
--     (user_id, mission_date) row is the lock: a second request for the same day (another tab,
--     the phase 6 cron) is told the mission is ready or in progress instead of paying for a second
--     generation. A failed or abandoned attempt can be taken over, up to a few attempts per day,
--     which also caps what a user can spend on the language model.
--  2. complete_mission_generation: writes sessions and activities and marks the mission ready, in
--     one transaction, so a user never sees half a mission.
--  3. fail_mission_generation: records why it failed (shown to nobody but the logs and the table;
--     the app writes a short message without secrets there).

alter table public.missions
  add column generation_attempts smallint not null default 0 check (generation_attempts between 0 and 20),
  add column generation_error text check (char_length(generation_error) <= 500);

create function public.claim_mission_generation(
  p_user_id uuid,
  p_mission_date date,
  p_budget_minutes integer,
  p_max_attempts integer default 3,
  p_stale_after interval default interval '3 minutes'
) returns table (mission_id uuid, status text, claimed boolean)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  m public.missions;
begin
  insert into public.missions (user_id, mission_date, budget_minutes, status, generation_attempts)
  values (p_user_id, p_mission_date, p_budget_minutes, 'generating', 1)
  on conflict (user_id, mission_date) do nothing
  returning * into m;
  if found then
    return query select m.id, m.status, true;
    return;
  end if;

  select * into m
  from public.missions
  where user_id = p_user_id and mission_date = p_mission_date
  for update;

  -- Ready, or another request is generating it right now.
  if m.status = 'ready' or (m.status = 'generating' and m.updated_at > now() - p_stale_after) then
    return query select m.id, m.status, false;
    return;
  end if;

  -- Failed or abandoned (a generating row nobody finished): retry while attempts are left.
  if m.generation_attempts >= p_max_attempts then
    if m.status = 'generating' then
      update public.missions set status = 'failed', generation_error = coalesce(generation_error, 'abandoned')
      where id = m.id
      returning * into m;
    end if;
    return query select m.id, m.status, false;
    return;
  end if;

  update public.missions
  set status = 'generating',
      generation_attempts = generation_attempts + 1,
      budget_minutes = p_budget_minutes,
      generation_error = null
  where id = m.id
  returning * into m;
  return query select m.id, m.status, true;
end;
$$;

-- p_sessions: [{ language, contentId, questions, expressions, production,
--                activities: [{ kind, title, estimatedMinutes }] }], in display order.
-- Shapes are validated by the app (Zod) before the call; the table constraints are the backstop
-- (a content in another language, an unknown activity kind, an empty title... are rejected).
create function public.complete_mission_generation(
  p_mission_id uuid,
  p_sessions jsonb,
  p_meta jsonb
) returns void
language plpgsql
set search_path = ''
as $$
declare
  m public.missions;
  s jsonb;
  a jsonb;
  s_position integer := 0;
  a_position integer;
  v_session_id uuid;
begin
  select * into m from public.missions where id = p_mission_id for update;
  if not found then
    raise exception 'mission % not found', p_mission_id using errcode = 'P0002';
  end if;
  if m.status <> 'generating' then
    raise exception 'mission % is not being generated (status %)', p_mission_id, m.status using errcode = '55000';
  end if;
  if jsonb_typeof(p_sessions) is distinct from 'array' or jsonb_array_length(p_sessions) = 0 then
    raise exception 'a mission needs at least one session' using errcode = '23514';
  end if;
  if jsonb_typeof(p_meta) is distinct from 'object' then
    raise exception 'generation meta must be an object' using errcode = '23514';
  end if;

  -- Nothing should be there (a failed attempt writes nothing), but a retry must start clean.
  delete from public.mission_sessions where mission_id = m.id;

  for s in select value from jsonb_array_elements(p_sessions) loop
    if jsonb_typeof(s -> 'activities') is distinct from 'array' or jsonb_array_length(s -> 'activities') = 0 then
      raise exception 'session % has no activity', s_position using errcode = '23514';
    end if;

    insert into public.mission_sessions (
      mission_id, user_id, position, language, content_id, questions, expressions, production
    ) values (
      m.id, m.user_id, s_position, s ->> 'language', (s ->> 'contentId')::uuid,
      coalesce(s -> 'questions', '[]'), coalesce(s -> 'expressions', '[]'), s -> 'production'
    )
    returning id into v_session_id;

    a_position := 0;
    for a in select value from jsonb_array_elements(s -> 'activities') loop
      insert into public.mission_activities (session_id, user_id, position, kind, title, estimated_minutes)
      values (v_session_id, m.user_id, a_position, a ->> 'kind', a ->> 'title', (a ->> 'estimatedMinutes')::smallint);
      a_position := a_position + 1;
    end loop;

    s_position := s_position + 1;
  end loop;

  update public.missions
  set status = 'ready', generated_at = now(), generation_meta = p_meta, generation_error = null
  where id = m.id;
end;
$$;

create function public.fail_mission_generation(p_mission_id uuid, p_error text) returns void
language sql
set search_path = ''
as $$
  update public.missions
  set status = 'failed', generation_error = left(coalesce(p_error, 'unknown error'), 500)
  where id = p_mission_id and status = 'generating';
$$;

revoke execute on function public.claim_mission_generation(uuid, date, integer, integer, interval)
  from public, anon, authenticated;
revoke execute on function public.complete_mission_generation(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.fail_mission_generation(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_mission_generation(uuid, date, integer, integer, interval) to service_role;
grant execute on function public.complete_mission_generation(uuid, jsonb, jsonb) to service_role;
grant execute on function public.fail_mission_generation(uuid, text) to service_role;
