-- Personal vocabulary and its review journal (see src/lib/domain/spaced-repetition.ts).
--
-- vocabulary_items holds the *current* review state (box, due date) so "what is due
-- today" is a cheap indexed query; vocabulary_reviews is the append-only journal of
-- every review, from which the state can be rebuilt or analysed.

create table public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  language text not null references public.languages (code),
  term text not null check (char_length(btrim(term)) between 1 and 120),
  translation text not null check (char_length(btrim(translation)) between 1 and 200),
  definition text check (char_length(definition) <= 500),
  example text check (char_length(example) <= 500),
  source_name text check (char_length(source_name) between 1 and 120),
  source_url text check (source_url ~* '^https?://'),
  -- Optional link to the shared content the word came from.
  content_id uuid references public.contents (id) on delete set null,
  status text not null default 'learning' check (status in ('learning', 'known')),
  -- Leitner state. Dates are calendar days in the user's time zone (DateKey).
  box smallint not null default 0 check (box >= 0),
  due_on date not null default current_date,
  last_reviewed_on date,
  review_count integer not null default 0 check (review_count >= 0),
  added_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_url is null or source_name is not null),
  unique (user_id, language, term),
  unique (id, user_id)
);

create index vocabulary_items_due_idx on public.vocabulary_items (user_id, status, due_on);
create index vocabulary_items_content_id_idx on public.vocabulary_items (content_id)
  where content_id is not null;

create trigger vocabulary_items_set_updated_at
  before update on public.vocabulary_items
  for each row execute function public.set_updated_at();

create table public.vocabulary_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_id uuid not null,
  reviewed_at timestamptz not null default now(),
  -- The same instant as a calendar day in the user's time zone.
  reviewed_on date not null,
  grade text not null check (grade in ('again', 'hard', 'good', 'easy')),
  box_before smallint not null check (box_before >= 0),
  box_after smallint not null check (box_after >= 0),
  due_on_after date not null,
  foreign key (item_id, user_id) references public.vocabulary_items (id, user_id) on delete cascade
);

create index vocabulary_reviews_item_idx on public.vocabulary_reviews (item_id, reviewed_at desc);
create index vocabulary_reviews_user_day_idx on public.vocabulary_reviews (user_id, reviewed_on);
