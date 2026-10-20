-- The placement test no longer has a variant (everyday / professional): the adaptive test draws
-- from a single bank per language. The app stops writing placement_tests.variant; rows already
-- stored keep theirs.
--
-- The column was already nullable; what required it was the table's completeness check
-- ("a completed test has all its fields"), which listed variant. Replace that check by one
-- that does not, and keep the rule for the other fields. record_placement_test is unchanged:
-- p_variant defaults to null.

do $$
declare
  c record;
begin
  -- The table-level check from 20261015000500 is unnamed, so find it by its definition, as
  -- Postgres prints it: "CASE status WHEN 'completed'::text THEN ((variant IS NOT NULL) AND ...".
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.placement_tests'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%CASE status%'
      and pg_get_constraintdef(oid) ilike '%variant IS NOT NULL%'
  loop
    execute format('alter table public.placement_tests drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.placement_tests
  add constraint placement_tests_completeness check (
    case status
      when 'completed' then
        start_level is not null and estimated_level is not null
        and confidence is not null and chosen_level is not null and answers is not null
        and bank_version is not null
      else
        variant is null and start_level is null and estimated_level is null
        and confidence is null and chosen_level is null and answers is null
        and bank_version is null
    end
  );
