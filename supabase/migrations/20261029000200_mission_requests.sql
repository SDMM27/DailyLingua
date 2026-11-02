-- Domain of the next mission (phase N3): « Demain, plutôt : sport ». The learner picks, per language,
-- the domain (one of the twelve TOPICS) of their next mission; generation then prefers contents of
-- that domain at the right level and falls back to any content when there is none. No extra model
-- call: only the candidate query changes.
--
--  * mission_requests: one row per (user, mission date, language). The owner can read their rows and
--    nothing else: every write goes through set_mission_request, which checks the dates. A request
--    follows its language: removing the language from the preferences deletes it (cascade).
--  * set_mission_request: security definer, called by the signed-in user. It accepts a language the
--    user studies and a date from tomorrow to 7 days ahead (in the user's own time zone, the one
--    the app computes "today" in), and refuses a date that already has a mission, whatever its
--    status: generation reads the requests when it starts, so a later change would not be applied.
--    A null topic removes the request (« Au hasard de mes sujets »). It also purges the user's
--    requests older than 30 days, so the table does not grow.
--  * The domain list is repeated in the check on purpose (as for contents.topics): a database
--    constraint cannot read the TypeScript constant, so adding a domain takes a migration.
--
-- Errors the app maps:
--   28000  not signed in
--   P0002  the language is not one of the user's        -> not found
--   22023  the date is not between tomorrow and +7 days -> invalid
--   DL003  the mission of that date exists already (message 'mission_already_generated'), a custom
--          SQLSTATE so that it cannot be confused with a generic P0001 raise_exception

create table public.mission_requests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_date date not null,
  language text not null,
  topic text not null check (
    topic in (
      'société', 'culture', 'histoire', 'sciences', 'économie', 'politique',
      'littérature', 'cinéma', 'technologie', 'voyage', 'gastronomie', 'sport'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, mission_date, language),
  foreign key (user_id, language) references public.user_languages (user_id, language) on delete cascade
);

alter table public.mission_requests enable row level security;

revoke all on public.mission_requests from anon, authenticated;
grant select on public.mission_requests to authenticated;
create policy "mission_requests: owner can read" on public.mission_requests
  for select to authenticated
  using (user_id = (select auth.uid()));

create function public.set_mission_request(p_language text, p_mission_date date, p_topic text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_today date;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select (now() at time zone p.time_zone)::date into v_today from public.profiles p where p.id = uid;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.user_languages ul where ul.user_id = uid and ul.language = p_language) then
    raise exception 'language % is not one of the user''s', p_language using errcode = 'P0002';
  end if;
  if p_mission_date is null or p_mission_date not between v_today + 1 and v_today + 7 then
    raise exception 'the mission date must be between tomorrow and 7 days ahead' using errcode = '22023';
  end if;
  if exists (select 1 from public.missions m where m.user_id = uid and m.mission_date = p_mission_date) then
    raise exception 'mission_already_generated' using errcode = 'DL003';
  end if;

  if p_topic is null then
    delete from public.mission_requests r
    where r.user_id = uid and r.mission_date = p_mission_date and r.language = p_language;
  else
    insert into public.mission_requests (user_id, mission_date, language, topic)
    values (uid, p_mission_date, p_language, p_topic)
    on conflict (user_id, mission_date, language)
    do update set topic = excluded.topic, updated_at = now();
  end if;

  delete from public.mission_requests r where r.user_id = uid and r.mission_date < v_today - 30;
end;
$$;

revoke execute on function public.set_mission_request(text, date, text) from public, anon;
grant execute on function public.set_mission_request(text, date, text) to authenticated;
