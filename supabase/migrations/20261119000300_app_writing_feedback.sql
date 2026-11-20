-- Durable, service-only idempotency for a paid correction. An uncertain provider outcome is
-- terminal: retrying after a lost response could charge twice. Quota refusals release the claim
-- because they occur before the provider is contacted.
create table app.writing_feedback_job (
  production_id uuid primary key references app.production (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references app.session (id) on delete cascade,
  text_hash bytea not null,
  started_at timestamptz not null default now(),
  failed boolean not null default false,
  unique (user_id, session_id, text_hash)
);

alter table app.writing_feedback_job enable row level security;
revoke all on app.writing_feedback_job from public, anon, authenticated;
grant select, insert, update, delete on app.writing_feedback_job to service_role;

create function app.claim_writing_feedback_job(p_user_id uuid, p_production_id uuid) returns text
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
    and p.mode = 'writing' and p.client_event_id is not null;
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

-- The memo is intentionally bounded. Preserve the proof of a settled correction across its
-- eviction and across changes of learning day, including on replay after a lost HTTP response.
create unique index xp_ledger_corrected_production_once
  on app.xp_ledger (user_id, (meta ->> 'ref'))
  where reason = 'production.corrected' and meta ? 'ref';
