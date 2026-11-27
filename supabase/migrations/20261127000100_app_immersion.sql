-- Schema `app`, milestone 6.3: the immersion journal. Time the learner spent in the language outside the app,
-- declared by hand. No XP is credited from it (the ledger is append-only, an editable entry cannot feed it).
-- Spec: docs/refonte/specs/j6-pr-immersion.md.
--
-- Written by the server only (service role, filtered on the session's user); the owner reads.
-- The day window (not in the future, at most 30 days back) and the 50 entries per day are checked by the server.

create table app.immersion_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null references app.language (code),
  day date not null,
  minutes smallint not null check (minutes between 1 and 600),
  kind text not null check (kind in ('video', 'audio', 'reading', 'conversation', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index immersion_entry_user_day_idx on app.immersion_entry (user_id, day desc);

alter table app.immersion_entry enable row level security;
grant select on app.immersion_entry to authenticated;
create policy "immersion_entry: owner can read" on app.immersion_entry
  for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on app.immersion_entry to service_role;
