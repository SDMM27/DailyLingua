-- The service reserves an event before asking the provider. An uncertain outcome is never billed again.
create table app.rewrite_check_job (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_event_id uuid not null,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{32}$'),
  started_at timestamptz not null default now(),
  fixed_error_ids text[] check (cardinality(fixed_error_ids) <= 8),
  primary key (user_id, client_event_id)
);

alter table app.rewrite_check_job enable row level security;
revoke all on app.rewrite_check_job from public, anon, authenticated;
grant select, insert, update, delete on app.rewrite_check_job to service_role;

create index rewrite_verified_sentence_idx on app.rewrite (user_id, correction_id, sentence_index)
  where accepted is true;

create function app.read_verified_sentences(p_user_id uuid, p_correction_ids uuid[])
returns table (correction_id uuid, sentence_index smallint)
language sql stable
set search_path = ''
as $$
  select distinct r.correction_id, r.sentence_index
  from app.rewrite r
  where r.user_id = p_user_id and r.accepted is true and r.correction_id = any(p_correction_ids);
$$;

revoke execute on function app.read_verified_sentences(uuid, uuid[]) from public, anon, authenticated;
grant execute on function app.read_verified_sentences(uuid, uuid[]) to service_role;
