-- Schema `app`, milestone 7, lot 3: opt-in league as a collective challenge, friends by invitation code, cooperative
-- weekly challenge (docs/refonte/specs/j7-social.md). Other accounts' data becomes visible, so:
--  * every table has RLS and no write for `authenticated`; an account reads only its own rows;
--  * what one account sees of another goes through the `security definer` functions below, which take the caller from
--    auth.uid() (never a user id from the client), return only the listed fields (pseudonym, active target language,
--    league XP of the week, streak when the friend shows it) and answer only entitled callers;
--  * friends are addressed by pseudonym, so no user id of another account ever reaches a client.
-- Nothing is ranked: below 16 active members the league is a collective challenge (`mode`), the ranked mode is not built.

-- Tables ---------------------------------------------------------------------------------------------------------------

create table app.social_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pseudonym text not null
    check (pseudonym = btrim(pseudonym) and char_length(pseudonym) between 3 and 20 and pseudonym ~ '^[[:alnum:]][[:alnum:] -]*$'),
  created_at timestamptz not null default now()
);
create unique index social_profile_pseudonym_idx on app.social_profile (lower(pseudonym));

create table app.league_membership (
  user_id uuid primary key references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

create table app.friend_invite (
  code text primary key check (code ~ '^[A-Z2-9]{9}$'),
  inviter uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users (id) on delete cascade,
  used_at timestamptz,
  check (used_by is distinct from inviter)
);
create index friend_invite_inviter_idx on app.friend_invite (inviter);

create table app.friendship (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index friendship_b_idx on app.friendship (user_b);

create table app.coop_challenge (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now()
);

create table app.coop_member (
  challenge_id uuid not null references app.coop_challenge (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  left_at timestamptz,
  primary key (challenge_id, user_id)
);
create index coop_member_user_idx on app.coop_member (user_id);

-- Attempts to accept an invitation code or to choose a pseudonym (the rate limit that stops guessing codes and the
-- "is this pseudonym taken" oracle).
create table app.social_attempt (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'invite' check (kind in ('invite', 'pseudonym')),
  at timestamptz not null default now()
);
create index social_attempt_user_idx on app.social_attempt (user_id, at desc);

-- RLS: owner read only, nothing written by a client ---------------------------------------------------------------------

alter table app.social_profile enable row level security;
alter table app.league_membership enable row level security;
alter table app.friend_invite enable row level security;
alter table app.friendship enable row level security;
alter table app.coop_challenge enable row level security;
alter table app.coop_member enable row level security;
alter table app.social_attempt enable row level security;

-- friendship and friend_invite are not readable by a client at all: user_a/user_b and used_by are the auth ids of other
-- accounts. Friends are listed by friends_overview(), which returns pseudonyms only.
grant select on app.social_profile, app.league_membership, app.coop_challenge, app.coop_member, app.social_attempt to authenticated;

create policy "social_profile: owner can read" on app.social_profile
  for select to authenticated using (user_id = (select auth.uid()));
create policy "league_membership: owner can read" on app.league_membership
  for select to authenticated using (user_id = (select auth.uid()));
create policy "coop_challenge: creator can read" on app.coop_challenge
  for select to authenticated using (created_by = (select auth.uid()));
create policy "coop_member: owner can read" on app.coop_member
  for select to authenticated using (user_id = (select auth.uid()));
create policy "social_attempt: owner can read" on app.social_attempt
  for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on app.social_profile, app.league_membership, app.friend_invite, app.friendship,
  app.coop_challenge, app.coop_member, app.social_attempt to service_role;

-- Internal helpers (not executable by clients) ---------------------------------------------------------------------------

-- Whether a switch of `profile.game_settings` (`<group>.enabled`) is on; off when absent (league and friends are opt-in).
create function app.social_flag(p_user uuid, p_group text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select (p.game_settings #>> array[p_group, 'enabled'])::boolean from app.profile p where p.user_id = p_user), false)
$$;

-- Monday of the current week (the week runs Monday 04:00 to Monday 04:00, Paris time: the learning day of Paris).
create function app.social_week_start() returns date
language sql stable security definer set search_path = ''
as $$
  select date_trunc('week', app.learning_day_at('Europe/Paris', now())::timestamp)::date
$$;

-- League XP of one account over the week that starts on p_from: per day the league lines (no immersion), at most 150.
create function app.social_week_xp(p_user uuid, p_from date) returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(least(150, d.total)), 0)::integer
  from (select x.day, sum(x.amount) as total
        from app.xp_ledger x
        where x.user_id = p_user and x.day between p_from and p_from + 6
          and x.league_eligible and x.reason not like 'immersion.%'
        group by x.day) d
$$;

-- Weekly goal of one account: 5 days of the ring tier (5 XP per minute of the tier).
create function app.social_week_goal(p_user uuid) returns integer
language sql stable security definer set search_path = ''
as $$
  select 25 * coalesce(
    (select (p.game_settings #>> '{ring,tier}')::integer from app.profile p where p.user_id = p_user),
    (select case when e.daily_minutes in (10, 20, 30) then e.daily_minutes::integer else 15 end
     from app.enrollment e where e.user_id = p_user and e.active order by e.position limit 1),
    15)
$$;

-- The current streak of an account, 0 when it was not extended yesterday or today (streak_state.current is only rewritten
-- by the next ingestion, so a stale value would keep a lapsed streak alive).
create function app.social_streak(p_user uuid) returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce((select case when s.last_day >= app.learning_day_at(p.time_zone, now()) - 1 then s.current else 0 end
                   from app.streak_state s join app.profile p on p.user_id = s.user_id where s.user_id = p_user), 0)
$$;

-- Eligible for the league: the first XP line is at least 7 days old and the current streak is 3 days or more.
create function app.social_eligible(p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from app.xp_ledger x where x.user_id = p_user and x.day <= app.learning_day_at('Europe/Paris', now()) - 7)
    and app.social_streak(p_user) >= 3
$$;

-- Turning a switch off ends what it opened, at once and without penalty.
create function app.social_settings_changed() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce((old.game_settings #>> '{league,enabled}')::boolean, false) and not coalesce((new.game_settings #>> '{league,enabled}')::boolean, false) then
    update app.league_membership set left_at = now() where user_id = new.user_id and left_at is null;
  end if;
  if coalesce((old.game_settings #>> '{friends,enabled}')::boolean, false) and not coalesce((new.game_settings #>> '{friends,enabled}')::boolean, false) then
    update app.coop_member set left_at = now() where user_id = new.user_id and left_at is null;
  end if;
  return new;
end;
$$;

create trigger profile_social_switches
  after update of game_settings on app.profile
  for each row when (old.game_settings is distinct from new.game_settings)
  execute function app.social_settings_changed();

-- Pseudonym --------------------------------------------------------------------------------------------------------------

-- Chooses the pseudonym (once, at the first social activation): 'ok', 'invalid', 'taken' (case-insensitive), 'exists',
-- 'rate_limited' (10 attempts an hour: "taken" must not become a way to look pseudonyms up).
create function app.social_set_pseudonym(p_pseudonym text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if (select count(*) from app.social_attempt a where a.user_id = uid and a.kind = 'pseudonym' and a.at > now() - interval '1 hour') >= 10 then
    return 'rate_limited';
  end if;
  insert into app.social_attempt (user_id, kind) values (uid, 'pseudonym');
  if p_pseudonym is null or p_pseudonym <> btrim(p_pseudonym) or char_length(p_pseudonym) not between 3 and 20
     or p_pseudonym !~ '^[[:alnum:]][[:alnum:] -]*$' then
    return 'invalid';
  end if;
  if exists (select 1 from app.social_profile where user_id = uid) then
    return 'exists';
  end if;
  begin
    insert into app.social_profile (user_id, pseudonym) values (uid, p_pseudonym);
  exception when unique_violation then
    return 'taken';
  end;
  return 'ok';
end;
$$;

-- League -----------------------------------------------------------------------------------------------------------------

-- Joins the league (the league switch is on, a pseudonym exists): 'ok', 'not_enabled', 'no_profile'.
create function app.league_join() returns text
language plpgsql security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not app.social_flag(uid, 'league') then
    return 'not_enabled';
  end if;
  if not exists (select 1 from app.social_profile where user_id = uid) then
    return 'no_profile';
  end if;
  insert into app.league_membership (user_id) values (uid)
  on conflict (user_id) do update set left_at = null, joined_at = now() where app.league_membership.left_at is not null;
  return 'ok';
end;
$$;

create function app.league_leave() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  update app.league_membership set left_at = now() where user_id = uid and left_at is null;
end;
$$;

-- The collective challenge of the week, for a member only: { registered: false } for anybody else. No pseudonym, no rank.
-- Fields: registered, eligible, mode ('collective' below 16 active members, else 'ranked_pending': the ranked mode is not
-- built), participants, total, goal (80 % of the sum of the weekly goals), mine, week_start, days_left.
create function app.league_week_summary() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_week date := app.social_week_start();
  v_today date := app.learning_day_at('Europe/Paris', now());
  v_n integer := 0;
  v_total integer := 0;
  v_goal integer := 0;
  v_mine integer := 0;
  r record;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not app.social_flag(uid, 'league')
     or not exists (select 1 from app.league_membership m where m.user_id = uid and m.left_at is null) then
    return jsonb_build_object('registered', false);
  end if;
  if not app.social_eligible(uid) then
    return jsonb_build_object('registered', true, 'eligible', false);
  end if;
  for r in select m.user_id from app.league_membership m where m.left_at is null loop
    if app.social_flag(r.user_id, 'league') and app.social_eligible(r.user_id) then
      v_n := v_n + 1;
      v_total := v_total + app.social_week_xp(r.user_id, v_week);
      v_goal := v_goal + app.social_week_goal(r.user_id);
      if r.user_id = uid then
        v_mine := app.social_week_xp(uid, v_week);
      end if;
    end if;
  end loop;
  return jsonb_build_object('registered', true, 'eligible', true,
    'mode', case when v_n >= 16 then 'ranked_pending' else 'collective' end,
    'participants', v_n, 'total', v_total, 'goal', round(0.8 * v_goal)::integer, 'mine', v_mine,
    'week_start', v_week, 'days_left', v_week + 7 - v_today);
end;
$$;

-- Friends ----------------------------------------------------------------------------------------------------------------

-- Creates an invitation code (9 characters, no look-alike characters, valid 7 days, single use, 5 active at most):
-- { status: 'ok' | 'not_enabled' | 'no_profile' | 'limit', code, expires_at }.
create function app.friend_invite_create() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
  v_try integer := 0;
  v_expires timestamptz;
  i integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not app.social_flag(uid, 'friends') then
    return jsonb_build_object('status', 'not_enabled');
  end if;
  if not exists (select 1 from app.social_profile where user_id = uid) then
    return jsonb_build_object('status', 'no_profile');
  end if;
  if (select count(*) from app.friend_invite i2 where i2.inviter = uid and i2.used_by is null and i2.expires_at > now()) >= 5 then
    return jsonb_build_object('status', 'limit');
  end if;
  loop
    v_try := v_try + 1;
    v_bytes := uuid_send(gen_random_uuid());
    v_code := '';
    for i in 0 .. 8 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, case when i < 6 then i else i + 4 end) % 31) + 1, 1);
    end loop;
    begin
      insert into app.friend_invite (code, inviter) values (v_code, uid) returning expires_at into v_expires;
      exit;
    exception when unique_violation then
      if v_try >= 5 then
        raise;
      end if;
    end;
  end loop;
  return jsonb_build_object('status', 'ok', 'code', v_code, 'expires_at', v_expires);
end;
$$;

-- Accepts a code. 'ok', 'not_enabled', 'no_profile', 'rate_limited' (10 attempts an hour), 'invalid' (unknown, expired or
-- already used: one answer, so a guess learns nothing), 'self', 'already'. Every attempt is counted.
create function app.friend_invite_accept(p_code text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_invite app.friend_invite;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not app.social_flag(uid, 'friends') then
    return 'not_enabled';
  end if;
  if not exists (select 1 from app.social_profile where user_id = uid) then
    return 'no_profile';
  end if;
  if (select count(*) from app.social_attempt a where a.user_id = uid and a.kind = 'invite' and a.at > now() - interval '1 hour') >= 10 then
    return 'rate_limited';
  end if;
  insert into app.social_attempt (user_id, kind) values (uid, 'invite');
  delete from app.social_attempt where user_id = uid and at < now() - interval '1 day';

  select * into v_invite from app.friend_invite where code = v_code and used_by is null and expires_at > now() for update;
  if not found or not app.social_flag(v_invite.inviter, 'friends')
     or not exists (select 1 from app.social_profile where user_id = v_invite.inviter) then
    return 'invalid';
  end if;
  if v_invite.inviter = uid then
    return 'self';
  end if;
  if exists (select 1 from app.friendship f where f.user_a = least(uid, v_invite.inviter) and f.user_b = greatest(uid, v_invite.inviter)) then
    return 'already';
  end if;
  insert into app.friendship (user_a, user_b) values (least(uid, v_invite.inviter), greatest(uid, v_invite.inviter));
  update app.friend_invite set used_by = uid, used_at = now() where code = v_code;
  return 'ok';
end;
$$;

-- Removes a friend, by pseudonym. True when a friendship was removed. Their shared challenges and invitations end.
create function app.friend_remove(p_pseudonym text) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_friend uuid;
  v_n integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select sp.user_id into v_friend from app.social_profile sp where lower(sp.pseudonym) = lower(coalesce(p_pseudonym, ''));
  if v_friend is null then
    return false;
  end if;
  delete from app.friendship where user_a = least(uid, v_friend) and user_b = greatest(uid, v_friend);
  get diagnostics v_n = row_count;
  -- Challenges the two share (joined or only invited) end for one of them, so they stop seeing each other: the creator
  -- stays and the other one leaves; when neither created it, the caller leaves.
  update app.coop_member m set left_at = now()
  from app.coop_challenge c
  where c.id = m.challenge_id and m.left_at is null
    and m.user_id = case when c.created_by = uid then v_friend else uid end
    and exists (select 1 from app.coop_member o where o.challenge_id = m.challenge_id and o.left_at is null
                and o.user_id = case when m.user_id = uid then v_friend else uid end);
  return v_n > 0;
end;
$$;

-- The friends of the caller who have the friends switch on: pseudonym, active target language, league XP of the week and
-- the streak when that friend shows it. Never errors, productions or level. Empty when the caller's own switch is off.
create function app.friends_overview() returns table (pseudonym text, language text, week_xp integer, streak integer)
language sql stable security definer set search_path = ''
as $$
  select sp.pseudonym,
         (select e.language from app.enrollment e where e.user_id = f.friend and e.active order by e.position limit 1),
         app.social_week_xp(f.friend, app.social_week_start()),
         case when coalesce((p.game_settings #>> '{streak,enabled}')::boolean, true)
              then app.social_streak(f.friend) end
  from (select case when fs.user_a = (select auth.uid()) then fs.user_b else fs.user_a end as friend
        from app.friendship fs where (select auth.uid()) in (fs.user_a, fs.user_b)) f
  join app.social_profile sp on sp.user_id = f.friend
  join app.profile p on p.user_id = f.friend
  where app.social_flag((select auth.uid()), 'friends') and app.social_flag(f.friend, 'friends')
  order by sp.pseudonym
$$;

-- Cooperative challenge ---------------------------------------------------------------------------------------------------

-- Starts the challenge of the week with 1 to 4 friends, given by pseudonym; each one joins or not. 'ok' (with the id),
-- 'not_enabled', 'no_profile', 'invalid', 'not_friends', 'exists' (already in a challenge this week).
create function app.coop_create(p_pseudonyms text[]) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_week date := app.social_week_start();
  v_friends uuid[] := '{}';
  v_friend uuid;
  v_name text;
  v_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not app.social_flag(uid, 'friends') then
    return jsonb_build_object('status', 'not_enabled');
  end if;
  if not exists (select 1 from app.social_profile where user_id = uid) then
    return jsonb_build_object('status', 'no_profile');
  end if;
  if p_pseudonyms is null or coalesce(array_length(p_pseudonyms, 1), 0) not between 1 and 4 then
    return jsonb_build_object('status', 'invalid');
  end if;
  if exists (select 1 from app.coop_member m join app.coop_challenge c on c.id = m.challenge_id
             where m.user_id = uid and m.left_at is null and c.week_start = v_week
               and (m.joined_at is not null or m.user_id = c.created_by)) then
    return jsonb_build_object('status', 'exists');
  end if;
  foreach v_name in array p_pseudonyms loop
    select sp.user_id into v_friend from app.social_profile sp where lower(sp.pseudonym) = lower(coalesce(v_name, ''));
    if v_friend is null or v_friend = uid or v_friend = any (v_friends)
       or not exists (select 1 from app.friendship f where f.user_a = least(uid, v_friend) and f.user_b = greatest(uid, v_friend))
       or not app.social_flag(v_friend, 'friends') then
      return jsonb_build_object('status', 'not_friends');
    end if;
    v_friends := v_friends || v_friend;
  end loop;
  insert into app.coop_challenge (created_by, week_start) values (uid, v_week) returning id into v_id;
  insert into app.coop_member (challenge_id, user_id, joined_at) values (v_id, uid, now());
  insert into app.coop_member (challenge_id, user_id) select v_id, unnest(v_friends);
  return jsonb_build_object('status', 'ok', 'id', v_id);
end;
$$;

-- Joins a challenge the caller was invited to ('ok', 'not_enabled', 'unavailable', 'full', 'exists').
create function app.coop_join(p_challenge uuid) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_week date := app.social_week_start();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not app.social_flag(uid, 'friends') then
    return 'not_enabled';
  end if;
  if not exists (select 1 from app.coop_member m join app.coop_challenge c on c.id = m.challenge_id
                 where m.challenge_id = p_challenge and m.user_id = uid and m.left_at is null and m.joined_at is null
                   and c.week_start = v_week and app.social_flag(c.created_by, 'friends')
                   and exists (select 1 from app.friendship f
                               where f.user_a = least(uid, c.created_by) and f.user_b = greatest(uid, c.created_by))) then
    return 'unavailable';
  end if;
  if exists (select 1 from app.coop_member m join app.coop_challenge c on c.id = m.challenge_id
             where m.user_id = uid and m.left_at is null and m.joined_at is not null and c.week_start = v_week) then
    return 'exists';
  end if;
  if (select count(*) from app.coop_member m where m.challenge_id = p_challenge and m.left_at is null and m.joined_at is not null) >= 5 then
    return 'full';
  end if;
  update app.coop_member set joined_at = now() where challenge_id = p_challenge and user_id = uid;
  return 'ok';
end;
$$;

-- Leaves a challenge, or declines an invitation, without penalty.
create function app.coop_leave(p_challenge uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  update app.coop_member set left_at = now() where challenge_id = p_challenge and user_id = uid and left_at is null;
end;
$$;

-- The challenge of the caller (this week's, or last week's to read its outcome) and the invitations waiting, for a caller
-- with the friends switch on: { enabled, invitations: [{ id, from }], challenge: null | { id, status 'active' | 'closed',
-- week_start, days_left, members: [{ pseudonym, contribution, me }], total, goal, reached } }. Members are those who
-- joined, did not leave and still have the friends switch on; the goal is 80 % of the sum of their weekly goals.
create function app.coop_overview() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_week date := app.social_week_start();
  v_today date := app.learning_day_at('Europe/Paris', now());
  v_invitations jsonb;
  v_challenge app.coop_challenge;
  v_members jsonb := '[]';
  v_total integer := 0;
  v_goal integer := 0;
  v_n integer := 0;
  r record;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not app.social_flag(uid, 'friends') then
    return jsonb_build_object('enabled', false);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'from', sp.pseudonym) order by c.created_at), '[]') into v_invitations
  from app.coop_member m
  join app.coop_challenge c on c.id = m.challenge_id
  join app.social_profile sp on sp.user_id = c.created_by
  where m.user_id = uid and m.left_at is null and m.joined_at is null and c.week_start = v_week
    and app.social_flag(c.created_by, 'friends');

  select c.* into v_challenge
  from app.coop_member m join app.coop_challenge c on c.id = m.challenge_id
  where m.user_id = uid and m.left_at is null and m.joined_at is not null and c.week_start >= v_week - 7
  order by c.week_start desc limit 1;
  if not found then
    return jsonb_build_object('enabled', true, 'invitations', v_invitations, 'challenge', null);
  end if;

  for r in
    select m.user_id, sp.pseudonym
    from app.coop_member m join app.social_profile sp on sp.user_id = m.user_id
    where m.challenge_id = v_challenge.id and m.left_at is null and m.joined_at is not null
      and app.social_flag(m.user_id, 'friends')
    order by m.joined_at
  loop
    v_n := v_n + 1;
    v_goal := v_goal + app.social_week_goal(r.user_id);
    v_members := v_members || jsonb_build_array(jsonb_build_object(
      'pseudonym', r.pseudonym, 'contribution', app.social_week_xp(r.user_id, v_challenge.week_start), 'me', r.user_id = uid));
    v_total := v_total + app.social_week_xp(r.user_id, v_challenge.week_start);
  end loop;
  v_goal := round(0.8 * v_goal)::integer;
  return jsonb_build_object('enabled', true, 'invitations', v_invitations, 'challenge', jsonb_build_object(
    'id', v_challenge.id, 'status', case when v_challenge.week_start = v_week then 'active' else 'closed' end,
    'week_start', v_challenge.week_start, 'days_left', greatest(0, v_challenge.week_start + 7 - v_today),
    'members', v_members, 'total', v_total, 'goal', v_goal, 'reached', v_n >= 2 and v_total >= v_goal));
end;
$$;

-- Privileges ---------------------------------------------------------------------------------------------------------------

revoke execute on function app.social_flag(uuid, text), app.social_week_start(), app.social_week_xp(uuid, date),
  app.social_week_goal(uuid), app.social_streak(uuid), app.social_eligible(uuid), app.social_settings_changed() from public, anon, authenticated;
grant execute on function app.social_flag(uuid, text), app.social_week_start(), app.social_week_xp(uuid, date),
  app.social_week_goal(uuid), app.social_streak(uuid), app.social_eligible(uuid) to service_role;

revoke execute on function app.social_set_pseudonym(text), app.league_join(), app.league_leave(), app.league_week_summary(),
  app.friend_invite_create(), app.friend_invite_accept(text), app.friend_remove(text), app.friends_overview(),
  app.coop_create(text[]), app.coop_join(uuid), app.coop_leave(uuid), app.coop_overview() from public, anon;
grant execute on function app.social_set_pseudonym(text), app.league_join(), app.league_leave(), app.league_week_summary(),
  app.friend_invite_create(), app.friend_invite_accept(text), app.friend_remove(text), app.friends_overview(),
  app.coop_create(text[]), app.coop_join(uuid), app.coop_leave(uuid), app.coop_overview() to authenticated;
