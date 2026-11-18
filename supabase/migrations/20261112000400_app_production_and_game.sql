-- Schema `app`, block 4: written/spoken production and its corrections, assessment results, and the
-- game foundations (XP ledger, streak state).

create table app.production (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null references app.language (code),
  session_id uuid,
  mode text not null check (mode in ('writing', 'spoken', 'speaking')),
  task jsonb not null default '{}' check (jsonb_typeof(task) = 'object'),
  text text not null check (char_length(text) <= 10000),
  created_at timestamptz not null default now()
);

create index production_user_idx on app.production (user_id, created_at);

alter table app.production enable row level security;
grant select on app.production to authenticated;
create policy "production: owner can read" on app.production
  for select to authenticated using (user_id = (select auth.uid()));

create table app.correction (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references app.production (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  feedback jsonb not null,
  explanation_language text not null,
  model text,
  prompt_version text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  unique (production_id)
);

create index correction_user_idx on app.correction (user_id);

alter table app.correction enable row level security;
grant select on app.correction to authenticated;
create policy "correction: owner can read" on app.correction
  for select to authenticated using (user_id = (select auth.uid()));

create table app.rewrite (
  id uuid primary key default gen_random_uuid(),
  correction_id uuid not null references app.correction (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  sentence_index smallint not null,
  text text not null,
  accepted boolean,
  created_at timestamptz not null default now()
);

create index rewrite_correction_idx on app.rewrite (correction_id);
create index rewrite_user_idx on app.rewrite (user_id);

alter table app.rewrite enable row level security;
grant select on app.rewrite to authenticated;
create policy "rewrite: owner can read" on app.rewrite
  for select to authenticated using (user_id = (select auth.uid()));

create table app.assessment_result (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null references app.language (code),
  kind text not null check (kind in ('placement', 'assessment')),
  taken_at timestamptz not null,
  levels jsonb not null default '{}' check (jsonb_typeof(levels) = 'object'),
  -- The whole source row.
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index assessment_result_user_idx on app.assessment_result (user_id, language, taken_at);

alter table app.assessment_result enable row level security;
grant select on app.assessment_result to authenticated;
create policy "assessment_result: owner can read" on app.assessment_result
  for select to authenticated using (user_id = (select auth.uid()));

-- Game foundations -----------------------------------------------------------------------------

create table app.xp_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  language text,
  day date not null,
  amount smallint not null check (amount > 0),
  reason text not null,
  attempt_id bigint references app.attempt (id) on delete cascade,
  review_log_id bigint references app.review_log (id) on delete cascade,
  meta jsonb not null default '{}' check (jsonb_typeof(meta) = 'object'),
  created_at timestamptz not null default now()
);

create index xp_ledger_user_day_idx on app.xp_ledger (user_id, day);
create index xp_ledger_attempt_idx on app.xp_ledger (attempt_id) where attempt_id is not null;
create index xp_ledger_review_log_idx on app.xp_ledger (review_log_id) where review_log_id is not null;

create trigger xp_ledger_append_only
  before update or delete on app.xp_ledger
  for each row execute function app.forbid_journal_change();

alter table app.xp_ledger enable row level security;
grant select on app.xp_ledger to authenticated;
create policy "xp_ledger: owner can read" on app.xp_ledger
  for select to authenticated using (user_id = (select auth.uid()));

create table app.streak_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current integer not null default 0,
  best integer not null default 0,
  last_day date,
  freezes smallint not null default 0 check (freezes between 0 and 3),
  mode text not null default 'daily' check (mode in ('daily', 'weekly')),
  updated_at timestamptz not null default now()
);

create trigger streak_state_set_updated_at
  before update on app.streak_state
  for each row execute function app.set_updated_at();

alter table app.streak_state enable row level security;
grant select on app.streak_state to authenticated;
create policy "streak_state: owner can read" on app.streak_state
  for select to authenticated using (user_id = (select auth.uid()));

-- The signup trigger of block 1 now also creates the streak state.
create or replace function app.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into app.profile (user_id, is_guest)
  values (new.id, coalesce(new.is_anonymous, false))
  on conflict (user_id) do nothing;
  insert into app.streak_state (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

grant select, insert, update, delete on all tables in schema app to service_role;
grant usage, select on all sequences in schema app to service_role;
