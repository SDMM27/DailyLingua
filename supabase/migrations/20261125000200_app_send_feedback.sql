-- Schema `app`: app.send_feedback(), the way the new app sends a feedback to public.feedback (the table of the
-- old app, unchanged: same categories, same limits, same rate limit of 20 per 24 hours enforced by the
-- trigger public.limit_feedback_rate, whose refusal has the SQLSTATE 'DL429').
--
-- It acts on auth.uid(), never on an identifier received as an argument. A guest may send feedback as long as
-- public.profiles has their row (public.feedback.user_id references it).
-- Errors: 28000 no signed-in user; P0002 no public.profiles row; 22023 invalid category, message, page or
-- app version; DL429 more than 20 feedback in 24 hours.

create function app.send_feedback(
  p_category text,
  p_message text,
  p_page text default null,
  p_app_version text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_message text := btrim(p_message);
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_category is null or p_category not in ('bug', 'idee', 'contenu', 'autre') then
    raise exception 'invalid feedback category' using errcode = '22023';
  end if;
  if v_message is null or char_length(v_message) not between 3 and 2000 then
    raise exception 'the message must have 3 to 2000 characters' using errcode = '22023';
  end if;
  if char_length(p_page) > 200 or char_length(p_app_version) > 40 then
    raise exception 'page (200) or app version (40) too long' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.id = uid) then
    raise exception 'no profile for the user' using errcode = 'P0002';
  end if;

  insert into public.feedback (user_id, category, message, page, app_version)
  values (uid, p_category, v_message, p_page, p_app_version);
end;
$$;

revoke execute on function app.send_feedback(text, text, text, text) from public, anon;
grant execute on function app.send_feedback(text, text, text, text) to authenticated;
