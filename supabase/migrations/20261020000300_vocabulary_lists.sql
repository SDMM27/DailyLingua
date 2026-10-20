-- Personal vocabulary lists (a book, a course) and the daily quota of automatic translations.
--
-- A list belongs to one user and one language. vocabulary_items.list_id is optional (words added
-- from the missions have no list) and tied to the list by a composite foreign key, so a word can
-- only sit in a list of the same user and the same language. Deleting a list deletes its words
-- (the app asks for confirmation and states how many); "on delete set null" is not an option on a
-- composite key, it would null user_id as well. A paused list (active = false) keeps its words
-- visible but out of the daily review: the app filters on it.

create table public.vocabulary_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  language text not null references public.languages (code),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (char_length(description) <= 300),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id, language)
);

create trigger vocabulary_lists_set_updated_at
  before update on public.vocabulary_lists
  for each row execute function public.set_updated_at();

alter table public.vocabulary_lists enable row level security;

grant select, insert, update, delete on public.vocabulary_lists to authenticated;
create policy "vocabulary_lists: owner full access" on public.vocabulary_lists
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.vocabulary_items add column list_id uuid;
alter table public.vocabulary_items
  add constraint vocabulary_items_list_fkey
  foreign key (list_id, user_id, language)
  references public.vocabulary_lists (id, user_id, language) on delete cascade;

create index vocabulary_items_list_id_idx on public.vocabulary_items (list_id)
  where list_id is not null;

-- Automatic translation of words (language model, paid per call): terms translated per user and
-- calendar day (the user's day, passed by the app). Written by the server with the service role
-- only, through claim_vocabulary_translation; users cannot read or reset it.
create table public.vocabulary_translation_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  terms integer not null check (terms >= 0),
  primary key (user_id, day)
);

alter table public.vocabulary_translation_usage enable row level security;

revoke all on public.vocabulary_translation_usage from anon, authenticated;
grant select, insert, update, delete on public.vocabulary_translation_usage to service_role;

-- Reserves `p_terms` translations for the day and returns true, or returns false (nothing counted)
-- when they would take the user past `p_limit`. Atomic: concurrent requests cannot both pass the
-- limit. Also drops the user's rows older than a week, so the table stays tiny.
create function public.claim_vocabulary_translation(
  p_user_id uuid,
  p_day date,
  p_terms integer,
  p_limit integer
) returns boolean
language plpgsql
set search_path = ''
as $$
declare
  written integer;
begin
  if p_terms <= 0 or p_terms > p_limit then
    return false;
  end if;

  delete from public.vocabulary_translation_usage
  where user_id = p_user_id and day < p_day - 7;

  insert into public.vocabulary_translation_usage as u (user_id, day, terms)
  values (p_user_id, p_day, p_terms)
  on conflict (user_id, day) do update set terms = u.terms + p_terms
    where u.terms + p_terms <= p_limit;
  get diagnostics written = row_count;
  return written > 0;
end;
$$;

revoke execute on function public.claim_vocabulary_translation(uuid, date, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_vocabulary_translation(uuid, date, integer, integer) to service_role;
