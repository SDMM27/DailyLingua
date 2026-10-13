-- Reference data, profiles and per-user language goals.
-- Mirrors src/lib/schemas/preferences.ts (Zod stays the source of truth for the app).

-- Shared helpers -------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Languages ------------------------------------------------------------------
-- A reference table rather than a CHECK list: adding a language is one INSERT
-- (mirror of src/lib/domain/languages.ts), no ALTER TABLE on any other table.

create table public.languages (
  code text primary key check (code ~ '^[a-z]{2,3}$'),
  created_at timestamptz not null default now()
);

insert into public.languages (code) values ('ru'), ('it'), ('es'), ('de'), ('en'), ('pt');

-- Profiles -------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  daily_minutes smallint not null default 30 check (daily_minutes between 10 and 120),
  topics text[] not null default array['société', 'culture'] check (cardinality(topics) >= 1),
  content_types text[] not null default array['article', 'podcast']
    check (
      cardinality(content_types) >= 1
      and content_types <@ array['article', 'podcast', 'video', 'interview']
    ),
  difficulty text not null default 'matched' check (difficulty in ('comfortable', 'matched', 'challenge')),
  -- Local time in time_zone; minute precision, like the "HH:mm" of the Zod schema.
  generation_time time not null default '07:00' check (extract(second from generation_time) = 0),
  time_zone text not null default 'Europe/Paris',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.topics is
  'Free-form topic keys; the allowed list lives in the app (Zod) so it can evolve without a migration.';

create function public.validate_time_zone() returns trigger
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

create trigger profiles_validate_time_zone
  before insert or update of time_zone on public.profiles
  for each row execute function public.validate_time_zone();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- A profile row is created for every new auth user, with the column defaults
-- (Europe/Paris, 30 min/day, 07:00). SECURITY DEFINER because the signing-up
-- user has no privileges on public.profiles yet.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- User languages -------------------------------------------------------------

create table public.user_languages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  language text not null references public.languages (code),
  level text not null check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  target_level text not null check (target_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  focus text not null default '' check (char_length(focus) <= 200),
  -- Relative share of the daily time; normalised across the user's languages.
  weight smallint not null default 5 check (weight between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, language)
);

create trigger user_languages_set_updated_at
  before update on public.user_languages
  for each row execute function public.set_updated_at();

-- At most 4 languages per user (same limit as the Zod schema). The profile row
-- is locked so two concurrent inserts cannot both slip under the limit.
create function public.enforce_max_user_languages() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.profiles where id = new.user_id for update;
  if (select count(*) from public.user_languages where user_id = new.user_id) >= 4 then
    raise exception 'a user can study at most 4 languages' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger user_languages_max_four
  before insert on public.user_languages
  for each row execute function public.enforce_max_user_languages();

-- Trigger functions must not be callable through the REST API (rpc).
revoke execute on function
  public.set_updated_at(),
  public.validate_time_zone(),
  public.handle_new_user(),
  public.enforce_max_user_languages()
from public, anon, authenticated;
