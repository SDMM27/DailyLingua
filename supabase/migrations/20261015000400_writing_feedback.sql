-- Feedback of the language model on a written production (one row per mission session).
--
-- Written only by the server with the service role, after the review was validated against its
-- Zod contract (src/lib/schemas/writing-feedback.ts); the owner can read it, never write it, so a
-- review cannot be forged or its attempt counter reset. Same ownership model as
-- production_entries: user_id is tied to the session by a composite foreign key, and deleting the
-- account (or the session) deletes the review. Clearing the draft does not delete it.
--
-- Cost limit: at most 3 review attempts per session, failed calls included, counted by
-- claim_writing_feedback_attempt before the model is called. Sessions are only created by the
-- daily generation (at most 4 languages per day), which bounds the calls per user and per day.

create table public.writing_feedback (
  session_id uuid primary key,
  user_id uuid not null,
  attempts smallint not null default 0 check (attempts between 0 and 3),
  -- Text that was reviewed (the draft may change afterwards) and the review itself.
  body text check (char_length(body) <= 2500),
  feedback jsonb check (jsonb_typeof(feedback) = 'object'),
  model text check (char_length(model) <= 100),
  prompt_version text check (char_length(prompt_version) <= 40),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((body is null) = (feedback is null) and (feedback is null) = (reviewed_at is null)),
  foreign key (session_id, user_id) references public.mission_sessions (id, user_id) on delete cascade
);

create index writing_feedback_user_id_idx on public.writing_feedback (user_id);

create trigger writing_feedback_set_updated_at
  before update on public.writing_feedback
  for each row execute function public.set_updated_at();

alter table public.writing_feedback enable row level security;

revoke all on public.writing_feedback from anon, authenticated;
grant select on public.writing_feedback to authenticated;
grant select, insert, update, delete on public.writing_feedback to service_role;
create policy "writing_feedback: owner can read" on public.writing_feedback
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Counts one attempt and returns the new count, or null when the 3 attempts are used up.
-- Atomic: concurrent requests on one session cannot both take the last attempt.
create function public.claim_writing_feedback_attempt(p_session_id uuid, p_user_id uuid) returns smallint
language sql
set search_path = ''
as $$
  insert into public.writing_feedback as wf (session_id, user_id, attempts)
  values (p_session_id, p_user_id, 1)
  on conflict (session_id) do update set attempts = wf.attempts + 1
    where wf.user_id = p_user_id and wf.attempts < 3
  returning wf.attempts;
$$;

revoke execute on function public.claim_writing_feedback_attempt(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_writing_feedback_attempt(uuid, uuid) to service_role;
