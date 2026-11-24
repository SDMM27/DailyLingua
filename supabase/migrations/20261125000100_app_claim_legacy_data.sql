-- Schema `app`: app.claim_legacy_data(), the client-callable way for a user of the old app to bring their
-- data along when they first sign in to the new app (pre-release to volunteers, step M4).
--
-- It is a thin, safe door on app.migrate_user (service_role only, resynchronises public -> app):
-- * it acts on auth.uid(), never on an identifier received as an argument;
-- * a guest, a user without a public.profiles row, and a user already active in the new app
--   (app.profile.app_active_since set: the data of app is theirs) are skipped without touching anything;
-- * it is limited to 20 effective calls per user and per 24 hours (each one is a full resynchronisation).
-- Nothing in `public` is modified.
--
-- Result (jsonb): {"skipped": "guest" | "no_legacy" | "active" | "rate_limited"} or the result of
-- app.migrate_user. Errors: 28000 no signed-in user.

-- Rate of effective calls. Not app.event_rate: that table keeps hourly windows and prunes them after 2 hours.
-- Internal: RLS on, no policy, no grant for a client role.
create table app.legacy_claim_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  claimed_at timestamptz not null default now()
);

create index legacy_claim_log_user_id_claimed_at_idx on app.legacy_claim_log (user_id, claimed_at);

alter table app.legacy_claim_log enable row level security;
grant select, insert, update, delete on app.legacy_claim_log to service_role;

create function app.claim_legacy_data() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
  v_guest boolean;
  v_active timestamptz;
  v_recent integer;
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

  return app.migrate_user(uid);
end;
$$;

revoke execute on function app.claim_legacy_data() from public, anon;
grant execute on function app.claim_legacy_data() to authenticated;
