-- Schema `app`: "the user started writing in the new app" marker (review E1).
--
-- While app_active_since is null, the data migration (app.migrate_user) is a full resynchronisation from
-- public: the old app is still the source of truth. As soon as it is set, the data of that user in app
-- is theirs and the migration no longer touches it. Every write function of app calls app.mark_active.

alter table app.profile add column app_active_since timestamptz;

-- Internal: executable by service_role and by the SECURITY DEFINER functions (owner), never by clients.
create function app.mark_active(p_user_id uuid) returns void
language sql
security definer
set search_path = ''
as $$
  update app.profile
  set app_active_since = now()
  where user_id = p_user_id and app_active_since is null;
$$;

revoke execute on function app.mark_active(uuid) from public, anon, authenticated;
grant execute on function app.mark_active(uuid) to service_role;

create or replace function app.save_profile(
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
      reminder_time = p_reminder_time,
      app_active_since = coalesce(app_active_since, now())
  where user_id = uid
  returning * into result;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;
