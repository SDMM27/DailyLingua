-- Schema `app` of the rewrite, block 1: schema, privileges, reference data and identity
-- (language, profile, enrollment, skill_estimate), the signup trigger and save_profile.
-- Nothing in `public` is modified. Spec: docs/refonte/specs/j1-pr1-schema-app.md.
--
-- Privilege model of the whole schema:
--  * `anon` has no right on `app`;
--  * `authenticated` gets SELECT table by table, never INSERT/UPDATE/DELETE: every write goes
--    through a SECURITY DEFINER function or through `service_role`;
--  * `service_role` gets SELECT/INSERT/UPDATE/DELETE on every table (no TRUNCATE) and the
--    sequences; the append-only tables are protected by triggers, not by the absence of a grant.

create schema app;

revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

alter default privileges in schema app revoke execute on functions from public;

-- Helpers --------------------------------------------------------------------------------------

create function app.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function app.validate_time_zone() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone) then
    raise exception 'invalid time zone: %', new.time_zone using errcode = '22023';
  end if;
  return new;
end;
$$;

-- ISO weekdays (1 = Monday): non-empty, no duplicate.
create function app.is_valid_weekdays(p_days smallint[]) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_days is not null
    and array_ndims(p_days) = 1
    and cardinality(p_days) between 1 and 7
    and p_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    and cardinality(p_days) = (select count(distinct d) from unnest(p_days) as d);
$$;

-- Languages learned ----------------------------------------------------------------------------
-- The 19 target languages of public.languages plus French (a learner whose L1 is not French can
-- learn it). Listed explicitly so the content of the schema does not depend on public at replay time.

create table app.language (
  code text primary key check (code ~ '^[a-z]{2,3}$'),
  created_at timestamptz not null default now()
);

insert into app.language (code) values
  ('ru'), ('it'), ('es'), ('de'), ('en'), ('pt'),
  ('nl'), ('sv'), ('pl'), ('cs'), ('uk'), ('ro'), ('el'), ('tr'), ('ar'), ('zh'), ('ja'), ('ko'), ('id'),
  ('fr');

alter table app.language enable row level security;
grant select on app.language to authenticated;
create policy "language: readable by signed-in users" on app.language
  for select to authenticated using (true);

-- Profile --------------------------------------------------------------------------------------

create table app.profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Any ISO 639 language, not only the target ones.
  native_language text not null default 'fr' check (native_language ~ '^[a-z]{2,3}$'),
  ui_language text not null default 'fr' check (ui_language ~ '^[a-z]{2,3}$'),
  time_zone text not null default 'Europe/Paris',
  reminder_time time check (extract(second from reminder_time) = 0),
  game_settings jsonb not null default '{}' check (jsonb_typeof(game_settings) = 'object'),
  is_guest boolean not null default false,
  -- Set by the data migration (app.migrate_user).
  legacy_migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profile_validate_time_zone
  before insert or update of time_zone on app.profile
  for each row execute function app.validate_time_zone();

create trigger profile_set_updated_at
  before update on app.profile
  for each row execute function app.set_updated_at();

alter table app.profile enable row level security;
grant select on app.profile to authenticated;
create policy "profile: owner can read" on app.profile
  for select to authenticated using (user_id = (select auth.uid()));

-- Enrollment: one row per language learned -----------------------------------------------------

create table app.enrollment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null references app.language (code),
  purpose text,
  target_level text check (target_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  daily_minutes smallint not null check (daily_minutes between 5 and 120),
  days smallint[] not null default '{1,2,3,4,5,6,7}' check (app.is_valid_weekdays(days)),
  focus jsonb not null default '{}' check (jsonb_typeof(focus) = 'object'),
  position smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, language)
);

create trigger enrollment_set_updated_at
  before update on app.enrollment
  for each row execute function app.set_updated_at();

-- A learner cannot learn their own native language. SECURITY DEFINER: reads the profile whatever
-- the role that writes the enrollment.
create function app.enforce_enrollment_language() returns trigger
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
  if new.language = v_native then
    raise exception 'the language % is the native language of the user', new.language using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger enrollment_enforce_language
  before insert or update of language, user_id on app.enrollment
  for each row execute function app.enforce_enrollment_language();

alter table app.enrollment enable row level security;
grant select on app.enrollment to authenticated;
create policy "enrollment: owner can read" on app.enrollment
  for select to authenticated using (user_id = (select auth.uid()));

-- Skill estimates ------------------------------------------------------------------------------
-- Continuous scale from 0 to 7, one unit per level: A0 = [0,1), A1 = [1,2), A2 = [2,3), B1 = [3,4),
-- B2 = [4,5), C1 = [5,6), C2 = [6,7]. The middle of a band is its legacy value (A1 = 1.5 ... C2 = 6.5).

create table app.skill_estimate (
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null references app.language (code),
  skill text not null check (skill in ('reading', 'listening', 'writing', 'speaking')),
  level_value numeric(4, 2) not null check (level_value between 0 and 7),
  uncertainty numeric(4, 2) not null check (uncertainty > 0),
  source text not null check (source in ('legacy', 'placement', 'assessment', 'estimated', 'declared')),
  updated_at timestamptz not null default now(),
  primary key (user_id, language, skill)
);

create trigger skill_estimate_set_updated_at
  before update on app.skill_estimate
  for each row execute function app.set_updated_at();

alter table app.skill_estimate enable row level security;
grant select on app.skill_estimate to authenticated;
create policy "skill_estimate: owner can read" on app.skill_estimate
  for select to authenticated using (user_id = (select auth.uid()));

-- Signup trigger -------------------------------------------------------------------------------
-- Next to public.handle_new_user (untouched): a profile for every new account. The migration that
-- creates app.streak_state (20261112000400) redefines this function to create that row as well.

create function app.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into app.profile (user_id, is_guest)
  values (new.id, coalesce(new.is_anonymous, false))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger app_on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- save_profile ---------------------------------------------------------------------------------
-- The only function callable by the client in this series. It acts on auth.uid(), never on an
-- identifier received as an argument.

create function app.save_profile(
  p_native_language text,
  p_ui_language text,
  p_time_zone text,
  p_reminder_time time default null
) returns app.profile
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  result app.profile;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_native_language is null or p_native_language !~ '^[a-z]{2,3}$'
     or p_ui_language is null or p_ui_language !~ '^[a-z]{2,3}$' then
    raise exception 'language codes must be 2 or 3 lowercase letters' using errcode = '22023';
  end if;
  if p_time_zone is null
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception 'invalid time zone: %', p_time_zone using errcode = '22023';
  end if;
  if p_reminder_time is not null and extract(second from p_reminder_time) <> 0 then
    raise exception 'the reminder time has a minute precision' using errcode = '22023';
  end if;
  if exists (
    select 1 from app.enrollment e
    where e.user_id = uid and e.active and e.language = p_native_language
  ) then
    raise exception 'the native language cannot be a language being learned' using errcode = '23514';
  end if;

  update app.profile
  set native_language = p_native_language,
      ui_language = p_ui_language,
      time_zone = p_time_zone,
      reminder_time = p_reminder_time
  where user_id = uid
  returning * into result;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

-- Privileges of the functions ------------------------------------------------------------------

revoke execute on function
  app.set_updated_at(),
  app.validate_time_zone(),
  app.is_valid_weekdays(smallint[]),
  app.enforce_enrollment_language(),
  app.handle_new_user()
from public, anon, authenticated;

revoke execute on function app.save_profile(text, text, text, time) from public, anon;
grant execute on function app.save_profile(text, text, text, time) to authenticated;

grant select, insert, update, delete on all tables in schema app to service_role;
