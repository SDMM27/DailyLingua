-- A durable reservation for the shared generation budget. Pending jobs lease a cell for
-- five minutes, including across server instances. A failed attempt still counts against
-- the calendar day's cap, so retries cannot circumvent the provider budget.
create table app.graded_text_job (
  id uuid primary key default gen_random_uuid(),
  language text not null references app.language (code),
  level_band text not null check (level_band in ('A2', 'B1', 'B2', 'C1')),
  density smallint not null check (density between 1 and 3),
  theme text not null check (char_length(theme) between 1 and 80),
  prompt_version text not null check (char_length(prompt_version) between 1 and 60),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  failure text check (char_length(failure) <= 200),
  text_id uuid references app.text (id)
);

create index graded_text_job_created_at on app.graded_text_job (created_at);
create index graded_text_job_pending on app.graded_text_job
  (language, level_band, density, theme, prompt_version, created_at) where finished_at is null;

alter table app.graded_text_job enable row level security;
grant select, insert, update, delete on app.graded_text_job to service_role;

create function app.claim_graded_text_job(p_language text, p_level text, p_density smallint, p_theme text, p_version text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_job uuid;
begin
  -- Serialize the check and insert for the global cap. Never hold a lock during a provider call.
  perform pg_catalog.pg_advisory_xact_lock(20261119, 41);
  if exists (
    select 1 from app.graded_text_job j
    where (j.language, j.level_band, j.density, j.theme, j.prompt_version)
      = (p_language, p_level, p_density, p_theme, p_version)
      and j.finished_at is null and j.created_at > now() - interval '5 minutes'
  ) then
    return jsonb_build_object('status', 'busy');
  end if;
  if (
    select count(*) from app.graded_text_job j
    where j.created_at >= date_trunc('day', now(), 'UTC')
  ) >= 30 then
    return jsonb_build_object('status', 'quota');
  end if;
  insert into app.graded_text_job (language, level_band, density, theme, prompt_version)
  values (p_language, p_level, p_density, p_theme, p_version)
  returning id into v_job;
  return jsonb_build_object('status', 'claimed', 'id', v_job);
end;
$$;

create function app.publish_graded_text(p_job uuid, p_text jsonb, p_items jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_job app.graded_text_job%rowtype;
  v_text uuid;
  v_item uuid;
  v_variant smallint;
  v_entry jsonb;
begin
  perform pg_catalog.pg_advisory_xact_lock(20261119, 41);
  select * into v_job from app.graded_text_job where id = p_job;
  if not found then
    raise exception 'Unrecognized graded text job' using errcode = '22023';
  end if;
  -- A retry after a lost HTTP response returns the existing text.
  if v_job.text_id is not null then
    return v_job.text_id;
  end if;
  if v_job.finished_at is not null or v_job.created_at <= now() - interval '5 minutes' then
    raise exception 'Graded text job is no longer active' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 19 and 22
      or p_text->'checks'->>'review' is distinct from 'approved' then
    raise exception 'Incomplete graded text' using errcode = '22023';
  end if;

  select coalesce(max(t.variant), 0) + 1 into v_variant from app.text t
  where (t.language, t.level_band, t.density, t.theme, t.prompt_version)
    = (v_job.language, v_job.level_band, v_job.density, v_job.theme, v_job.prompt_version);

  insert into app.text (language, level_band, density, theme, prompt_version, variant, title, body,
    word_count, new_words, grammar_point, writing_task, listening_segment, checks, model, status)
  values (v_job.language, v_job.level_band, v_job.density, v_job.theme, v_job.prompt_version, v_variant,
    p_text->>'title', p_text->>'body', (p_text->>'word_count')::integer, p_text->'new_words',
    p_text->>'grammar_point', p_text->>'writing_task', p_text->'listening_segment', p_text->'checks',
    p_text->>'model', 'published')
  returning id into v_text;

  for v_entry in select value from jsonb_array_elements(p_items) loop
    insert into app.text_item (text_id, step, kind, position, prompt, listening_only)
    values (v_text, v_entry->>'step', v_entry->>'kind', (v_entry->>'position')::smallint,
      v_entry->'prompt', (v_entry->>'listening_only')::boolean)
    returning id into v_item;
    insert into app.text_item_key (item_id, answer, accept)
    values (v_item, v_entry->'answer', v_entry->'accept');
  end loop;

  update app.graded_text_job set finished_at = now(), text_id = v_text where id = p_job;
  return v_text;
end;
$$;

revoke execute on function app.claim_graded_text_job(text, text, smallint, text, text) from public, anon, authenticated;
revoke execute on function app.publish_graded_text(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function app.claim_graded_text_job(text, text, smallint, text, text) to service_role;
grant execute on function app.publish_graded_text(uuid, jsonb, jsonb) to service_role;
