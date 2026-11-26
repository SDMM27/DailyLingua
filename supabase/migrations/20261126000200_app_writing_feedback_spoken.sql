-- Schema `app`, milestone 5 PR 2: a spoken production (the transcript of a dictation, `app.production.mode = 'spoken'`)
-- is corrected like a written one (docs/refonte/specs/j5-pr2-production-orale.md section 2). The claim of a paid
-- correction only found `mode = 'writing'` productions, so a spoken one answered `not_found` and was never corrected.
--  * create or replace of app.claim_writing_feedback_job: same signature, same language and search_path, same
--    revocations and grant; the body is the one of 20261119000300 with one condition changed,
--    `p.mode in ('writing', 'spoken')`. The owner check, the session join and the idempotency are unchanged.

create or replace function app.claim_writing_feedback_job(p_user_id uuid, p_production_id uuid) returns text
language plpgsql
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_hash bytea;
  v_job app.writing_feedback_job;
begin
  select p.session_id, sha256(convert_to(btrim(regexp_replace(p.text, '[[:space:]]+', ' ', 'g')), 'UTF8'))
  into v_session_id, v_hash
  from app.production p join app.session s on s.id = p.session_id and s.user_id = p_user_id
  where p.id = p_production_id and p.user_id = p_user_id
    and p.mode in ('writing', 'spoken') and p.client_event_id is not null;
  if not found then return 'not_found'; end if;

  if exists (select 1 from app.correction c where c.production_id = p_production_id and c.user_id = p_user_id) then
    return 'ready';
  end if;

  insert into app.writing_feedback_job (production_id, user_id, session_id, text_hash)
  values (p_production_id, p_user_id, v_session_id, v_hash)
  on conflict do nothing;
  if found then return 'claimed'; end if;

  select * into v_job from app.writing_feedback_job j
  where j.user_id = p_user_id and j.session_id = v_session_id and j.text_hash = v_hash;
  -- A racing quota release can remove the conflicting row. Try again on the next request.
  if not found then return 'pending'; end if;
  if v_job.production_id <> p_production_id then return 'failed'; end if;
  if exists (select 1 from app.correction c where c.production_id = p_production_id and c.user_id = p_user_id) then
    return 'ready';
  end if;
  if v_job.failed or v_job.started_at <= now() - interval '2 minutes' then return 'failed'; end if;
  return 'pending';
end;
$$;

revoke execute on function app.claim_writing_feedback_job(uuid, uuid) from public, anon, authenticated;
grant execute on function app.claim_writing_feedback_job(uuid, uuid) to service_role;
