import { normalizeAnswer } from "@dailylingua/core";
import { CLEARED_VOICES, NON_LATIN_LANGUAGES, UNIT_ID_PATTERN, type UnitItem, type UnitSource } from "@dailylingua/schemas";

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
    | "transliteration_latin_script";
  message: string;
}

export interface CheckOptions {
  /** Ids of the grammar curriculum of the unit's language. */
  grammarIds: readonly string[];
  /** Whether an audio path of the unit exists in the audio folder. */
  audioExists: (path: string) => boolean;
}

/** The words of a text, lower-cased and normalised for the language: letters and digits, elisions split at the apostrophe. */
export function wordsOf(language: string, text: string): string[] {
  return (text.match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).map((word) => normalizeAnswer(language, word)).filter((word) => word !== "");
}

/** Every `itemIds` reference of the unit, with where it comes from. */
function itemReferences(unit: UnitSource): { ref: string; where: string }[] {
  const refs: { ref: string; where: string }[] = [];
  if (unit.grammar) for (const ref of unit.grammar.itemIds) refs.push({ ref, where: "grammar.itemIds" });
  for (const lesson of unit.lessons) {
    for (const step of lesson.steps) for (const ref of step.itemIds) refs.push({ ref, where: `${lesson.id}:${step.step}` });
  }
  for (const ref of unit.test.itemIds) refs.push({ ref, where: "test.itemIds" });
  for (const turn of unit.conversation.turns) if (turn.itemId !== null) refs.push({ ref: turn.itemId, where: `conversation.${turn.id}` });
  return refs;
}

/** The audio paths of the unit that are not null. */
function audioPaths(unit: UnitSource): { path: string; where: string }[] {
  const found: { path: string | null; where: string }[] = [
    { path: unit.dialogue.audio, where: "dialogue.audio" },
    ...unit.dialogue.lines.map((line) => ({ path: line.audio, where: `line ${line.id}` })),
    ...unit.keyPhrases.map((phrase) => ({ path: phrase.audio, where: `key phrase ${phrase.id}` })),
    ...unit.conversation.turns.map((turn) => ({ path: turn.audio, where: `turn ${turn.id}` })),
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

/**
 * Checks every invariant of a unit that code can check. Pure: audio and grammar ids come in through the
 * options. Returns every violation found (an empty list means the unit is valid); it does not parse, so run
 * `unitSchema` first.
 */
export function checkUnit(unit: UnitSource, options: CheckOptions): UnitViolation[] {
  const violations: UnitViolation[] = [];
  const add = (code: UnitViolation["code"], message: string) => violations.push({ code, message });

  // Id and shape.
  const idMatch = UNIT_ID_PATTERN.test(unit.id) ? unit.id.split("-") : null;
  if (!idMatch || idMatch[0] !== unit.language || idMatch[1] !== unit.level.toLowerCase()) {
    add("bad_id", `id "${unit.id}" does not match the language "${unit.language}" and level "${unit.level}"`);
  }
  const lessonIds = unit.lessons.map((lesson) => lesson.id).join(",");
  if (lessonIds !== "l1,l2,l3") add("lesson_ids", `lessons must be l1, l2, l3 in order (found ${lessonIds || "none"})`);

  // Unique ids, by scope.
  const dupes = (scope: string, ids: readonly string[]) => {
    for (const id of new Set(ids.filter((value, index) => ids.indexOf(value) !== index))) {
      add("duplicate_id", `${scope}: id "${id}" is used twice`);
    }
  };
  dupes("items", unit.items.map((item) => item.id));
  dupes("dialogue lines", unit.dialogue.lines.map((line) => line.id));
  dupes("speakers", unit.dialogue.speakers.map((speaker) => speaker.id));
  dupes("key phrases", unit.keyPhrases.map((phrase) => phrase.id));
  dupes("can do", unit.canDo.map((entry) => entry.id));
  dupes("conversation turns", unit.conversation.turns.map((turn) => turn.id));
  for (const item of unit.items) {
    if (item.kind === "mcq" || item.kind === "listen_mcq") {
      dupes(`options of ${item.id}`, item.options.map((option) => option.id));
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
  dupes("test items", unit.test.itemIds);

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

  // Audio files.
  for (const { path, where } of audioPaths(unit)) {
    if (!options.audioExists(path)) add("missing_audio", `${where}: audio file "${path}" does not exist`);
  }

  return violations;
}
