# Placement question banks: authoring rules

One file per study language: `src/lib/placement/banks/<code>.ts`, exporting
`export const <code>Bank = { ... } satisfies PlacementBank;` (type from `@/lib/schemas/placement`).
Check a bank with `npm run placement:check -- <code>` (all banks without argument).

## Shape

- `version`: date of the last change to the questions (`YYYY-MM-DD`). Bump it when questions change.
- One flat list `items` of 60 questions, 10 per level, in the order A1, A2, B1, B2, C1, C2. Within a
  level, in this order:
  - 1 to 4 — `grammar`: a sentence with one gap `___`, four forms to choose from.
  - 5 to 7 — `vocabulary`: a sentence with one gap `___`, four words or phrases.
  - 8 to 10 — `reading`: a short `context` passage, then a question about it (`prompt`), four short answers.
- `id`: `<code>-<level>-<n>`, for example `ru-b1-7` (n = 1 to 10 as above).
- `answer`: index (0–3) of the correct option. Over the 60 questions, each index is used 14 to 16
  times, with no visible pattern.
- The engine asks blocks of 5 questions at one level (grammar, vocabulary, reading, grammar,
  vocabulary), drawn in random order, so each level has two blocks' worth and a retest mostly
  sees other questions. Questions of the same level must not give each other away.
- Mix the contexts over the bank: daily life, friends, family, shopping, leisure, travel, opinions,
  culture, and about a third workplace situations (work, e-mails, meetings, customers; formal
  register), from A1 (introducing yourself at work, office objects, schedules) to C2 (contract
  nuances, diplomatic phrasing).

## Content

- Everything is in the studied language: no French, no translation, no transliteration.
  Standard modern language: Simplified Chinese (Mandarin); Japanese without furigana (more kana at
  A1–A2); Modern Standard Arabic, unvowelled unless a vowel is needed to disambiguate; Brazilian
  Portuguese; Spanish without regional words; monotonic Modern Greek; Korean polite style
  (해요체, 합쇼체 in professional contexts); Russian and Ukrainian without stress marks.
- Exactly one option is correct, and a native speaker would agree without hesitation. Distractors
  are wrong in context (grammar, meaning, collocation or register), plausible for a learner below
  the level, of similar length and form. No "all/none of the above"; the correct answer must not
  stand out by length or by repeating words of the prompt.
- Calibrate on CEFR descriptors. A learner at the level answers correctly, one level below usually
  does not:
  - A1: present of very common verbs, articles/gender, plurals, numbers, greetings, basic needs.
  - A2: past tenses, comparatives, frequent everyday words, simple connectors, short notices.
  - B1: future and conditional, common aspect or mood contrasts, relative clauses, opinions,
    short articles and e-mails.
  - B2: subjunctive and hypotheses, reported speech, passive, frequent collocations, argued texts.
  - C1: idiomatic collocations, advanced connectors, nuances of register, implicit meaning.
  - C2: rare idioms, fine stylistic and semantic distinctions, irony, implied stance.
  Reading questions test the passage (detail, inference at B2+, stance or implied meaning at C1+),
  not general knowledge. Passage length grows with the level (about 150 characters at A1, up to
  600 at C2; less in Chinese, Japanese and Korean).
- Language-specific difficulty belongs at its real level (Russian aspect and cases, German case
  endings, Arabic dual and broken plurals, Japanese keigo, Korean honorifics, Chinese measure words
  and complements, Polish/Czech cases, Greek aspect...).
- No sensitive topics (politics, religion, health conditions), no brand names, no real people.
