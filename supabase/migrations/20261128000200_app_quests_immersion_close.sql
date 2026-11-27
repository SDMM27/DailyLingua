-- Schema `app`, milestone 7, lot 1: closed days of immersion, quests. Spec: docs/refonte/specs/j7-social.md.
-- Additive only. Everything is computed lazily for one user by the server (no scheduled task).

-- Closed days of immersion ---------------------------------------------------------------------------------------
-- A day is editable while it is at most 3 days old (the ingestion late window) and closed from the 4th day on.
-- A closed day gets one row here (also when it earns no XP), so a change of time zone never reopens it.

create table app.immersion_close (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  minutes integer not null check (minutes > 0),
  xp smallint not null check (xp between 0 and 6),
  closed_at timestamptz not null default now(),
  primary key (user_id, day)
);

create trigger immersion_close_append_only
  before update or delete on app.immersion_close
  for each row execute function app.forbid_journal_change();

alter table app.immersion_close enable row level security;
grant select on app.immersion_close to authenticated;
create policy "immersion_close: owner can read" on app.immersion_close
  for select to authenticated using (user_id = (select auth.uid()));
grant select, insert on app.immersion_close to service_role;

-- Closes the days up to `p_through` that have entries and are not closed yet: one row each and, when the
-- day earns some, one `immersion.declared` ledger line (1 XP per 10 minutes, 6 at most). With the
-- immersionXp setting off nothing is written, so the days can be credited if it is turned back on.
-- Replayed: nothing. Returns the number of days closed.
create function app.close_immersion_days(p_user uuid, p_through date) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_on boolean;
  v_count integer := 0;
  v_xp integer;
  r record;
begin
  if p_user is null or p_through is null then
    raise exception 'invalid call' using errcode = '22023';
  end if;
  if p_through > current_date - 3 then
    raise exception 'a day is closed from the 4th day on' using errcode = '22023';
  end if;

  select coalesce((p.game_settings #>> '{immersionXp,enabled}')::boolean, true) into v_on
  from app.profile p where p.user_id = p_user;
  if v_on is null or not v_on then
    return 0;
  end if;

  for r in
    select e.day, sum(e.minutes)::integer as minutes
    from app.immersion_entry e
    where e.user_id = p_user and e.day <= p_through
      and not exists (select 1 from app.immersion_close c where c.user_id = p_user and c.day = e.day)
    group by e.day
    order by e.day
  loop
    v_xp := least(6, r.minutes / 10);
    insert into app.immersion_close (user_id, day, minutes, xp)
    values (p_user, r.day, r.minutes, v_xp)
    on conflict do nothing;
    if found then
      v_count := v_count + 1;
      if v_xp > 0 then
        insert into app.xp_ledger (user_id, language, day, amount, reason, meta, rule_version, league_eligible)
        values (p_user, null, r.day, v_xp, 'immersion.declared', jsonb_build_object('minutes', r.minutes), 'j7.1', false)
        on conflict do nothing;
      end if;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke execute on function app.close_immersion_days(uuid, date) from public, anon, authenticated;
grant execute on function app.close_immersion_days(uuid, date) to service_role;

-- Quests ---------------------------------------------------------------------------------------------------------------

create table app.quest_assignment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null check (period in ('day', 'week')),
  period_start date not null,
  slot smallint not null check (slot between 1 and 3),
  quest_id text not null check (char_length(quest_id) between 1 and 60),
  target smallint not null check (target > 0),
  catalog_version text not null check (char_length(catalog_version) between 1 and 20),
  rerolled_from text check (rerolled_from is null or char_length(rerolled_from) between 1 and 60),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, period, period_start, slot)
);

create index quest_assignment_user_idx on app.quest_assignment (user_id, period_start desc);

alter table app.quest_assignment enable row level security;
grant select on app.quest_assignment to authenticated;
create policy "quest_assignment: owner can read" on app.quest_assignment
  for select to authenticated using (user_id = (select auth.uid()));
grant select, insert on app.quest_assignment to service_role;

-- Marks a quest done and credits it once: `quest.daily` (10 XP, on the day of the quest) or `quest.weekly`
-- (40 XP, on the learning day of the completion). The caller has checked the target against the ledger.
-- The sourceless unique index of the ledger stops a double credit. True when this call credited.
create function app.complete_quest(p_assignment uuid) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q app.quest_assignment;
  v_tz text;
  v_day date;
begin
  select * into v_q from app.quest_assignment where id = p_assignment for update;
  if not found then
    raise exception 'unknown quest' using errcode = 'P0002';
  end if;
  if v_q.completed_at is not null then
    return false;
  end if;

  select p.time_zone into v_tz from app.profile p where p.user_id = v_q.user_id;
  v_day := case when v_q.period = 'day' then v_q.period_start
                else app.learning_day_at(coalesce(v_tz, 'Europe/Paris'), now()) end;

  update app.quest_assignment set completed_at = now() where id = p_assignment;
  insert into app.xp_ledger (user_id, language, day, amount, reason, meta, rule_version, league_eligible)
  values (v_q.user_id, null, v_day, case when v_q.period = 'day' then 10 else 40 end,
          case when v_q.period = 'day' then 'quest.daily' else 'quest.weekly' end,
          jsonb_build_object('quest', v_q.quest_id), 'j7.1', true)
  on conflict do nothing;
  return true;
end;
$$;

revoke execute on function app.complete_quest(uuid) from public, anon, authenticated;
grant execute on function app.complete_quest(uuid) to service_role;

-- Rerolls an unfinished quest of the day, once per day: the new quest replaces it and `rerolled_from` keeps the
-- old id. False when the quest is not the user's, is done, is not a daily quest, or the reroll of the day is spent.
create function app.reroll_quest(p_user uuid, p_assignment uuid, p_quest_id text, p_target smallint, p_catalog text) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q app.quest_assignment;
begin
  select * into v_q from app.quest_assignment where id = p_assignment and user_id = p_user for update;
  if not found or v_q.completed_at is not null or v_q.period <> 'day' then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || v_q.period_start::text, 0));
  if exists (select 1 from app.quest_assignment a
             where a.user_id = p_user and a.period = 'day' and a.period_start = v_q.period_start
               and a.rerolled_from is not null) then
    return false;
  end if;
  update app.quest_assignment
  set quest_id = p_quest_id, target = p_target, catalog_version = p_catalog, rerolled_from = v_q.quest_id
  where id = p_assignment;
  return true;
end;
$$;

revoke execute on function app.reroll_quest(uuid, uuid, text, smallint, text) from public, anon, authenticated;
grant execute on function app.reroll_quest(uuid, uuid, text, smallint, text) to service_role;
