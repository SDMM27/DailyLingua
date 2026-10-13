-- What the user writes for the production task of a mission session (written production).
-- One draft per session, saved as they type. Same ownership model as quiz_answers: user_id is
-- tied to the session by a composite foreign key, so a row cannot belong to another user than
-- its session, and deleting the account (or the session) deletes the text.

create table public.production_entries (
  session_id uuid primary key,
  user_id uuid not null,
  body text not null check (char_length(body) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.mission_sessions (id, user_id) on delete cascade
);

create index production_entries_user_id_idx on public.production_entries (user_id);

create trigger production_entries_set_updated_at
  before update on public.production_entries
  for each row execute function public.set_updated_at();

alter table public.production_entries enable row level security;

grant select, insert, update, delete on public.production_entries to authenticated;
create policy "production_entries: owner full access" on public.production_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
