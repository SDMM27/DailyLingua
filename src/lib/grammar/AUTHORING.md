# Grammar points: authoring rules

One file per language: `src/lib/grammar/courses/<code>.ts`, exporting
`export const <code>Course = { ... } satisfies GrammarCourse;` (type from `@/lib/schemas/grammar`).
The list of points, their ids, levels and topics is fixed by `src/lib/grammar/curriculum.ts`.
Check a course with `npm run grammar:check -- <code>`.

## Shape of a point

- `id`, `level`: as in the curriculum, in the same order. Never rename an id: review cards point to it.
- `title` (French, ≤ 80 characters) and `summary` (French, one line, ≤ 160): what the learner will
  be able to do, not a grammar term alone ("Dire où l'on est : в / на + prépositionnel").
- `rule`: 1 to 6 short French paragraphs, 5 to 10 lines in all. Explain for a French speaker:
  compare with French when it helps, name the trap a French speaker falls into. Forms of the studied
  language are quoted as they are written (Cyrillic, no transliteration).
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
- Contexts of everyday life and of work, as in the rest of the app. No sensitive topics, no brand
  names, no real people.
- French: typographic apostrophe (’) and French spacing before `: ; ? !` (non-breaking space), as
  in the rest of the interface. Tutoiement.
