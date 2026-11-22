-- Original reading sample for the library pilot. No writing task, so it is not picked by the daily loop.
insert into app.text (
  id, language, level_band, density, theme, prompt_version, title, body, word_count, new_words, status, checks
) values (
  '416686de-fb47-4e05-8b89-44c866867380', 'it', 'A2', 1, 'shopping_money', 'reader-pilot-1',
  'La lista della spesa',
  'Prima di andare al mercato, Luca fa una lista. Per lui è importante comprare tutto in una volta. Vuole preparare una torta, ma in frigorifero non c''è più burro. Al mercato trova il burro, le uova e anche delle mele. Poi torna a casa e prepara la torta con sua sorella.',
  51,
  '[
    {"lemma":"importante","dictionaryForm":"importante","definition":"Che conta molto.","sentence":1,
     "glosses":{"fr":"important","en":"important"},"comparisonId":"es-it-importante-significant"},
    {"lemma":"burro","dictionaryForm":"burro","definition":"Alimento a base di latte usato per cucinare.","sentence":2,
     "glosses":{"fr":"beurre","en":"butter"},"comparisonId":"es-it-burro-butter"}
  ]'::jsonb,
  'published', '{"editorialPilot":true}'::jsonb
);
