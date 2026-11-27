-- Schema `app`, milestone 7, lot 2: badges of real milestones (docs/refonte/specs/j7-social.md). Awarded by the
-- server, final, append only. The owner reads; only the service role writes, through app.award_badges.

create table app.badge_award (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_id text not null check (char_length(badge_id) between 1 and 60),
  language text references app.language (code),
  awarded_at timestamptz not null default now(),
  meta jsonb not null default '{}' check (jsonb_typeof(meta) = 'object')
);

create unique index badge_award_unique_idx on app.badge_award (user_id, badge_id, coalesce(language, ''));
create index badge_award_user_idx on app.badge_award (user_id, awarded_at desc);

create trigger badge_award_append_only
  before update or delete on app.badge_award
  for each row execute function app.forbid_journal_change();

alter table app.badge_award enable row level security;
grant select on app.badge_award to authenticated;
create policy "badge_award: owner can read" on app.badge_award
  for select to authenticated using (user_id = (select auth.uid()));
grant select, insert on app.badge_award to service_role;

-- Records badges the server has decided: `p_awards` is an array of { badge_id, language (or null), meta }. A badge
-- already held is left alone. Returns the number of new rows.
create function app.award_badges(p_user uuid, p_awards jsonb) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  a jsonb;
begin
  if p_user is null or p_awards is null or jsonb_typeof(p_awards) <> 'array' or jsonb_array_length(p_awards) > 100 then
    raise exception 'invalid call' using errcode = '22023';
  end if;
  for a in select e.value from jsonb_array_elements(p_awards) as e loop
    insert into app.badge_award (user_id, badge_id, language, meta)
    values (p_user, a ->> 'badge_id', nullif(a ->> 'language', ''), coalesce(a -> 'meta', '{}'))
    on conflict do nothing;
    if found then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke execute on function app.award_badges(uuid, jsonb) from public, anon, authenticated;
grant execute on function app.award_badges(uuid, jsonb) to service_role;
