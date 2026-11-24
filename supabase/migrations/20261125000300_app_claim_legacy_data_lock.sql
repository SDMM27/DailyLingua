-- app.claim_legacy_data, second version (same signature and grants as 20261125000100), two changes:
-- * it takes the per-user advisory lock of app.ingest_batch ('app.ingest:' || user id) BEFORE reading
--   app.profile.app_active_since, so that a learning event being ingested (which marks the user active) and a
--   resynchronisation never interleave: the user is re-read as active and skipped;
-- * legacy_migrated_at (stamped once by migrate_user) follows the last resynchronisation, so that the app can tell
--   how fresh the copy is (it refreshes a copy older than an hour when the home screen opens).
-- A new migration rather than an edit of 20261125000100: a committed migration never changes (migrations:check).

create or replace function app.claim_legacy_data() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_guest boolean;
  v_active timestamptz;
  v_recent integer;
  v_result jsonb;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select coalesce(u.is_anonymous, false) into v_guest from auth.users u where u.id = uid;
  if v_guest then
    return jsonb_build_object('skipped', 'guest');
  end if;

  if not exists (select 1 from public.profiles p where p.id = uid) then
    return jsonb_build_object('skipped', 'no_legacy');
  end if;

  -- The lock of app.ingest_batch for this user; the activity is read AFTER it is taken.
  perform pg_advisory_xact_lock(hashtextextended('app.ingest:' || uid::text, 0));
  select ap.app_active_since into v_active from app.profile ap where ap.user_id = uid;
  if v_active is not null then
    return jsonb_build_object('skipped', 'active');
  end if;

  -- Serialise the concurrent calls of one user so that they cannot all pass the count together.
  perform pg_advisory_xact_lock(hashtextextended('app.claim_legacy_data:' || uid::text, 0));
  delete from app.legacy_claim_log l where l.user_id = uid and l.claimed_at < now() - interval '24 hours';
  select count(*) into v_recent from app.legacy_claim_log l where l.user_id = uid;
  if v_recent >= 20 then
    return jsonb_build_object('skipped', 'rate_limited');
  end if;
  insert into app.legacy_claim_log (user_id) values (uid);

  v_result := app.migrate_user(uid);
  update app.profile ap set legacy_migrated_at = now() where ap.user_id = uid and ap.app_active_since is null;
  return v_result;
end;
$$;
