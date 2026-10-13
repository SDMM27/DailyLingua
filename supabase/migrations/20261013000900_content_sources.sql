-- Phase 4: authentic content from RSS / Atom feeds.
--
-- 1. More study languages (mirror of src/lib/domain/languages.ts).
--
-- 2. sources describe a feed and the terms under which it is used. The catalogue itself lives in
--    the code (src/lib/content/catalog.ts), reviewed like any other change; the ingestion job
--    upserts it here. A source row without `key` is a manual one (demo seed, legacy) and is never
--    fetched. Every feed source records its licence: what we may do with it is decided from these
--    columns, not guessed at read time.
--
-- 3. contents gains the metadata the feeds give (author, categories). Still never the full text:
--    the ingestion keeps a short teaser (the app caps it far below the 1000-character limit).
--
-- Only the service role writes these tables (unchanged, see migration 5).

insert into public.languages (code) values
  ('nl'), ('sv'), ('pl'), ('cs'), ('uk'), ('ro'), ('el'), ('tr'), ('ar'), ('zh'), ('ja'), ('ko'), ('id')
on conflict (code) do nothing;

-- Sources ------------------------------------------------------------------------------------

alter table public.sources
  -- Stable identifier from the catalogue in the code.
  add column key text unique check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add column language text references public.languages (code),
  add column feed_url text check (feed_url ~* '^https://'),
  add column content_type text check (content_type in ('article', 'podcast', 'video', 'interview')),
  -- Licence of the source's own content. 'all-rights-reserved' sources are only ever shown as
  -- title + short teaser + link, which is what a feed is published for.
  add column license_kind text
    check (license_kind in ('cc-by', 'cc-by-sa', 'cc-by-nd', 'public-domain', 'all-rights-reserved')),
  add column license_name text check (char_length(license_name) between 1 and 80),
  add column license_url text check (license_url ~* '^https?://'),
  add column terms_url text check (terms_url ~* '^https?://'),
  -- Whether the terms allow use in a paid product without a separate agreement.
  add column commercial_use boolean not null default false,
  add column attribution text check (char_length(attribution) <= 200),
  -- Day the licence and terms were last checked by a person.
  add column license_verified_on date,
  -- Part of the articles behind a paywall or a metered paywall.
  add column access text not null default 'free' check (access in ('free', 'metered', 'paywalled')),
  -- False when the source left the catalogue or is excluded by the licence policy.
  add column active boolean not null default true,
  -- Last ingestion run (service role only).
  add column last_fetched_at timestamptz,
  add column last_fetch_status text check (last_fetch_status in ('ok', 'error')),
  add column last_fetch_error text check (char_length(last_fetch_error) <= 500),
  add column last_item_count smallint check (last_item_count >= 0),
  add column updated_at timestamptz not null default now(),
  add constraint sources_feed_definition_complete check (
    key is null
    or (
      language is not null and feed_url is not null and content_type is not null
      and license_kind is not null and license_name is not null and terms_url is not null
      and license_verified_on is not null
    )
  );

create trigger sources_set_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

-- Contents -----------------------------------------------------------------------------------

alter table public.contents
  add column author text check (char_length(author) between 1 and 200),
  add column categories text[] not null default '{}' check (cardinality(categories) <= 10);

-- The reading list: latest contents of a language.
create index contents_language_published_idx on public.contents (language, published_at desc nulls last);
-- Link checks pick the contents whose URL was never checked.
create index contents_unchecked_idx on public.contents (fetched_at) where url_status = 'unchecked';
