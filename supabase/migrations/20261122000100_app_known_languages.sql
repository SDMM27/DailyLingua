alter table app.profile
  add column known_languages text[] not null default '{}',
  add constraint profile_known_languages_check check (
    cardinality(known_languages) <= 16
    and coalesce(array_ndims(known_languages), 1) = 1
    and (cardinality(known_languages) = 0 or array_to_string(known_languages, ',', '!') ~ '^[a-z]{2,3}(,[a-z]{2,3})*$')
  );

create function app.save_known_languages(p_languages text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_languages is null or cardinality(p_languages) > 16
    or coalesce(array_ndims(p_languages), 1) <> 1
    or exists (select 1 from unnest(p_languages) as entry(code)
      where code is null or code !~ '^[a-z]{2,3}$')
    or cardinality(p_languages) <> (select count(distinct code) from unnest(p_languages) as entry(code))
  then
    raise exception 'invalid known languages' using errcode = '22023';
  end if;

  update app.profile
  set known_languages = p_languages
  where user_id = v_user_id;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function app.save_known_languages(text[]) from public, anon;
grant execute on function app.save_known_languages(text[]) to authenticated;
