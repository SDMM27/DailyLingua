-- Daily missions, their per-language sessions and activities, and the user's progress.
--
-- Modelling choices:
--  * What is generated (missions, sessions, activities) is written by the service role;
--    what the user does (progress, quiz answers, started/completed timestamps) is
--    written by the user. The RLS migration enforces that split.
--  * Exercises (questions, expressions, production task) are AI-generated, shaped
--    differently per kind and never queried one by one: they are stored as jsonb on
--    the session and validated with Zod when read (src/lib/schemas/mission.ts).
--  * Progress stays relational (activity_progress, quiz_answers) so streaks,
--    minutes and scores are plain SQL.
--  * user_id is repeated on child tables and tied to the parent by composite foreign
--    keys, so a child row can never belong to another user than its parent and RLS
--    policies are a single column comparison.

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Calendar day in the user's time zone (see DateKey). One mission per user per
  -- day makes the daily generation idempotent: INSERT ... ON CONFLICT DO NOTHING.
  mission_date date not null,
  budget_minutes smallint not null check (budget_minutes > 0),
  -- Generation lifecycle, owned by the service role.
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  generated_at timestamptz,
  -- Free-form trace of how it was generated (model, prompt version, ...).
  generation_meta jsonb not null default '{}' check (jsonb_typeof(generation_meta) = 'object'),
  -- Owned by the user.
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mission_date),
  unique (id, user_id),
  check (status <> 'ready' or generated_at is not null)
);

create trigger missions_set_updated_at
  before update on public.missions
  for each row execute function public.set_updated_at();

create table public.mission_sessions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null,
  user_id uuid not null,
  position smallint not null check (position >= 0),
  language text not null references public.languages (code),
  content_id uuid not null,
  questions jsonb not null default '[]' check (jsonb_typeof(questions) = 'array'),
  question_count integer generated always as (jsonb_array_length(questions)) stored,
  expressions jsonb not null default '[]' check (jsonb_typeof(expressions) = 'array'),
  production jsonb not null check (jsonb_typeof(production) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (mission_id, user_id) references public.missions (id, user_id) on delete cascade,
  foreign key (content_id, language) references public.contents (id, language),
  unique (mission_id, language),
  unique (mission_id, position),
  unique (id, user_id)
);

create index mission_sessions_user_id_idx on public.mission_sessions (user_id);
create index mission_sessions_content_id_idx on public.mission_sessions (content_id);

create table public.mission_activities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null,
  position smallint not null check (position >= 0),
  kind text not null
    check (kind in ('reading', 'listening', 'watching', 'comprehension', 'vocabulary', 'writing', 'speaking')),
  title text not null check (char_length(title) between 1 and 200),
  estimated_minutes smallint not null check (estimated_minutes > 0),
  foreign key (session_id, user_id) references public.mission_sessions (id, user_id) on delete cascade,
  unique (session_id, position),
  unique (id, user_id)
);

create index mission_activities_user_id_idx on public.mission_activities (user_id);

-- One row per activity the user has touched; completed_at null = started only.
create table public.activity_progress (
  activity_id uuid primary key,
  user_id uuid not null,
  completed_at timestamptz,
  spent_seconds integer not null default 0 check (spent_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (activity_id, user_id) references public.mission_activities (id, user_id) on delete cascade
);

create index activity_progress_user_id_idx on public.activity_progress (user_id);

create trigger activity_progress_set_updated_at
  before update on public.activity_progress
  for each row execute function public.set_updated_at();

-- A question id is only unique within a session (it lives in the session's jsonb).
create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null,
  question_id text not null check (char_length(question_id) > 0),
  selected_index smallint not null check (selected_index >= 0),
  -- Always overwritten by the grading trigger below; the client cannot set it.
  is_correct boolean not null default false,
  answered_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.mission_sessions (id, user_id) on delete cascade,
  unique (session_id, question_id)
);

create index quiz_answers_user_id_idx on public.quiz_answers (user_id);

-- Grades an answer against the question stored in the session, so correctness is
-- never taken from the client.
create function public.grade_quiz_answer() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  question jsonb;
begin
  select q into question
  from public.mission_sessions s, jsonb_array_elements(s.questions) as q
  where s.id = new.session_id and q ->> 'id' = new.question_id;

  if question is null then
    raise exception 'unknown question "%" for session %', new.question_id, new.session_id
      using errcode = '23503';
  end if;
  if new.selected_index >= jsonb_array_length(question -> 'options') then
    raise exception 'selected_index % is out of range for question "%"', new.selected_index, new.question_id
      using errcode = '23514';
  end if;

  new.is_correct := (question ->> 'answerIndex')::int = new.selected_index;
  return new;
end;
$$;

create trigger quiz_answers_grade
  before insert or update of question_id, selected_index on public.quiz_answers
  for each row execute function public.grade_quiz_answer();

revoke execute on function public.grade_quiz_answer() from public, anon, authenticated;

-- Per-mission progress summary. security_invoker keeps RLS in force for the caller.
-- A day counts as studied when at least one activity was completed.
create view public.mission_stats with (security_invoker = true) as
select
  m.id as mission_id,
  m.user_id,
  m.mission_date,
  m.budget_minutes,
  m.status,
  m.started_at,
  m.completed_at,
  coalesce(sum(p.spent_seconds), 0)::integer as spent_seconds,
  count(p.completed_at)::integer as completed_activities
from public.missions m
left join public.mission_sessions s on s.mission_id = m.id
left join public.mission_activities a on a.session_id = s.id
left join public.activity_progress p on p.activity_id = a.id
group by m.id;
