-- Schema `app`: integrity hardening after the independent security review
-- (docs/reviews/refonte/j1-pr1-securite.md: M1 to M6, F4, F5).
-- The migrations 000100 to 000600 are frozen; everything is corrected here.

-- M3. service_role writes through CHECK constraints: it must be able to execute the function they use.
grant execute on function app.is_valid_weekdays(smallint[]) to service_role;

-- M2. Foreign keys between user tables also carry user_id (and language when both tables have it), so a
-- row can never point to the parent of another user.
-- M1. The journals keep their rows when a parent goes away: the keys towards card, session, attempt and
-- review_log are NO ACTION. Only the deletion of the account (which removes everything by user_id in one
-- statement) gets through. A card removed by the user becomes "deleted" (deleted_at) instead of vanishing.

alter table app.card_list add constraint card_list_id_user_language_key unique (id, user_id, language);
alter table app.card
  drop constraint card_list_id_fkey,
  add constraint card_list_fkey foreign key (list_id, user_id, language)
    references app.card_list (id, user_id, language) on delete set null (list_id);

alter table app.card add constraint card_id_user_key unique (id, user_id);
alter table app.review_log
  drop constraint review_log_card_id_fkey,
  add constraint review_log_card_fkey foreign key (card_id, user_id) references app.card (id, user_id),
  add constraint review_log_id_user_key unique (id, user_id);

alter table app.session add constraint session_id_user_language_key unique (id, user_id, language);
alter table app.attempt
  drop constraint attempt_session_id_fkey,
  add constraint attempt_session_fkey foreign key (session_id, user_id, language)
    references app.session (id, user_id, language),
  add constraint attempt_id_user_key unique (id, user_id);

alter table app.xp_ledger
  drop constraint xp_ledger_attempt_id_fkey,
  drop constraint xp_ledger_review_log_id_fkey,
  add constraint xp_ledger_attempt_fkey foreign key (attempt_id, user_id) references app.attempt (id, user_id),
  add constraint xp_ledger_review_log_fkey foreign key (review_log_id, user_id)
    references app.review_log (id, user_id);

alter table app.production
  add constraint production_id_user_key unique (id, user_id),
  add constraint production_session_fkey foreign key (session_id, user_id, language)
    references app.session (id, user_id, language) on delete set null (session_id);
alter table app.correction
  drop constraint correction_production_id_fkey,
  add constraint correction_id_user_key unique (id, user_id),
  add constraint correction_production_fkey foreign key (production_id, user_id)
    references app.production (id, user_id) on delete cascade;
alter table app.rewrite
  drop constraint rewrite_correction_id_fkey,
  add constraint rewrite_correction_fkey foreign key (correction_id, user_id)
    references app.correction (id, user_id) on delete cascade;

alter table app.card add column deleted_at timestamptz;
drop index app.card_due_idx;
create index card_due_idx on app.card (user_id, due_at)
  where state not in ('suspended', 'known') and deleted_at is null;

-- The guard: no UPDATE, and no DELETE unless the account itself is gone.
create or replace function app.forbid_journal_change() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from auth.users u where u.id = old.user_id) then
    return old;
  end if;
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$$;

-- M4. legacy_record holds raw copies of tables the user could not always read (feedback is write-only in
-- public): no client read until something needs it.
drop policy "legacy_record: owner can read" on app.legacy_record;
revoke select on app.legacy_record from authenticated;

-- M5. Integrity bounds of the game journals (the real ceilings come with the write functions).
alter table app.xp_ledger
  add constraint xp_ledger_amount_cap check (amount <= 100);
create unique index xp_ledger_attempt_reason_idx on app.xp_ledger (attempt_id, reason) where attempt_id is not null;
create unique index xp_ledger_review_reason_idx on app.xp_ledger (review_log_id, reason)
  where review_log_id is not null;
alter table app.attempt
  add constraint attempt_occurred_bounds check (
    occurred_at <= received_at + interval '5 minutes' and occurred_at >= received_at - interval '7 days'
  ),
  add constraint attempt_answer_size check (octet_length(answer::text) <= 20000),
  add constraint attempt_duration_cap check (duration_ms <= 3600000);
alter table app.streak_state
  add constraint streak_state_values check ("current" >= 0 and best >= "current");

-- F5. Size bounds (public had them).
alter table app.card
  add constraint card_front_size check (char_length(front) <= 500),
  add constraint card_back_size check (char_length(back) <= 1000),
  add constraint card_context_size check (char_length(context) <= 1000),
  add constraint card_note_size check (char_length(note) <= 1000);
alter table app.correction add constraint correction_feedback_size check (octet_length(feedback::text) <= 100000);
alter table app.rewrite add constraint rewrite_text_size check (char_length(text) <= 2000);
alter table app.assessment_result
  add constraint assessment_result_payload_size check (octet_length(payload::text) <= 300000);

-- M6. A guest who converts their account is no longer a guest in app.
create function app.sync_guest_flag() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update app.profile
  set is_guest = coalesce(new.is_anonymous, false)
  where user_id = new.id and is_guest is distinct from coalesce(new.is_anonymous, false);
  return new;
end;
$$;

create trigger app_on_auth_user_anonymity_changed
  after update of is_anonymous on auth.users
  for each row when (old.is_anonymous is distinct from new.is_anonymous)
  execute function app.sync_guest_flag();

revoke execute on function app.sync_guest_flag() from public, anon, authenticated;

-- F4. Re-activating an enrollment in the native language is refused too.
create or replace function app.enforce_enrollment_language() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_native text;
begin
  select p.native_language into v_native from app.profile p where p.user_id = new.user_id;
  if not found then
    raise exception 'no app.profile for user %', new.user_id using errcode = '23503';
  end if;
  if new.active and new.language = v_native then
    raise exception 'the language % is the native language of the user', new.language using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger enrollment_enforce_language on app.enrollment;
create trigger enrollment_enforce_language
  before insert or update of language, user_id, active on app.enrollment
  for each row execute function app.enforce_enrollment_language();

-- F1. `alter default privileges in schema app revoke execute ... from public` (migration 000100) has no
-- effect: a schema-level REVOKE cannot remove the global default. Every new function of app needs its own
-- explicit REVOKE; app_access.test.sql fails when one is missing.
