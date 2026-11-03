-- Skills assessment data (phase O3): one dossier (reading, listening, writing, speaking declaration)
-- taken by a signed-in learner, its answers, and the result per skill once graded.
--
--  * assessments: one row per attempt. The owner can read their rows and nothing else: answers are
--    saved through save_assessment_answers (the owner, while the assessment is in progress) and the
--    grading fields are written by the server with the service role (claim / complete functions
--    below), so a result cannot be forged. The confidence of each skill lives inside `results`.
--    At most one assessment is in progress per user and language; history is kept when the language
--    is removed from the preferences (no foreign key to user_languages) and goes with the account.
--  * assessment_grading_quota: gradings per user and UTC day (a time zone is editable by the user,
--    so it must not be able to bypass the quota). Service role only.
--  * user_languages.production_level: level of the production tasks (written exercises), null = the
--    single level. save_preferences does not touch it, so it is kept when preferences are saved.
--  * Guests cannot take the assessment: the grading calls a paid model and the result updates the
--    profile, which a guest does not keep.
--
-- Cost limit: at most 3 grading attempts per assessment and 5 per user and UTC day, failed calls
-- included, counted by claim_assessment_grading before the model is called.
--
-- Errors the app maps:
--   28000  not signed in
--   P0002  language not studied, or assessment missing / not the user's / not in progress -> not found
--   22023  dossier of another language, or listening plays outside 0..3                    -> invalid
--   DL004  guests cannot take the assessment (message 'guest_not_allowed'), a custom SQLSTATE so that
--          it cannot be confused with a generic P0001 raise_exception

alter table public.user_languages
  add column production_level text check (production_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  language text not null references public.languages (code),
  dossier_id text not null check (dossier_id ~ '^[a-z]{2,3}-(a1|a2|b1|b2|c1|c2)-[1-9][0-9]*$'),
  status text not null default 'in_progress' check (status in ('in_progress', 'graded')),
  -- { questions: { <id>: text }, writing: text, speaking: { <id>: boolean } }, validated by the app.
  answers jsonb not null default '{}' check (
    jsonb_typeof(answers) = 'object' and octet_length(answers::text) <= 20000
  ),
  listening_plays smallint not null default 0 check (listening_plays between 0 and 3),
  -- { reading, listening, writing, speaking }: { level, confidence } or null per skill.
  results jsonb check (jsonb_typeof(results) = 'object'),
  model text check (char_length(model) <= 100),
  prompt_version text check (char_length(prompt_version) <= 40),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  grading_attempts smallint not null default 0 check (grading_attempts between 0 and 3),
  graded_at timestamptz,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'graded') = (results is not null) and (results is null) = (graded_at is null))
);

create unique index assessments_one_in_progress_idx
  on public.assessments (user_id, language) where status = 'in_progress';
create index assessments_user_language_started_idx
  on public.assessments (user_id, language, started_at desc);

create trigger assessments_set_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();

alter table public.assessments enable row level security;

revoke all on public.assessments from anon, authenticated;
grant select on public.assessments to authenticated;
grant select, insert, update, delete on public.assessments to service_role;
create policy "assessments: owner can read" on public.assessments
  for select to authenticated
  using (user_id = (select auth.uid()));

create table public.assessment_grading_quota (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- UTC day.
  day date not null,
  attempts smallint not null check (attempts between 0 and 5),
  primary key (user_id, day)
);

alter table public.assessment_grading_quota enable row level security;

revoke all on public.assessment_grading_quota from anon, authenticated;
grant select, insert, update, delete on public.assessment_grading_quota to service_role;

-- Starts an assessment, or returns the one already in progress for that language (whatever its
-- dossier), also under concurrency: the partial unique index decides, the loser rereads.
create function public.start_assessment(p_language text, p_dossier_id text) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from auth.users u where u.id = uid and u.is_anonymous) then
    raise exception 'guest_not_allowed' using errcode = 'DL004';
  end if;
  if not exists (select 1 from public.user_languages ul where ul.user_id = uid and ul.language = p_language) then
    raise exception 'language % is not one of the user''s', p_language using errcode = 'P0002';
  end if;
  if split_part(p_dossier_id, '-', 1) is distinct from p_language then
    raise exception 'the dossier does not belong to the language' using errcode = '22023';
  end if;

  select a.id into v_id from public.assessments a
  where a.user_id = uid and a.language = p_language and a.status = 'in_progress';
  if found then
    return v_id;
  end if;

  insert into public.assessments (user_id, language, dossier_id)
  values (uid, p_language, p_dossier_id)
  on conflict (user_id, language) where status = 'in_progress' do nothing
  returning id into v_id;
  if v_id is null then
    select a.id into v_id from public.assessments a
    where a.user_id = uid and a.language = p_language and a.status = 'in_progress';
  end if;
  return v_id;
end;
$$;

revoke execute on function public.start_assessment(text, text) from public, anon;
grant execute on function public.start_assessment(text, text) to authenticated;

-- Saves the answers so far and the listening plays. Only these two fields can change, and the
-- plays never go down (reopening the page cannot give plays back).
create function public.save_assessment_answers(
  p_assessment_id uuid,
  p_answers jsonb,
  p_listening_plays integer
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'the answers must be an object' using errcode = '22023';
  end if;
  if p_listening_plays is null or p_listening_plays not between 0 and 3 then
    raise exception 'the listening plays must be between 0 and 3' using errcode = '22023';
  end if;

  -- Same error for a missing, foreign or finished assessment: do not reveal another user's.
  update public.assessments a
  set answers = p_answers,
      listening_plays = greatest(a.listening_plays, p_listening_plays)
  where a.id = p_assessment_id and a.user_id = uid and a.status = 'in_progress';
  if not found then
    raise exception 'assessment not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.save_assessment_answers(uuid, jsonb, integer) from public, anon;
grant execute on function public.save_assessment_answers(uuid, jsonb, integer) to authenticated;

-- Counts one grading attempt and returns the attempts of the assessment, or null when the 3 attempts
-- of the assessment or the 5 of the user's UTC day are used up. A refused attempt counts for
-- neither. The assessment row is locked first, so concurrent requests cannot both take the last one.
create function public.claim_assessment_grading(p_assessment_id uuid, p_user_id uuid) returns smallint
language plpgsql
set search_path = ''
as $$
declare
  v_attempts smallint;
  v_day_attempts smallint;
begin
  select a.grading_attempts into v_attempts from public.assessments a
  where a.id = p_assessment_id and a.user_id = p_user_id and a.status = 'in_progress'
  for update;
  if not found then
    raise exception 'assessment not found' using errcode = 'P0002';
  end if;
  if v_attempts >= 3 then
    return null;
  end if;

  insert into public.assessment_grading_quota as q (user_id, day, attempts)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set attempts = q.attempts + 1
    where q.attempts < 5
  returning q.attempts into v_day_attempts;
  if v_day_attempts is null then
    return null;
  end if;

  update public.assessments a set grading_attempts = v_attempts + 1 where a.id = p_assessment_id;
  return v_attempts + 1;
end;
$$;

revoke execute on function public.claim_assessment_grading(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_assessment_grading(uuid, uuid) to service_role;

-- Records the validated results and, when a production level is given, applies it to the user's
-- language, in one transaction. A language removed since the start leaves nothing to update.
create function public.complete_assessment_grading(
  p_assessment_id uuid,
  p_user_id uuid,
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
  update public.assessments a
  set status = 'graded',
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

revoke execute on function public.complete_assessment_grading(uuid, uuid, jsonb, text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.complete_assessment_grading(uuid, uuid, jsonb, text, text, text, integer, integer)
  to service_role;
