-- Grammar points practised successfully, kept as review cards.
--
-- The lessons themselves are curated content versioned in the repository
-- (src/lib/grammar/courses); a card only remembers that a learner passed a point (point_id) and
-- schedules its review. Review state works like correction_cards (Leitner box, due day), without
-- a journal. The app creates a card when a run through the exercises reaches 60 %, then updates
-- it when it is reviewed, through record_grammar_practice.
--
-- Same ownership model as vocabulary_items: user_id references profiles, so deleting the account
-- deletes the cards. Calendar days have no default: the app passes the user's day.

create table public.grammar_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Stable id of the point, "<lang>-<level>-<slug>" (e.g. ru-a2-genitive). Not a foreign key: the
  -- points live in the code, and an id is never renamed.
  point_id text not null check (point_id ~ '^[a-z]{2,3}-(a1|a2|b1|b2|c1|c2)-[a-z0-9]+(-[a-z0-9]+)*$'),
  language text not null references public.languages (code),
  status text not null default 'learning' check (status in ('learning', 'known')),
  -- Leitner state. Dates are calendar days in the user's time zone (DateKey).
  box smallint not null default 0 check (box >= 0),
  due_on date not null,
  last_reviewed_on date,
  review_count integer not null default 0 check (review_count >= 0),
  added_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, point_id),
  -- The language is the prefix of the point id.
  check (starts_with(point_id, language || '-'))
);

create index grammar_cards_due_idx on public.grammar_cards (user_id, status, due_on);

create trigger grammar_cards_set_updated_at
  before update on public.grammar_cards
  for each row execute function public.set_updated_at();

alter table public.grammar_cards enable row level security;

grant select, insert, update, delete on public.grammar_cards to authenticated;
create policy "grammar_cards: owner full access" on public.grammar_cards
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Records one run through a point. With p_expected_review_count null the learner had no card: the
-- card is created (first practice, counted as one review). Otherwise the card is moved on, only if
-- it still has the review count the app read. Returns false when nothing changed: the card
-- appeared or was reviewed in the meantime (double tap, second device), or no longer exists.
-- SECURITY INVOKER: runs as the signed-in user, so RLS applies.
create function public.record_grammar_practice(
  p_point_id text,
  p_language text,
  p_practised_on date,
  p_box_after smallint,
  p_due_on_after date,
  p_expected_review_count integer
) returns boolean
language plpgsql
set search_path = ''
as $$
declare
  card_id uuid;
begin
  if p_expected_review_count is null then
    insert into public.grammar_cards
      (user_id, point_id, language, box, due_on, last_reviewed_on, review_count, added_on)
    values
      (auth.uid(), p_point_id, p_language, p_box_after, p_due_on_after, p_practised_on, 1, p_practised_on)
    on conflict (user_id, point_id) do nothing
    returning id into card_id;
    return card_id is not null;
  end if;

  select id into card_id
  from public.grammar_cards
  where point_id = p_point_id
    and user_id = auth.uid()
    and review_count = p_expected_review_count
  for update;
  if not found then
    return false;
  end if;

  update public.grammar_cards
  set box = p_box_after,
      due_on = p_due_on_after,
      last_reviewed_on = p_practised_on,
      review_count = review_count + 1
  where id = card_id;

  return true;
end;
$$;

revoke execute on function public.record_grammar_practice(text, text, date, smallint, date, integer)
  from public, anon;
grant execute on function public.record_grammar_practice(text, text, date, smallint, date, integer)
  to authenticated;
