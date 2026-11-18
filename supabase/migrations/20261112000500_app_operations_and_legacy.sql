-- Schema `app`, block 5: operations (AI call log, quotas) and the data-migration bookkeeping
-- (legacy_map, legacy_record).

-- AI calls: no client read at all (RLS on, no policy, no grant).
create table app.ai_call (
  id bigint generated always as identity primary key,
  purpose text not null,
  model text not null,
  prompt_version text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  batch boolean not null default false,
  cost_usd numeric(12, 6) not null default 0,
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'ok' check (status in ('ok', 'error', 'refused')),
  created_at timestamptz not null default now()
);

create index ai_call_created_idx on app.ai_call (created_at);
create index ai_call_user_created_idx on app.ai_call (user_id, created_at);

alter table app.ai_call enable row level security;

create table app.quota_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null,
  used integer not null default 0 check (used >= 0),
  primary key (user_id, day, kind)
);

alter table app.quota_usage enable row level security;
grant select on app.quota_usage to authenticated;
create policy "quota_usage: owner can read" on app.quota_usage
  for select to authenticated using (user_id = (select auth.uid()));

-- Data migration -------------------------------------------------------------------------------

-- Source row (table, id) -> row created in app. No client read.
create table app.legacy_map (
  legacy_table text not null,
  legacy_id text not null,
  app_table text not null,
  app_id text not null,
  migrated_at timestamptz not null default now(),
  primary key (legacy_table, legacy_id, app_table)
);

create index legacy_map_app_idx on app.legacy_map (app_table, app_id);

alter table app.legacy_map enable row level security;

-- Lossless archive of what has no equivalent in app yet.
create table app.legacy_record (
  user_id uuid not null references auth.users (id) on delete cascade,
  legacy_table text not null,
  legacy_id text not null,
  payload jsonb not null,
  archived_at timestamptz not null default now(),
  primary key (legacy_table, legacy_id)
);

create index legacy_record_user_idx on app.legacy_record (user_id);

alter table app.legacy_record enable row level security;
grant select on app.legacy_record to authenticated;
create policy "legacy_record: owner can read" on app.legacy_record
  for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on all tables in schema app to service_role;
grant usage, select on all sequences in schema app to service_role;
