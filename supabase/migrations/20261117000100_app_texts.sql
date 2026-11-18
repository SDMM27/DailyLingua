-- Schema `app`, milestone 2, block S1: shared graded texts (text, text_item, text_item_key) and the
-- per-user reading log (text_read). Nothing in `public` is modified.
-- Spec: docs/refonte/specs/j2-architecture.md section 3.1, docs/refonte/specs/j2-pr1-lots.md (lot S1).
--
-- Privileges:
--  * text and text_item: readable by `authenticated` only when the text is published;
--  * text_item_key (the answer keys): RLS on, no policy and no grant for any client role. The keys
--    reach the client only inside the session package built by the server (service_role);
--  * text_read: readable by its owner;
--  * every write goes through service_role (granted at the end of the migration).

create table app.text (
  id uuid primary key default gen_random_uuid(),
  language text not null references app.language (code),
  -- C2 is served by C1 at milestone 2.
  level_band text not null check (level_band in ('A2', 'B1', 'B2', 'C1')),
  -- Step of the level, 1 to 3.
  density smallint not null check (density between 1 and 3),
  theme text not null check (char_length(theme) between 1 and 80),
  prompt_version text not null check (char_length(prompt_version) between 1 and 60),
  variant smallint not null default 1 check (variant >= 1),
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) <= 8000),
  word_count integer not null check (word_count > 0),
  new_words jsonb not null default '[]' check (jsonb_typeof(new_words) = 'array'),
  grammar_point text check (char_length(grammar_point) <= 200),
  status text not null default 'generated' check (status in ('generated', 'checked', 'published', 'retired')),
  -- Results of the automatic checks.
  checks jsonb not null default '{}' check (jsonb_typeof(checks) = 'object'),
  model text check (char_length(model) <= 100),
  created_at timestamptz not null default now(),
  unique (language, level_band, density, theme, prompt_version, variant)
);

create index text_pick_idx on app.text (language, level_band, status);

alter table app.text enable row level security;
grant select on app.text to authenticated;
create policy "text: published texts are readable by signed-in users" on app.text
  for select to authenticated using (status = 'published');

create table app.text_item (
  id uuid primary key default gen_random_uuid(),
  text_id uuid not null references app.text (id) on delete cascade,
  step text not null check (step in ('reading', 'workshop')),
  kind text not null check (kind in ('mcq', 'short_answer', 'cloze', 'transform')),
  position smallint not null check (position >= 0),
  -- Statement and options, never the answer.
  prompt jsonb not null check (jsonb_typeof(prompt) = 'object' and octet_length(prompt::text) <= 8000),
  listening_only boolean not null default false,
  unique (text_id, step, position)
);

alter table app.text_item enable row level security;
grant select on app.text_item to authenticated;
-- The text is read through its own policy: only a published text exposes its items.
create policy "text_item: items of a published text are readable by signed-in users" on app.text_item
  for select to authenticated
  using (exists (select 1 from app.text t where t.id = text_id and t.status = 'published'));

create table app.text_item_key (
  item_id uuid primary key references app.text_item (id) on delete cascade,
  answer jsonb not null check (octet_length(answer::text) <= 4000),
  -- Accepted variants.
  accept jsonb not null default '[]' check (jsonb_typeof(accept) = 'array' and octet_length(accept::text) <= 8000)
);

-- No policy and no grant for a client role: only service_role reads the keys.
alter table app.text_item_key enable row level security;

create table app.text_read (
  user_id uuid not null references auth.users (id) on delete cascade,
  text_id uuid not null references app.text (id),
  first_read_day date not null,
  primary key (user_id, text_id)
);

alter table app.text_read enable row level security;
grant select on app.text_read to authenticated;
create policy "text_read: owner can read" on app.text_read
  for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on all tables in schema app to service_role;
grant usage, select on all sequences in schema app to service_role;
