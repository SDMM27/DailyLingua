-- Schema `app`, milestone 2, block S3 (tables): the game journals and derived states of the loop.
-- xp_ledger additions, learning_day, setting_change, streak_state additions, timezone_change,
-- device_cursor, ingest_state (created at signup and backfilled), ui_event. Nothing in `public` is modified.
-- Spec: docs/refonte/specs/j2-architecture.md sections 3.3 and 3.4, docs/refonte/specs/j2-pr1-lots.md (lot S3).
--
-- Append-only (guard app.forbid_journal_change): setting_change, timezone_change, ui_event.
-- Derived, rewritten by the ingestion: learning_day, streak_state, device_cursor.

-- Learning day -----------------------------------------------------------------------------------------------
-- The day of an instant for a time zone: the day starts at 04:00 local time. Same rule as `learningDay()`
-- of packages/core/src/dates.ts.

create function app.learning_day_at(p_time_zone text, p_at timestamptz) returns date
language sql
stable
set search_path = ''
as $$
  select ((p_at at time zone p_time_zone) - interval '4 hours')::date;
$$;

revoke execute on function app.learning_day_at(text, timestamptz) from public, anon, authenticated;
grant execute on function app.learning_day_at(text, timestamptz) to service_role;

-- XP ledger -----------------------------------------------------------------------------------------------------

alter table app.xp_ledger
  add column rule_version text not null default 'j2.1' check (char_length(rule_version) between 1 and 20),
  -- Counts towards the leagues (milestone 7).
  add column league_eligible boolean not null default true;

-- A line without source (session.complete, production.corrected...) replayed with the very same content is
-- the same line: the ingestion ignores it instead of crediting it twice. The rules of the scale put a
-- distinguishing reference in `meta` when two such lines can legitimately look alike on the same day.
create unique index xp_ledger_sourceless_idx
  on app.xp_ledger (user_id, day, coalesce(language, ''), reason, md5(meta::text))
  where attempt_id is null and review_log_id is null;

-- Learning days (derived) --------------------------------------------------------------------------------------

create table app.learning_day (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  time_zone text not null,
  xp_verified integer not null default 0 check (xp_verified between 0 and 400),
  validated boolean not null default false,
  cause text not null default 'none'
    check (cause in ('work', 'session', 'freeze', 'rest', 'repair', 'travel', 'off', 'none')),
  first_activity_at timestamptz,
  primary key (user_id, day)
);

create trigger learning_day_validate_time_zone
  before insert or update of time_zone on app.learning_day
  for each row execute function app.validate_time_zone();

alter table app.learning_day enable row level security;
grant select on app.learning_day to authenticated;
create policy "learning_day: owner can read" on app.learning_day
  for select to authenticated using (user_id = (select auth.uid()));

-- Settings history (append-only) ---------------------------------------------------------------------------------
-- Without it the recomputation of the streak would not be replayable.

create table app.setting_change (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Dotted path in game_settings, e.g. `ring.tier`.
  key text not null check (key ~ '^[A-Za-z]{1,30}(\.[A-Za-z]{1,30})?$'),
  value jsonb not null check (octet_length(value::text) <= 200),
  effective_day date not null,
  changed_at timestamptz not null default now()
);

create index setting_change_user_idx on app.setting_change (user_id, effective_day);

create trigger setting_change_append_only
  before update or delete on app.setting_change
  for each row execute function app.forbid_journal_change();

alter table app.setting_change enable row level security;
grant select on app.setting_change to authenticated;
create policy "setting_change: owner can read" on app.setting_change
  for select to authenticated using (user_id = (select auth.uid()));

-- Streak state: additions (derived) ----------------------------------------------------------------------------------

alter table app.streak_state
  add column last_repair_day date,
  add column freezes_granted_through date,
  add column best_set_on date,
  add column time_zone_changed_at timestamptz;

-- Time zone journal (append-only) -----------------------------------------------------------------------------------

create table app.timezone_change (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  effective_at timestamptz not null,
  time_zone text not null,
  created_at timestamptz not null default now(),
  unique (user_id, effective_at)
);

create trigger timezone_change_validate_time_zone
  before insert or update of time_zone on app.timezone_change
  for each row execute function app.validate_time_zone();

create trigger timezone_change_append_only
  before update or delete on app.timezone_change
  for each row execute function app.forbid_journal_change();

alter table app.timezone_change enable row level security;
grant select on app.timezone_change to authenticated;
create policy "timezone_change: owner can read" on app.timezone_change
  for select to authenticated using (user_id = (select auth.uid()));

-- Device cursors ------------------------------------------------------------------------------------------------------
-- Last event sequence number and last attributed day per installation (monotone days, section 3.2 of the game spec).

create table app.device_cursor (
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid not null,
  last_seq bigint not null check (last_seq >= 0),
  last_day date,
  primary key (user_id, device_id)
);

alter table app.device_cursor enable row level security;
grant select on app.device_cursor to authenticated;
create policy "device_cursor: owner can read" on app.device_cursor
  for select to authenticated using (user_id = (select auth.uid()));

-- Ingestion sequence (optimistic concurrency of app.ingest_batch) --------------------------------------------------------
-- Internal: no client role reads it (RLS on, no policy, no grant).

create table app.ingest_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  seq bigint not null default 0 check (seq >= 0)
);

alter table app.ingest_state enable row level security;

-- Existing accounts get their row now; new accounts get it from the signup trigger below.
insert into app.ingest_state (user_id)
select p.user_id from app.profile p
on conflict (user_id) do nothing;

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
  insert into app.ingest_state (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Interface events (append-only) -------------------------------------------------------------------------------------------

create table app.ui_event (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (name ~ '^[a-z_]{1,48}$'),
  value jsonb not null default '{}' check (octet_length(value::text) <= 2048),
  occurred_at timestamptz not null,
  client_event_id uuid not null,
  received_at timestamptz not null default now(),
  unique (user_id, client_event_id)
);

create index ui_event_user_idx on app.ui_event (user_id, occurred_at);

create trigger ui_event_append_only
  before update or delete on app.ui_event
  for each row execute function app.forbid_journal_change();

alter table app.ui_event enable row level security;
grant select on app.ui_event to authenticated;
create policy "ui_event: owner can read" on app.ui_event
  for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on all tables in schema app to service_role;
grant usage, select on all sequences in schema app to service_role;
