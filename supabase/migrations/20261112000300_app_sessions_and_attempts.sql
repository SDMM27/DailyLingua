-- Schema `app`, block 3: study session, attempts (append-only) and study days (streak input).

create table app.session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null references app.language (code),
  -- Local day of the user.
  day date not null,
  plan jsonb not null default '{}' check (jsonb_typeof(plan) = 'object'),
  status text not null default 'planned' check (status in ('planned', 'started', 'completed', 'abandoned')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, language, day)
);

alter table app.session enable row level security;
grant select on app.session to authenticated;
create policy "session: owner can read" on app.session
  for select to authenticated using (user_id = (select auth.uid()));

create table app.attempt (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references app.session (id) on delete cascade,
  language text not null references app.language (code),
  step text not null,
  exercise_kind text not null,
  exercise_ref text,
  answer jsonb not null,
  result jsonb,
  correct boolean,
  duration_ms integer check (duration_ms >= 0),
  client_event_id uuid not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique (user_id, client_event_id)
);

create index attempt_session_idx on app.attempt (session_id) where session_id is not null;
create index attempt_user_occurred_idx on app.attempt (user_id, occurred_at);

create trigger attempt_append_only
  before update or delete on app.attempt
  for each row execute function app.forbid_journal_change();

alter table app.attempt enable row level security;
grant select on app.attempt to authenticated;
create policy "attempt: owner can read" on app.attempt
  for select to authenticated using (user_id = (select auth.uid()));

-- A day counts for the streak when the user studied (origin tells where the day comes from).
create table app.study_day (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  origin text not null check (origin in ('legacy', 'session', 'review')),
  primary key (user_id, day)
);

alter table app.study_day enable row level security;
grant select on app.study_day to authenticated;
create policy "study_day: owner can read" on app.study_day
  for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on all tables in schema app to service_role;
grant usage, select on all sequences in schema app to service_role;
