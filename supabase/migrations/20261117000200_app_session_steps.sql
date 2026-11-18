-- Schema `app`, milestone 2, block S2: the session of the day (format, kind, served instant), its steps
-- (session_step), the `session` card source, the client event id of productions and rewrites, and the
-- items of the error of the day (error_item). Nothing in `public` is modified.
-- Spec: docs/refonte/specs/j2-architecture.md section 3.2, docs/refonte/specs/j2-pr1-lots.md (lot S2).

-- Session ------------------------------------------------------------------------------------------------

alter table app.session
  add column format smallint not null default 15 check (format in (10, 15, 20, 30)),
  add column kind text not null default 'daily' check (kind in ('daily', 'catch_up', 'review_only')),
  -- Instant at which the session package was served: events dated before it are refused (before_served).
  add column served_at timestamptz;

-- The catch-up session of a repair is a second session of the same day.
alter table app.session
  drop constraint session_user_id_language_day_key,
  add constraint session_user_id_language_day_kind_key unique (user_id, language, day, kind);

-- Steps (derived: rewritten by the ingestion from the proofs) ----------------------------------------------

create table app.session_step (
  session_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null,
  step text not null check (step in ('wake', 'reading', 'workshop', 'expression', 'momentum', 'review')),
  validated_at timestamptz,
  proof jsonb not null default '{}' check (jsonb_typeof(proof) = 'object' and octet_length(proof::text) <= 20000),
  primary key (session_id, step),
  -- The composite key keeps a step on a session of the same user and language.
  foreign key (session_id, user_id, language) references app.session (id, user_id, language) on delete cascade
);

create index session_step_user_idx on app.session_step (user_id);

alter table app.session_step enable row level security;
grant select on app.session_step to authenticated;
create policy "session_step: owner can read" on app.session_step
  for select to authenticated using (user_id = (select auth.uid()));

-- Cards created during a session ------------------------------------------------------------------------------

alter table app.card
  drop constraint card_source_check,
  add constraint card_source_check
    check (source in ('mission', 'manual', 'import', 'reader', 'unit', 'feedback', 'legacy', 'session'));

-- Client event id (idempotence of the ingestion) -------------------------------------------------------------

alter table app.production add column client_event_id uuid;
alter table app.rewrite add column client_event_id uuid;

create unique index production_client_event_idx on app.production (user_id, client_event_id)
  where client_event_id is not null;
create unique index rewrite_client_event_idx on app.rewrite (user_id, client_event_id)
  where client_event_id is not null;

-- Error of the day ---------------------------------------------------------------------------------------------

create table app.error_item (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  correction_id uuid not null,
  -- The error of the correction this item was drawn from.
  error_ref text not null check (char_length(error_ref) between 1 and 100),
  prompt jsonb not null check (jsonb_typeof(prompt) = 'object' and octet_length(prompt::text) <= 8000),
  answer jsonb not null check (octet_length(answer::text) <= 4000),
  created_day date not null,
  reworked_day date,
  foreign key (correction_id, user_id) references app.correction (id, user_id) on delete cascade,
  unique (correction_id, error_ref)
);

create index error_item_user_idx on app.error_item (user_id, created_day);

alter table app.error_item enable row level security;
-- By column: the answer is never readable by a client.
grant select (id, user_id, correction_id, error_ref, prompt, created_day, reworked_day)
  on app.error_item to authenticated;
create policy "error_item: owner can read" on app.error_item
  for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on all tables in schema app to service_role;
grant usage, select on all sequences in schema app to service_role;
