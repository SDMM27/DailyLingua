-- Row Level Security and table privileges.
--
-- Two layers, both required:
--  1. GRANTs say which operations (and columns) a role may attempt at all;
--  2. RLS policies say which rows it may touch.
-- `anon` gets nothing. `service_role` bypasses RLS and keeps its default grants:
-- it is the only role allowed to write shared content and generated missions.

-- Secure by default: tables created by future migrations are not exposed to the
-- API roles until a migration grants them explicitly.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;

alter table public.languages enable row level security;
alter table public.profiles enable row level security;
alter table public.user_languages enable row level security;
alter table public.sources enable row level security;
alter table public.contents enable row level security;
alter table public.missions enable row level security;
alter table public.mission_sessions enable row level security;
alter table public.mission_activities enable row level security;
alter table public.activity_progress enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.vocabulary_reviews enable row level security;

-- Shared, read-only for signed-in users -------------------------------------

grant select on public.languages, public.sources, public.contents to authenticated;

create policy "languages are readable by signed-in users" on public.languages
  for select to authenticated using (true);
create policy "sources are readable by signed-in users" on public.sources
  for select to authenticated using (true);
create policy "contents are readable by signed-in users" on public.contents
  for select to authenticated using (true);

-- Profile: created by trigger, never inserted or deleted through the API -----

grant select on public.profiles to authenticated;
grant update (daily_minutes, topics, content_types, difficulty, generation_time, time_zone)
  on public.profiles to authenticated;

create policy "profiles: owner can read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: owner can update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Owner full access ----------------------------------------------------------

grant select, insert, update, delete on public.user_languages to authenticated;
create policy "user_languages: owner full access" on public.user_languages
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.activity_progress to authenticated;
create policy "activity_progress: owner full access" on public.activity_progress
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.quiz_answers to authenticated;
create policy "quiz_answers: owner full access" on public.quiz_answers
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.vocabulary_items to authenticated;
create policy "vocabulary_items: owner full access" on public.vocabulary_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- The journal is append-only for users.
grant select, insert on public.vocabulary_reviews to authenticated;
create policy "vocabulary_reviews: owner can read" on public.vocabulary_reviews
  for select to authenticated using (user_id = (select auth.uid()));
create policy "vocabulary_reviews: owner can insert" on public.vocabulary_reviews
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Generated missions: owner reads, service role writes ----------------------
-- The only thing a user changes on a mission is when they started / finished it.

grant select on public.missions to authenticated;
grant update (started_at, completed_at) on public.missions to authenticated;
create policy "missions: owner can read" on public.missions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "missions: owner can update" on public.missions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select on public.mission_sessions, public.mission_activities to authenticated;
create policy "mission_sessions: owner can read" on public.mission_sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "mission_activities: owner can read" on public.mission_activities
  for select to authenticated using (user_id = (select auth.uid()));

grant select on public.mission_stats to authenticated;
