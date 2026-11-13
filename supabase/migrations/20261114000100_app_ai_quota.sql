-- AI quota and cost functions. Reserved to service_role: no client may execute them (RLS keeps
-- app.ai_call unreadable, and quota_usage is only readable by its owner). Every function is security
-- definer with an empty search_path, validates its own parameters and trusts nothing else.
-- Nothing in `public` is modified. Spec: docs/refonte/specs/j1-pr3.md (lot D).
--
-- Errors: 22023 invalid parameter (null, bad kind, negative value, bad status, bad period);
--         23503 unknown user (foreign key on app.quota_usage / app.ai_call).

-- claim_quota: atomically takes one unit of the daily quota (user, day, kind). One INSERT ... ON CONFLICT
-- statement: the row lock taken by the conflict path serialises concurrent claims, and the WHERE clause is
-- re-evaluated on the committed row, so at most p_limit claims succeed. Returns false, changing nothing,
-- when the limit is reached or p_limit <= 0.
create function app.claim_quota(p_user_id uuid, p_kind text, p_limit integer, p_day date) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used integer;
begin
  if p_user_id is null or p_day is null or p_limit is null
     or p_kind is null or p_kind !~ '^[a-z_]{1,40}$' then
    raise exception 'invalid quota parameters' using errcode = '22023';
  end if;
  if p_limit <= 0 then
    return false;
  end if;

  insert into app.quota_usage as q (user_id, day, kind, used)
  values (p_user_id, p_day, p_kind, 1)
  on conflict (user_id, day, kind) do update
  set used = q.used + 1
  where q.used < p_limit
  returning q.used into v_used;

  return v_used is not null;
end;
$$;

-- release_quota: gives back one unit (a call failed before being billed). Never goes below 0 and never
-- creates a row. Returns nothing.
create function app.release_quota(p_user_id uuid, p_kind text, p_day date) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null or p_day is null or p_kind is null or p_kind !~ '^[a-z_]{1,40}$' then
    raise exception 'invalid quota parameters' using errcode = '22023';
  end if;

  update app.quota_usage q
  set used = greatest(q.used - 1, 0)
  where q.user_id = p_user_id and q.day = p_day and q.kind = p_kind;
end;
$$;

-- record_ai_call: journals one call to the model and returns its id. Token counts, batch and cost default
-- to 0 / false when null; a negative value, an empty purpose or model, or an unknown status is refused.
create function app.record_ai_call(
  p_purpose text,
  p_model text,
  p_prompt_version text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cache_read_tokens integer,
  p_cache_write_tokens integer,
  p_batch boolean,
  p_cost_usd numeric,
  p_user_id uuid,
  p_status text
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if p_purpose is null or char_length(p_purpose) not between 1 and 100
     or p_model is null or char_length(p_model) not between 1 and 100
     or (p_prompt_version is not null and char_length(p_prompt_version) > 100)
     or p_status is null or p_status <> all (array['ok', 'error', 'refused']) then
    raise exception 'invalid ai call parameters' using errcode = '22023';
  end if;
  if coalesce(p_input_tokens, 0) < 0 or coalesce(p_output_tokens, 0) < 0
     or coalesce(p_cache_read_tokens, 0) < 0 or coalesce(p_cache_write_tokens, 0) < 0
     or coalesce(p_cost_usd, 0) < 0 then
    raise exception 'negative values are refused' using errcode = '22023';
  end if;

  insert into app.ai_call (purpose, model, prompt_version, input_tokens, output_tokens, cache_read_tokens,
                           cache_write_tokens, batch, cost_usd, user_id, status)
  values (p_purpose, p_model, p_prompt_version, coalesce(p_input_tokens, 0), coalesce(p_output_tokens, 0),
          coalesce(p_cache_read_tokens, 0), coalesce(p_cache_write_tokens, 0), coalesce(p_batch, false),
          coalesce(p_cost_usd, 0), p_user_id, p_status)
  returning id into v_id;

  return v_id;
end;
$$;

-- ai_spend: spend per purpose and model over [p_from, p_to) (from inclusive, to exclusive).
create function app.ai_spend(p_from timestamptz, p_to timestamptz)
returns table (purpose text, model text, calls bigint, input_tokens bigint, output_tokens bigint, cost_usd numeric)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'invalid period' using errcode = '22023';
  end if;

  return query
    select c.purpose, c.model, count(*)::bigint, sum(c.input_tokens)::bigint, sum(c.output_tokens)::bigint,
           sum(c.cost_usd)::numeric
    from app.ai_call c
    where c.created_at >= p_from and c.created_at < p_to
    group by c.purpose, c.model
    order by c.purpose, c.model;
end;
$$;

-- ai_spend_month: total cost of the UTC calendar month containing p_at (0 when there is no call).
create function app.ai_spend_month(p_at timestamptz) returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from timestamptz;
  v_total numeric;
begin
  if p_at is null then
    raise exception 'invalid date' using errcode = '22023';
  end if;
  v_from := date_trunc('month', p_at at time zone 'UTC') at time zone 'UTC';

  select coalesce(sum(c.cost_usd), 0)::numeric into v_total
  from app.ai_call c
  where c.created_at >= v_from and c.created_at < v_from + interval '1 month';

  return v_total;
end;
$$;

revoke execute on function
  app.claim_quota(uuid, text, integer, date),
  app.release_quota(uuid, text, date),
  app.record_ai_call(text, text, text, integer, integer, integer, integer, boolean, numeric, uuid, text),
  app.ai_spend(timestamptz, timestamptz),
  app.ai_spend_month(timestamptz)
from public, anon, authenticated;
grant execute on function
  app.claim_quota(uuid, text, integer, date),
  app.release_quota(uuid, text, date),
  app.record_ai_call(text, text, text, integer, integer, integer, integer, boolean, numeric, uuid, text),
  app.ai_spend(timestamptz, timestamptz),
  app.ai_spend_month(timestamptz)
to service_role;
