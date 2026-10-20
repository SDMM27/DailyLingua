-- Corrections of the written feedback kept as review cards ("Mes erreurs à revoir").
--
-- A card is a copy of one correction of writing_feedback.feedback (the jsonb stays the source of
-- the review; the copy lets the card live on its own and be scheduled). It is added by the app,
-- as the owner: on demand, or automatically when the error category came up recently in the same
-- language. Review state works like vocabulary_items (Leitner box, due day), without a journal.
--
-- Same ownership model as production_entries: user_id is tied to the session by a composite
-- foreign key, so a card cannot belong to another user than its session, and deleting the account
-- (or the session) deletes it. Calendar days have no default: the app passes the user's day.

create table public.correction_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  -- Position of the correction in the review (at most 8 corrections).
  correction_index smallint not null check (correction_index between 0 and 7),
  language text not null references public.languages (code),
  original text not null check (char_length(btrim(original)) between 1 and 400),
  corrected text not null check (char_length(btrim(corrected)) between 1 and 400),
  explanation text not null check (char_length(btrim(explanation)) between 1 and 300),
  category text check (
    category in ('verb', 'agreement', 'function_word', 'word_order', 'word_choice', 'spelling', 'register', 'other')
  ),
  status text not null default 'learning' check (status in ('learning', 'known')),
  -- Leitner state. Dates are calendar days in the user's time zone (DateKey).
  box smallint not null default 0 check (box >= 0),
  due_on date not null,
  last_reviewed_on date,
  review_count integer not null default 0 check (review_count >= 0),
  added_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.mission_sessions (id, user_id) on delete cascade,
  unique (session_id, correction_index),
  unique (id, user_id)
);

create index correction_cards_due_idx on public.correction_cards (user_id, status, due_on);

create trigger correction_cards_set_updated_at
  before update on public.correction_cards
  for each row execute function public.set_updated_at();

alter table public.correction_cards enable row level security;

grant select, insert, update, delete on public.correction_cards to authenticated;
create policy "correction_cards: owner full access" on public.correction_cards
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Returns false when the card was not updated: it no longer exists, or it was reviewed since the
-- app read it (p_expected_review_count differs), e.g. a double tap or a second device.
-- SECURITY INVOKER: runs as the signed-in user, so RLS applies.
create function public.record_correction_review(
  p_card_id uuid,
  p_reviewed_on date,
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
  select id into card_id
  from public.correction_cards
  where id = p_card_id and review_count = p_expected_review_count
  for update;
  if not found then
    return false;
  end if;

  update public.correction_cards
  set box = p_box_after,
      due_on = p_due_on_after,
      last_reviewed_on = p_reviewed_on,
      review_count = review_count + 1
  where id = card_id;

  return true;
end;
$$;

revoke execute on function public.record_correction_review(uuid, date, smallint, date, integer)
  from public, anon;
grant execute on function public.record_correction_review(uuid, date, smallint, date, integer)
  to authenticated;
