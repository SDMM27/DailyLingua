-- A reviewed recording can be added separately from the text. The filename is versioned with the asset.
alter table app.text
  add column audio_path text check (
    audio_path is null or (char_length(audio_path) <= 120 and audio_path ~ '^/reader-audio/[a-z0-9-]+[.](mp3|wav)$')
  );

update app.text
set audio_path = '/reader-audio/la-lista-della-spesa-v1.mp3'
where id = '416686de-fb47-4e05-8b89-44c866867380'
  and prompt_version = 'reader-pilot-1';
