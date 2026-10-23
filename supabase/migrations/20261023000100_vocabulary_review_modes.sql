-- Phase J1/J2: vocabulary recall modes and retention measurement.
--
-- Each journal entry now records how the word was recalled (flip = self-graded card, the other
-- modes are typed answers graded by the app) and how many days passed since the previous review
-- of the word. Retention is read from the journal: the share of reviews made at least 7 days
-- after the previous one that were not "again", per mode (src/lib/domain/review-modes.ts).

alter table public.vocabulary_reviews
  add column mode text not null default 'flip'
    check (mode in ('flip', 'translate', 'produce', 'listen', 'cloze')),
  -- Null for the first review of a word and for entries written before this column existed.
  add column days_since_last smallint check (days_since_last >= 0);

drop function public.record_vocabulary_review(uuid, text, date, smallint, date, integer);

create function public.record_vocabulary_review(
  p_item_id uuid,
  p_grade text,
  p_reviewed_on date,
  p_box_after smallint,
  p_due_on_after date,
  p_expected_review_count integer,
  p_mode text
) returns boolean
language plpgsql
set search_path = ''
as $$
declare
  item public.vocabulary_items;
begin
  if p_mode is null or p_mode not in ('flip', 'translate', 'produce', 'listen', 'cloze') then
    raise exception 'unknown review mode' using errcode = '22023';
  end if;

  select * into item
  from public.vocabulary_items
  where id = p_item_id and review_count = p_expected_review_count
  for update;
  if not found then
    return false;
  end if;

  update public.vocabulary_items
  set box = p_box_after,
      due_on = p_due_on_after,
      last_reviewed_on = p_reviewed_on,
      review_count = review_count + 1
  where id = item.id;

  insert into public.vocabulary_reviews
    (user_id, item_id, reviewed_on, grade, box_before, box_after, due_on_after, mode, days_since_last)
  values
    (item.user_id, item.id, p_reviewed_on, p_grade, item.box, p_box_after, p_due_on_after, p_mode,
     case when item.last_reviewed_on is null then null
          else greatest(p_reviewed_on - item.last_reviewed_on, 0)::smallint end);

  return true;
end;
$$;

revoke execute on function public.record_vocabulary_review(uuid, text, date, smallint, date, integer, text)
  from public, anon;
grant execute on function public.record_vocabulary_review(uuid, text, date, smallint, date, integer, text)
  to authenticated;
