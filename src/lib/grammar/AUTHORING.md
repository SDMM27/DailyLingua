# Grammar points: authoring rules

One file per language: `src/lib/grammar/courses/<code>.ts`, exporting
`export const <code>Course = { ... } satisfies GrammarCourse;` (type from `@/lib/schemas/grammar`).
The list of points, their ids, levels and topics is fixed by `src/lib/grammar/curricula/<code>.ts`
(gathered in `curriculum.ts`); an empty list means the language has no course yet and is hidden.
Check a course with `npm run grammar:check -- <code>`.

## Curriculum of a language

- 18 points: 6 at A1, 6 at A2, 6 at B1, in teaching order. Choose them from what a French speaker
  needs at each level of the CEFR for this language (the core of its grammar first), not from
  the Russian or Italian list. Cover the main verb tenses and moods of the level, the system of
  the noun phrase (articles, cases, gender, plural, particles, classifiers…), pronouns, word order
  and the connectors of the level.
- `id`: `<code>-<level>-<slug>`, slug in English, short and stable (`es-a1-ser-estar`,
  `de-a2-dative`). `topic`: French, one line, naming the forms studied.

## Shape of a point

- `id`, `level`: as in the curriculum, in the same order. Never rename an id: review cards point to it.
- `title` (French, ≤ 80 characters) and `summary` (French, one line, ≤ 160): what the learner will
  be able to do, not a grammar term alone ("Dire où l'on est : в / на + prépositionnel").
- `rule`: 1 to 6 short French paragraphs, 5 to 10 lines in all. Explain for a French speaker:
  compare with French when it helps, name the trap a French speaker falls into. Forms of the studied
  language are quoted as they are written, in their own script, with no transliteration (except
  the readings asked below for Chinese and Japanese).
- `table` (optional): when forms are learnt as a paradigm (endings, conjugation, articles). At most
  5 columns and 12 rows; every row has one cell per header.
- `examples`: 2 to 4 natural sentences in the studied language, with a French `translation` and an
  optional `note` on what to notice.
- `exercises`: 3 to 5, at least two types among:
  - `choose`: a `prompt` with one gap `___`, 3 or 4 `options`, `answer` = index of the right one.
    Vary the position of the right answer across the course.
  - `fill`: a `prompt` with one gap `___`, an optional `hint` (the dictionary form to inflect,
    e.g. `"читать"`, shown after the gap), `answers` = every acceptable answer (the first one is
    shown as the correction).
  - `transform`: a French `instruction` ("Mets la phrase au passé."), a `source` sentence, and
    `answers` = every acceptable full sentence (with its final punctuation; answers are compared
    without case, extra spaces or final punctuation).
  - every exercise has a French `explanation` (one or two sentences) shown after the answer,
    whether right or wrong.
- `categories`: the correction categories the point helps with, among `verb`, `agreement`,
  `function_word`, `word_order`, `word_choice`, `spelling`, `register`, `other` (cases and
  endings are `agreement`; prepositions, articles and pronouns are `function_word`; tense, aspect
  and conjugation are `verb`).
- `reviewedOn`: `null` while the point is a draft. A native speaker sets the date when they approve
  it; drafts are hidden in production.

## Content

- Exercises test the point of the lesson, with vocabulary at or below its level. Exactly one option
  is right in `choose`; in `fill` and `transform`, list every form a native speaker would accept
  (word-order variants, both aspects when both are correct...). Keep the expected answer short
  enough to type on a phone.
- Standard modern language. Russian: write the stress mark (combining acute, U+0301, after the
  vowel) in `table`, `examples` and in the `rule` quotes at A1 and A2, never in `options` or
  `answers` (answers are compared without stress marks; ё and е are treated as equal).
  Italian: standard Italian, no regional forms; use the typographic apostrophe only in French text,
  the straight one (`l'acqua`) in Italian forms (both are accepted when answering).
- Ukrainian: same stress rules as Russian (combining acute in `table`, `examples` and A1–A2
  `rule` quotes, never in `options` or `answers`).
- Answers are compared without case (with Turkish ı/İ rules), extra spaces, final punctuation
  (`. ! ? … ; 。 ！ ？ ؟`) and a leading Spanish `¿ ¡`. Accents and other diacritics count
  everywhere (é, ü, ß, ą, ř, ș, ç, Greek tonos…), except the following.
- Arabic: Modern Standard Arabic (فصحى), no dialect. Vocalize fully (harakat) in `table`,
  `examples` and the `rule` quotes at A1 and A2, partly at B1 (where a vowel is ambiguous). Never
  write harakat in `options` or `answers`: answers are compared without them. The page is right to
  left; keep French and Arabic in separate fields where possible (a French `hint` is fine).
- Chinese: simplified characters, Mandarin. In `rule` quotes and example `note`s, give the pinyin
  with tone marks after the characters (我是 wǒ shì). `options` and `answers` in characters only, no
  pinyin. Answers are compared without spaces: do not list spacing variants.
- Japanese: polite style (です / ます) by default; plain forms are their own point. At A1, kana
  with only the commonest kanji (人, 日, 本, 学生…); add the reading in kana after a kanji in
  `rule` quotes and example `note`s (学生 がくせい). In `fill` and `transform`, list the answer
  both with kanji and in kana only (`["学生です", "がくせいです"]`). Answers are compared without
  spaces.
- Korean: hangeul only, the polite style 해요체 by default; 합니다체 and the plain style are their
  own points. Word spacing (띄어쓰기) counts in answers: list the standard spacing.
- Portuguese: Brazilian standard as the base (você, gerund); say in the `rule` when European
  Portuguese differs (tu, estar a + infinitive, clitic placement) and accept both in `answers`
  when both are correct.
- English: accept contracted and full forms in `answers` when both are natural (`I'm` / `I am`).
  German: nouns capitalized as in the standard (answers are compared without case). Spanish:
  write `¿ ¡`. Greek: monotonic spelling, with the tonos.
- Contexts of everyday life and of work, as in the rest of the app. No sensitive topics, no brand
  names, no real people.
- French: typographic apostrophe (’) and French spacing before `: ; ? !` (non-breaking space), as
  in the rest of the interface. Tutoiement.
