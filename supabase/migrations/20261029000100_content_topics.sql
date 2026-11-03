-- Domains of the contents (phase N1): contents.topics holds 0 to 3 of the app's twelve domains
-- (the TOPICS of src/lib/schemas/preferences.ts), so later phases can filter the reading list and
-- choose the next mission's subject by domain.
--
--  * NULL means "not classified yet"; '{}' means "classified, no domain fits" (a language lesson
--    with no subject, a title too vague). The ingestion sets the topics of a source that has fixed
--    ones (defaultTopics in the catalogue) and leaves the others NULL for the classifier, which
--    retries the NULL ones on every run.
--  * The check keeps the values to the twelve domains and at most three per content. The list is
--    repeated here on purpose: a database constraint cannot read the TypeScript constant, so adding
--    a domain takes a migration.
--  * A GIN index serves the filter by domain; a partial index on fetched_at serves the scan of the
--    contents still to classify (newest first).
--  * No RLS change: contents stay readable as before, and only the service role writes them.

alter table public.contents add column topics text[];

alter table public.contents
  add constraint contents_topics_valid check (
    topics is null
    or (
      cardinality(topics) <= 3
      and topics <@ array[
        'société', 'culture', 'histoire', 'sciences', 'économie', 'politique',
        'littérature', 'cinéma', 'technologie', 'voyage', 'gastronomie', 'sport'
      ]::text[]
    )
  );

create index contents_topics_idx on public.contents using gin (topics);

create index contents_unclassified_idx on public.contents (fetched_at) where topics is null;
