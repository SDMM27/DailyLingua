-- Feedback sent by users from the app ("Envoyer un retour").
-- Write-only for users: they can add a row in their own name but never read, edit or delete one
-- (read it from Studio or with the service role). Same ownership model as the other user tables:
-- user_id references profiles, so deleting the account deletes the feedback.
--
-- Abuse limit: at most 20 feedback per user over a rolling 24 hours, enforced in the database
-- (a server action is a public endpoint). The refusal has its own SQLSTATE, 'DL429'.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('bug', 'idee', 'contenu', 'autre')),
  message text not null check (char_length(btrim(message)) between 3 and 2000),
  -- Path of the screen the feedback was sent from, and short commit hash of the deployed app.
  page text check (char_length(page) <= 200),
  app_version text check (char_length(app_version) <= 40),
  created_at timestamptz not null default now()
);

create index feedback_user_id_created_at_idx on public.feedback (user_id, created_at);

alter table public.feedback enable row level security;

grant insert on public.feedback to authenticated;
create policy "feedback: owner can insert" on public.feedback
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Security definer: the sender cannot read the table, so the count must run with the owner's rights.
create function public.limit_feedback_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialise concurrent inserts of one user so that they cannot all pass the count together.
  perform pg_advisory_xact_lock(hashtextextended('feedback:' || new.user_id::text, 0));
  if (
    select count(*) from public.feedback
    where user_id = new.user_id and created_at > now() - interval '24 hours'
  ) >= 20 then
    raise exception 'feedback_rate_limit: too many feedback in 24 hours'
      using errcode = 'DL429';
  end if;
  return new;
end;
$$;

revoke execute on function public.limit_feedback_rate() from public, anon, authenticated;

create trigger feedback_limit_rate
  before insert on public.feedback
  for each row execute function public.limit_feedback_rate();
