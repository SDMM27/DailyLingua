import { normalizeAnswer } from "@dailylingua/core";
import {
  CLEARED_VOICES, NON_LATIN_LANGUAGES, UNIT_ID_PATTERN, isScriptUnit,
  type ScriptUnitSource, type SituationUnitSource, type UnitItem, type UnitSource, type UnitStep,
} from "@dailylingua/schemas";

/** One broken invariant of a unit (`j4-pr1-architecture.md` §1.3). */
export interface UnitViolation {
  code:
    | "bad_id"
    | "duplicate_id"
    | "unknown_item"
    | "orphan_item"
    | "test_item_unseen"
    | "unknown_line"
    | "unknown_speaker"
    | "speaker_count"
    | "voice_not_cleared"
    | "unknown_word"
    | "unknown_grammar_point"
    | "missing_audio"
    | "test_size"
    | "pass_score"
    | "lesson_ids"
    | "mcq_answer"
    | "transliteration_latin_script"
    | "script_steps"
    | "letter_case"
    | "letter_duplicate"
    | "lookalike"
    | "letter_unknown"
    | "latin_mismatch";
  message: string;
}

export interface CheckOptions {
  /** Ids of the grammar curriculum of the unit's language. */
  grammarIds: readonly string[];
  /** Whether an audio path of the unit exists in the audio folder. */
  audioExists: (path: string) => boolean;
  /**
   * Writing units only: the lower-case letters taught by the writing units of the same language that come before this
   * one (lower `order`). Default: none.
   */
  knownLetters?: readonly string[];
  /**
   * Writing units only: the letter-to-Latin mapping of the script (lower-case letter to transliteration), from the
   * legacy alphabet module. When given, the `latin` of every letter and word is recomputed and compared.
   */
  letterLatin?: Readonly<Record<string, string>>;
}

/** The words of a text, lower-cased and normalised for the language: letters and digits, elisions split at the apostrophe. */
export function wordsOf(language: string, text: string): string[] {
  return (text.match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).map((word) => normalizeAnswer(language, word)).filter((word) => word !== "");
}

/** Every `itemIds` reference of the unit, with where it comes from. */
function itemReferences(unit: UnitSource): { ref: string; where: string }[] {
  const refs: { ref: string; where: string }[] = [];
  if (!isScriptUnit(unit) && unit.grammar) for (const ref of unit.grammar.itemIds) refs.push({ ref, where: "grammar.itemIds" });
  for (const lesson of unit.lessons) {
    for (const step of lesson.steps) for (const ref of step.itemIds) refs.push({ ref, where: `${lesson.id}:${step.step}` });
  }
  for (const ref of unit.test.itemIds) refs.push({ ref, where: "test.itemIds" });
  if (!isScriptUnit(unit)) {
    for (const turn of unit.conversation.turns) if (turn.itemId !== null) refs.push({ ref: turn.itemId, where: `conversation.${turn.id}` });
  }
  return refs;
}

/** The audio paths of the unit that are not null. */
function audioPaths(unit: UnitSource): { path: string; where: string }[] {
  const found: { path: string | null; where: string }[] = [
    ...(isScriptUnit(unit)
      ? [
          ...unit.letters.map((letter) => ({ path: letter.example.audio, where: `letter ${letter.lower} example` })),
          ...unit.words.map((word) => ({ path: word.audio, where: `word ${word.id}` })),
        ]
      : [
          { path: unit.dialogue.audio, where: "dialogue.audio" },
          ...unit.dialogue.lines.map((line) => ({ path: line.audio, where: `line ${line.id}` })),
          ...unit.keyPhrases.map((phrase) => ({ path: phrase.audio, where: `key phrase ${phrase.id}` })),
          ...unit.conversation.turns.map((turn) => ({ path: turn.audio, where: `turn ${turn.id}` })),
        ]),
    ...unit.items.flatMap((item) =>
      item.kind === "mcq" || item.kind === "listen_mcq" ? [{ path: item.audio, where: `item ${item.id}` }] : [],
    ),
  ];
  return found.flatMap((entry) => (entry.path === null ? [] : [{ path: entry.path, where: entry.where }]));
}

/** The answer words an item asks the learner to produce, each with the field it is in. */
function producedTexts(item: UnitItem): string[] {
  switch (item.kind) {
    case "order":
      return item.tokens;
    case "cloze":
    case "type":
      return item.accept;
    default:
      return [];
  }
}


type Add = (code: UnitViolation["code"], message: string) => void;

/** Reports every id used twice in `ids`. */
function dupes(add: Add, scope: string, ids: readonly string[]): void {
  for (const id of new Set(ids.filter((value, index) => ids.indexOf(value) !== index))) {
    add("duplicate_id", `${scope}: id "${id}" is used twice`);
  }
}

/** The steps each lesson of a writing unit has, in order (`j4-pr2.md` §1.1). */
const SCRIPT_LESSON_STEPS: Record<string, readonly UnitStep[]> = { l1: ["letters", "sounds"], l2: ["words", "reading"], l3: ["test"] };
const SCRIPT_STEPS: readonly UnitStep[] = ["letters", "sounds", "words", "reading"];

/** Cyrillic letters of a text, lower-cased (stress marks and punctuation are not letters). */
function cyrillicLetters(text: string): string[] {
  return text.toLowerCase().match(/\p{Script=Cyrillic}/gu) ?? [];
}

/** The target-language texts of an item that a learner reads, hears or produces (explanations excluded). */
function itemTexts(item: UnitItem): string[] {
  switch (item.kind) {
    case "mcq":
      return [...(typeof item.prompt === "string" ? [item.prompt] : []), ...item.options.map((option) => option.text)];
    case "listen_mcq":
      return [...(typeof item.prompt === "string" ? [item.prompt] : []), item.audioText, ...item.options.map((option) => option.text)];
    case "order":
      return [...item.tokens, ...item.distractors, item.answer, ...item.accept];
    case "cloze":
      return [item.before, item.after, ...item.accept];
    case "type":
      return item.accept;
    case "match":
      return item.pairs.map((pair) => pair.left);
  }
}

/** Letter-by-letter transliteration of a word with `map` (stress marks dropped, other characters kept). */
function transliterate(text: string, map: Readonly<Record<string, string>>): string {
  const bare = text.normalize("NFD").replace(/́/g, "").normalize("NFC").toLowerCase();
  return [...bare].map((char) => map[char] ?? char).join("");
}

/** Invariants of a situation unit: dialogue, key phrases, produced words, transliteration, grammar point. */
function checkSituation(unit: SituationUnitSource, options: CheckOptions, add: Add): void {
  dupes(add, "dialogue lines", unit.dialogue.lines.map((line) => line.id));
  dupes(add, "speakers", unit.dialogue.speakers.map((speaker) => speaker.id));
  dupes(add, "key phrases", unit.keyPhrases.map((phrase) => phrase.id));
  dupes(add, "conversation turns", unit.conversation.turns.map((turn) => turn.id));
  for (const lesson of unit.lessons) {
    for (const { step } of lesson.steps) {
      if (SCRIPT_STEPS.includes(step)) add("script_steps", `lesson ${lesson.id}: the step "${step}" belongs to writing units`);
    }
  }

  // Speakers, lines, voices.
  const speakers = new Set(unit.dialogue.speakers.map((speaker) => speaker.id));
  if (unit.dialogue.speakers.length !== 2) add("speaker_count", `${unit.dialogue.speakers.length} speakers, expected 2`);
  const cleared: readonly string[] = CLEARED_VOICES;
  for (const speaker of unit.dialogue.speakers) {
    if (!cleared.includes(speaker.voice)) add("voice_not_cleared", `speaker ${speaker.id}: voice "${speaker.voice}" is not cleared`);
  }
  for (const line of unit.dialogue.lines) {
    if (!speakers.has(line.speaker)) add("unknown_speaker", `line ${line.id}: unknown speaker "${line.speaker}"`);
  }
  for (const turn of unit.conversation.turns) {
    if (!speakers.has(turn.speaker)) add("unknown_speaker", `turn ${turn.id}: unknown speaker "${turn.speaker}"`);
  }
  const lineIds = new Set(unit.dialogue.lines.map((line) => line.id));
  for (const phrase of unit.keyPhrases) {
    if (phrase.lineId !== null && !lineIds.has(phrase.lineId)) {
      add("unknown_line", `key phrase ${phrase.id}: unknown line "${phrase.lineId}"`);
    }
  }

  // No unknown word: what a learner must produce is made of forms the unit has shown.
  const known = new Set<string>([
    ...unit.dialogue.lines.flatMap((line) => wordsOf(unit.language, line.text)),
    ...unit.keyPhrases.flatMap((phrase) => wordsOf(unit.language, phrase.text)),
    ...unit.dialogue.glosses.flatMap((gloss) => wordsOf(unit.language, gloss.form)),
  ]);
  for (const item of unit.items) {
    for (const text of producedTexts(item)) {
      const unknown = wordsOf(unit.language, text).filter((word) => !known.has(word));
      if (unknown.length > 0) add("unknown_word", `item ${item.id}: "${text}" has words the unit never shows (${unknown.join(", ")})`);
    }
  }

  // The audio text of a listening item is made of forms the unit has shown.
  for (const item of unit.items) {
    if (item.kind !== "listen_mcq") continue;
    const unknown = wordsOf(unit.language, item.audioText).filter((word) => !known.has(word));
    if (unknown.length > 0) add("unknown_word", `item ${item.id}: audioText "${item.audioText}" has words the unit never shows (${unknown.join(", ")})`);
  }

  // A transliteration only makes sense for a language written in another script.
  if (!NON_LATIN_LANGUAGES.includes(unit.language)) {
    const lines = [...unit.dialogue.lines.map((line) => ({ ...line, where: `line ${line.id}` })), ...unit.conversation.turns.map((turn) => ({ ...turn, where: `turn ${turn.id}` }))];
    for (const entry of lines) {
      if (entry.transliteration != null) add("transliteration_latin_script", `${entry.where}: transliteration on a language written in Latin script ("${unit.language}")`);
    }
  }

  // Grammar point.
  if (unit.grammarPointId !== null && !options.grammarIds.includes(unit.grammarPointId)) {
    add("unknown_grammar_point", `grammarPointId "${unit.grammarPointId}" is not in the curriculum`);
  }
}

/**
 * Invariants of a writing unit (`j4-pr2.md` §1.2): its steps, its voice, its letters, and the cumulative-letters rule
 * (every word and every Cyrillic text of an item uses only the letters of this unit and of the units before it).
 */
function checkScript(unit: ScriptUnitSource, options: CheckOptions, add: Add): void {
  for (const lesson of unit.lessons) {
    const expected = SCRIPT_LESSON_STEPS[lesson.id];
    const found = lesson.steps.map((entry) => entry.step);
    if (expected && found.join(",") !== expected.join(",")) {
      add("script_steps", `lesson ${lesson.id} must have the steps ${expected.join(", ")} (found ${found.join(", ")})`);
    }
  }
  const cleared: readonly string[] = CLEARED_VOICES;
  if (!cleared.includes(unit.voice)) add("voice_not_cleared", `voice "${unit.voice}" is not cleared`);

  dupes(add, "words", unit.words.map((word) => word.id));
  const own = unit.letters.map((letter) => letter.lower.toLowerCase());
  for (const lower of new Set(own.filter((value, index) => own.indexOf(value) !== index))) {
    add("letter_duplicate", `letter "${lower}" is taught twice in the unit`);
  }
  const earlier = (options.knownLetters ?? []).map((letter) => letter.toLowerCase());
  for (const letter of earlier) {
    if (own.includes(letter)) add("letter_duplicate", `letter "${letter}" is already taught by an earlier writing unit`);
  }
  const known = new Set<string>([...earlier, ...own]);

  for (const letter of unit.letters) {
    if (letter.upper.toLowerCase() !== letter.lower) add("letter_case", `letter "${letter.lower}": "${letter.upper}" is not its upper case`);
    if ((letter.kind === "false-friend") !== (letter.lookalike !== null)) {
      add("lookalike", `letter "${letter.lower}" (${letter.kind}): a lookalike is required for a false friend, and only for it`);
    }
    if (options.letterLatin) {
      const expected = options.letterLatin[letter.lower];
      if (expected === undefined) add("latin_mismatch", `letter "${letter.lower}" is not in the alphabet`);
      else if (letter.latin.normalize("NFC") !== expected.normalize("NFC")) {
        add("latin_mismatch", `letter "${letter.lower}": latin "${letter.latin}", expected "${expected}"`);
      }
    }
  }

  const unseen = (text: string) => [...new Set(cyrillicLetters(text).filter((letter) => !known.has(letter)))];
  for (const word of unit.words) {
    const missing = unseen(word.text);
    if (missing.length > 0) add("letter_unknown", `word ${word.id} "${word.text}" uses letters not taught yet (${missing.join(", ")})`);
    if (options.letterLatin) {
      const expected = transliterate(word.text, options.letterLatin);
      if (word.latin.normalize("NFC").toLowerCase() !== expected) add("latin_mismatch", `word ${word.id} "${word.text}": latin "${word.latin}", expected "${expected}"`);
    }
  }
  for (const item of unit.items) {
    for (const text of itemTexts(item)) {
      const missing = unseen(text);
      if (missing.length > 0) add("letter_unknown", `item ${item.id}: "${text}" uses letters not taught yet (${missing.join(", ")})`);
    }
  }
}

/**
 * Checks every invariant of a unit that code can check. Pure: audio and grammar ids come in through the
 * options. Returns every violation found (an empty list means the unit is valid); it does not parse, so run
 * `unitSchema` first.
 */
export function checkUnit(unit: UnitSource, options: CheckOptions): UnitViolation[] {
  const violations: UnitViolation[] = [];
  const add: Add = (code, message) => violations.push({ code, message });

  // Id and shape.
  const idMatch = UNIT_ID_PATTERN.test(unit.id) ? unit.id.split("-") : null;
  if (!idMatch || idMatch[0] !== unit.language || idMatch[1] !== unit.level.toLowerCase()) {
    add("bad_id", `id "${unit.id}" does not match the language "${unit.language}" and level "${unit.level}"`);
  }
  const lessonIds = unit.lessons.map((lesson) => lesson.id).join(",");
  if (lessonIds !== "l1,l2,l3") add("lesson_ids", `lessons must be l1, l2, l3 in order (found ${lessonIds || "none"})`);

  // Unique ids, by scope.
  dupes(add, "items", unit.items.map((item) => item.id));
  dupes(add, "can do", unit.canDo.map((entry) => entry.id));
  for (const item of unit.items) {
    if (item.kind === "mcq" || item.kind === "listen_mcq") {
      dupes(add, `options of ${item.id}`, item.options.map((option) => option.id));
      if (!item.options.some((option) => option.id === item.answer)) {
        add("mcq_answer", `item ${item.id}: answer "${item.answer}" is not one of its options`);
      }
    }
  }

  // Item references.
  const itemIds = new Set(unit.items.map((item) => item.id));
  const referenced = new Set<string>();
  for (const { ref, where } of itemReferences(unit)) {
    referenced.add(ref);
    if (!itemIds.has(ref)) add("unknown_item", `${where} references the unknown item "${ref}"`);
  }
  for (const item of unit.items) {
    if (!referenced.has(item.id)) add("orphan_item", `item ${item.id} belongs to no step and not to the test`);
  }
  const seenInSteps = new Set(
    unit.lessons.flatMap((lesson) => lesson.steps.filter((step) => step.step !== "test").flatMap((step) => step.itemIds)),
  );
  for (const id of unit.test.itemIds) {
    if (!seenInSteps.has(id)) add("test_item_unseen", `test item ${id} is not practised in any step`);
  }
  if (unit.test.itemIds.length !== 10) add("test_size", `the test has ${unit.test.itemIds.length} items, expected 10`);
  if (unit.test.passScore !== 8) add("pass_score", `passScore is ${unit.test.passScore}, expected 8`);
  dupes(add, "test items", unit.test.itemIds);

  if (isScriptUnit(unit)) checkScript(unit, options, add);
  else checkSituation(unit, options, add);

  // Audio files.
  for (const { path, where } of audioPaths(unit)) {
    if (!options.audioExists(path)) add("missing_audio", `${where}: audio file "${path}" does not exist`);
  }

  return violations;
}
