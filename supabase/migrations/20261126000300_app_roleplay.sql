-- Schema `app`, milestone 5 PR 3: the role play with bounded tasks (docs/refonte/specs/j5-pr3-jeu-de-role.md section 4).
-- One row per game. The learner can read their own games; every write is the server's (service role), which always
-- filters on the `user_id` of the authenticated session: a client has no INSERT, UPDATE or DELETE privilege.
--  * `turns` holds the conversation (at most 20 entries: the opening plus 8 learner turns and 8 replies, with room left);
--  * at most one `active` game per account (partial unique index); a game left active for over 24 h is turned
--    `abandoned` by the server when it is read;
--  * `objectives_met` only ever goes from false to true (the server's rule, not a trigger: the row is the server's);
--  * deleting the account deletes its games (cascade).
-- Also, `roleplay.completed` is paid once per game: the XP line carries the game id in `meta.ref`, and this unique index
-- keeps the proof across the eviction of the ingestion memo and a replay under another event id (same as
-- `xp_ledger_corrected_production_once` for `production.corrected`).

create table app.roleplay (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  language text not null references app.language (code),
  scenario_id text not null check (scenario_id ~ '^[a-z0-9-]{3,40}$'),
  level text not null check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  status text not null default 'active' check (status in ('active', 'finished', 'abandoned')),
  turns jsonb not null default '[]'
    check (jsonb_typeof(turns) = 'array' and jsonb_array_length(turns) <= 20),
  objectives_met boolean[] not null default '{false,false,false}'
    check (cardinality(objectives_met) = 3),
  review jsonb check (review is null or jsonb_typeof(review) = 'object'),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index roleplay_user_idx on app.roleplay (user_id, created_at desc);
create unique index roleplay_one_active on app.roleplay (user_id) where status = 'active';

alter table app.roleplay enable row level security;
revoke all on app.roleplay from public, anon, authenticated;
grant select on app.roleplay to authenticated;
grant select, insert, update, delete on app.roleplay to service_role;
create policy "roleplay: owner can read" on app.roleplay
  for select to authenticated using (user_id = (select auth.uid()));

create unique index xp_ledger_roleplay_once
  on app.xp_ledger (user_id, (meta ->> 'ref'))
  where reason = 'roleplay.completed' and meta ? 'ref';
