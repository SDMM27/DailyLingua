-- Audio file of a podcast episode, taken from the RSS <enclosure>, so the app can play it.
--
-- Optional: only podcast sources that declare audio hosts get one, and only an https URL is stored
-- (the app refuses mixed content anyway). The file itself is never copied: the browser loads it from
-- the publisher's server when the learner taps "Écouter ici". Existing contents are left untouched
-- (the column is null for them); ingestion inserts known URLs with "ignore duplicates", so only new
-- episodes carry an audio URL.

alter table public.contents
  add column audio_url text check (audio_url ~ '^https://' and char_length(audio_url) <= 2000);
