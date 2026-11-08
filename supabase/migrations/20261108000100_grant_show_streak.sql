-- Re-grants update on profiles.show_streak to authenticated.
--
-- The grant was added to 20261026000100_show_streak.sql after that migration had already been
-- pushed to the hosted project. `supabase db push` tracks migrations by version and never replays
-- one, so the hosted database never got it: save_preferences, which runs as the caller and sets
-- show_streak, failed for every user with "permission denied for table profiles".
--
-- Idempotent: a database built from the edited file (local stack, CI) already has the grant.
-- Lesson: never edit a migration once it has been pushed; add a new one.

grant update (show_streak) on public.profiles to authenticated;
