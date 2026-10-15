-- Placement tests: one row per test taken or skipped, per language. The latest row of a language
-- is what the app shows; older ones are kept as a history of the level.
-- Mirrors PLACEMENT_VARIANTS and PLACEMENT_CONFIDENCES in src/lib/schemas/placement.ts.
--
-- The estimate is computed by the server (the answers are replayed against the question bank,
-- src/app/actions/placement.ts), but the table does not rely on it: the estimate is a
-- self-assessment aid (the learner can pick any level anyway), so a forged row harms nobody but
-- its author. The owner can therefore insert and read their rows, never change or delete them.

create table public.placement_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  language text not null references public.languages (code),
  status text not null check (status in ('completed', 'skipped')),
  variant text check (variant in ('everyday', 'professional')),
  -- Level the test started at (the declared level), the level it estimated, the one kept.
  start_level text check (start_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  estimated_level text check (estimated_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  chosen_level text check (chosen_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  confidence text check (confidence in ('low', 'medium', 'high')),
  -- [{ itemId, choice, correct }] in the order asked; bank_version tells which questions they were.
  answers jsonb check (jsonb_typeof(answers) = 'array'),
  bank_version text check (char_length(bank_version) <= 20),
  taken_at timestamptz not null default now(),
  -- A completed test has all its fields, a skipped one has none.
  check (
    case status
      when 'completed' then
        variant is not null and start_level is not null and estimated_level is not null
        and confidence is not null and chosen_level is not null and answers is not null
        and bank_version is not null
      else
        variant is null and start_level is null and estimated_level is null
        and confidence is null and chosen_level is null and answers is null
        and bank_version is null
    end
  )
);

create index placement_tests_user_language_idx on public.placement_tests (user_id, language, taken_at desc);

alter table public.placement_tests enable row level security;

revoke all on public.placement_tests from anon, authenticated;
grant select, insert on public.placement_tests to authenticated;
create policy "placement_tests: owner can read" on public.placement_tests
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "placement_tests: owner can insert" on public.placement_tests
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Records a test (a skipped one only needs the language and the status) and, when it is
-- completed, sets the learner's current level for that language, atomically.
-- SECURITY INVOKER: row level security applies, the user only touches their own rows.
create function public.record_placement_test(
  p_language text,
  p_status text,
  p_variant text default null,
  p_start_level text default null,
  p_estimated_level text default null,
  p_confidence text default null,
  p_chosen_level text default null,
  p_answers jsonb default null,
  p_bank_version text default null
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid constant uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.user_languages ul where ul.user_id = uid and ul.language = p_language
  ) then
    raise exception 'language not studied by the user' using errcode = 'P0002';
  end if;

  insert into public.placement_tests (
    user_id, language, status, variant, start_level, estimated_level, confidence, chosen_level,
    answers, bank_version
  ) values (
    uid, p_language, p_status, p_variant, p_start_level, p_estimated_level, p_confidence,
    p_chosen_level, p_answers, p_bank_version
  );

  if p_status = 'completed' then
    update public.user_languages ul
    set level = p_chosen_level
    where ul.user_id = uid and ul.language = p_language;
  end if;
end;
$$;

revoke execute on function public.record_placement_test(text, text, text, text, text, text, text, jsonb, text)
  from public, anon;
grant execute on function public.record_placement_test(text, text, text, text, text, text, text, jsonb, text)
  to authenticated;
