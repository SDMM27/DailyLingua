-- Schema `app`, block 2: memory (card lists, cards, review journal) and the append-only guard
-- shared by every journal of the schema (review_log here, attempt and xp_ledger in blocks 3 and 4).

create table app.card_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null references app.language (code),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 300),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, language, name)
);

alter table app.card_list enable row level security;
grant select on app.card_list to authenticated;
create policy "card_list: owner can read" on app.card_list
  for select to authenticated using (user_id = (select auth.uid()));

create table app.card (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null references app.language (code),
  kind text not null check (kind in ('word', 'chunk', 'grammar', 'script', 'correction')),
  -- Stable identifier of curated content (grammar point, letter group).
  ref text,
  front text not null,
  back text,
  back_language text,
  context text,
  note text,
  list_id uuid references app.card_list (id) on delete cascade,
  state text not null check (state in ('new', 'learning', 'review', 'relearning', 'suspended', 'known')),
  stability real check (stability > 0),
  difficulty real check (difficulty between 1 and 10),
  due_at timestamptz not null,
  last_review_at timestamptz,
  reps integer not null default 0,
  lapses integer not null default 0,
  -- Leitner box of origin, kept for audit.
  legacy_box smallint,
  source text not null default 'manual'
    check (source in ('mission', 'manual', 'import', 'reader', 'unit', 'feedback', 'legacy')),
  payload jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index card_due_idx on app.card (user_id, due_at) where state not in ('suspended', 'known');
create unique index card_ref_idx on app.card (user_id, language, kind, ref) where ref is not null;
create index card_list_id_idx on app.card (list_id) where list_id is not null;

create trigger card_set_updated_at
  before update on app.card
  for each row execute function app.set_updated_at();

alter table app.card enable row level security;
grant select on app.card to authenticated;
create policy "card: owner can read" on app.card
  for select to authenticated using (user_id = (select auth.uid()));

-- Review journal (append-only) -----------------------------------------------------------------

create table app.review_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references app.card (id) on delete cascade,
  -- 1 again, 2 hard, 3 good, 4 easy
  rating smallint not null check (rating between 1 and 4),
  mode text,
  reviewed_at timestamptz not null,
  elapsed_days real,
  scheduled_days real,
  origin text not null check (origin in ('fsrs', 'leitner')),
  client_event_id uuid,
  created_at timestamptz not null default now()
);

create unique index review_log_client_event_idx
  on app.review_log (user_id, client_event_id) where client_event_id is not null;
create index review_log_user_reviewed_idx on app.review_log (user_id, reviewed_at);
create index review_log_card_idx on app.review_log (card_id);

alter table app.review_log enable row level security;
grant select on app.review_log to authenticated;
create policy "review_log: owner can read" on app.review_log
  for select to authenticated using (user_id = (select auth.uid()));

-- Append-only guard ----------------------------------------------------------------------------
-- An UPDATE always fails. A DELETE fails unless the row goes away together with its owner or its
-- parent: in a cascade the parent row is already gone when the trigger of the child runs, so
-- "the parent no longer exists" tells a cascade from a direct DELETE, whatever the role. TRUNCATE
-- is not granted to any API role.
-- SECURITY DEFINER: service_role cannot read auth.users itself.

create function app.forbid_journal_change() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_gone boolean := false;
begin
  if tg_op = 'UPDATE' then
    raise exception '% is append-only', tg_table_name using errcode = '42501';
  end if;

  if not exists (select 1 from auth.users u where u.id = old.user_id) then
    return old;
  end if;

  if tg_table_name = 'review_log' then
    v_parent_gone := not exists (select 1 from app.card c where c.id = old.card_id);
  elsif tg_table_name = 'attempt' then
    v_parent_gone := old.session_id is not null
      and not exists (select 1 from app.session s where s.id = old.session_id);
  elsif tg_table_name = 'xp_ledger' then
    v_parent_gone := (old.attempt_id is not null
        and not exists (select 1 from app.attempt a where a.id = old.attempt_id))
      or (old.review_log_id is not null
        and not exists (select 1 from app.review_log r where r.id = old.review_log_id));
  end if;

  if v_parent_gone then
    return old;
  end if;
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$$;

create trigger review_log_append_only
  before update or delete on app.review_log
  for each row execute function app.forbid_journal_change();

revoke execute on function app.forbid_journal_change() from public, anon, authenticated;

grant select, insert, update, delete on all tables in schema app to service_role;
grant usage, select on all sequences in schema app to service_role;
