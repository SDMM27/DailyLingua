# Placement question banks: authoring rules

One file per study language: `src/lib/placement/banks/<code>.ts`, exporting
`export const <code>Bank = { ... } satisfies PlacementBank;` (type from `@/lib/schemas/placement`).
Check a bank with `npm run placement:check -- <code>` (all banks without argument).

## Shape

- `version`: date of the last change to the questions (`YYYY-MM-DD`). Bump it when questions change.
- Two variants, 18 questions each: `everyday` (daily life, friends, family, shopping, leisure,
  travel, opinions, culture; neutral to familiar register) and `professional` (work, e-mails,
  meetings, negotiation, reports, customers, HR; formal register).
- Order: A1, A2, B1, B2, C1, C2; three questions per level, in this order:
  1. `grammar`: a sentence with one gap `___`, four forms to choose from.
  2. `vocabulary`: a sentence with one gap `___`, four words or phrases.
  3. `reading`: a short `context` passage, then a question about it (`prompt`), four short answers.
- `id`: `<code>-<e|p>-<level>-<n>`, for example `ru-e-b1-2` (n = 1, 2, 3 as above).
- `answer`: index (0–3) of the correct option. Over the 18 questions of a variant, each index is
  used 4 or 5 times, with no visible pattern.

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
- Professional questions use realistic workplace situations at every level (A1: introducing
  yourself at work, office objects, schedules; C2: contract nuances, diplomatic phrasing).
- No sensitive topics (politics, religion, health conditions), no brand names, no real people.
