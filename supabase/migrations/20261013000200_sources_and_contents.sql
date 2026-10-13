-- Shared catalogue of authentic content. Rows are shared by all users and only
-- written by the service role (future ingestion job), see the RLS migration.
--
-- Copyright: we store metadata, a short summary and an optional short excerpt,
-- never the full text of a protected article. The length limits below enforce it.

-- Canonical form of a URL, used to deduplicate content: lower-cased scheme and
-- host, no fragment, no trailing slash, no tracking parameters, sorted query.
create function public.normalize_url(url text) returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  parts text[];
  query text;
  kept text;
begin
  parts := regexp_match(btrim(url), '^(https?)://([^/?#]+)([^?#]*)(?:\?([^#]*))?(?:#.*)?$', 'i');
  if parts is null then
    raise exception 'invalid http(s) url: %', url using errcode = '22023';
  end if;
  query := parts[4];
  if query is not null then
    select string_agg(p, '&' order by p) into kept
    from unnest(string_to_array(query, '&')) as p
    where p <> '' and p !~* '^(utm_[^=]*|fbclid|gclid|mc_cid|mc_eid)(=|$)';
  end if;
  return lower(parts[1]) || '://' || lower(parts[2]) || regexp_replace(parts[3], '/+$', '')
    || case when kept is not null then '?' || kept else '' end;
end;
$$;

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  homepage_url text not null check (homepage_url ~* '^https?://'),
  homepage_url_normalized text generated always as (public.normalize_url(homepage_url)) stored unique,
  created_at timestamptz not null default now()
);

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id),
  language text not null references public.languages (code),
  content_type text not null check (content_type in ('article', 'podcast', 'video', 'interview')),
  title text not null check (char_length(title) between 1 and 300),
  url text not null check (url ~* '^https?://'),
  -- Deduplication key: the same page reached through different links is one row.
  url_normalized text generated always as (public.normalize_url(url)) stored unique,
  difficulty text not null check (difficulty in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  duration_minutes smallint not null check (duration_minutes > 0),
  summary text not null check (char_length(summary) between 1 and 1000),
  excerpt text check (char_length(excerpt) <= 500),
  -- False when exercises can only rely on public metadata (title, description).
  transcript_available boolean not null default false,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  url_status text not null default 'unchecked'
    check (url_status in ('unchecked', 'ok', 'redirected', 'broken', 'paywalled')),
  url_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Lets other tables reference (content, language) so a session cannot point
  -- to a content written in another language.
  unique (id, language)
);

create index contents_source_id_idx on public.contents (source_id);
create index contents_selection_idx on public.contents (language, content_type, difficulty);

create trigger contents_set_updated_at
  before update on public.contents
  for each row execute function public.set_updated_at();

revoke execute on function public.normalize_url(text) from public, anon, authenticated;
