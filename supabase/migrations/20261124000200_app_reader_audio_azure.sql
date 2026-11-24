-- The reading of « La lista della spesa » moves from the Piper voice Paola (not cleared for commercial use) to the
-- native Azure Speech voice it-IT-ElsaNeural. The v1 file is removed from the repository.
update app.text
set audio_path = '/reader-audio/la-lista-della-spesa-v2.mp3'
where id = '416686de-fb47-4e05-8b89-44c866867380'
  and audio_path = '/reader-audio/la-lista-della-spesa-v1.mp3';
