import { z } from "zod";
import { dateKeySchema, languageCodeSchema } from "./common";

/** Id of a unit: language, level, two-digit number, slug (e.g. `it-a1-01-saluer`). */
export const UNIT_ID_PATTERN = /^[a-z]{2}-(a0|a1)-\d{2}-[a-z0-9-]{2,40}$/;
export const unitIdSchema = z.string().regex(UNIT_ID_PATTERN, "Expected a unit id like it-a1-01-saluer");
export type UnitId = z.infer<typeof unitIdSchema>;

/**
 * Voices cleared for the audio of units (licence checked, `j4-parcours-debutant.md`). The audio script and
 * `units:check` refuse any other voice.
 */
/**
 * Voices cleared for the units: native neural voices of Azure Speech (commercial use allowed, no attribution required).
 * The Piper voices used before were fine-tuned from Flemish and English bases and did not sound native.
 */
export const CLEARED_VOICES = ["ru-RU-SvetlanaNeural", "ru-RU-DmitryNeural", "ru-RU-Lev:MAI-Voice-2", "it-IT-ElsaNeural", "it-IT-DiegoNeural"] as const;
export type ClearedVoice = (typeof CLEARED_VOICES)[number];

/** Text in the two languages the interface is explained in; both are mandatory. */
export const l10nSchema = z.strictObject({ fr: z.string().min(1), en: z.string().min(1) });
export type L10n = z.infer<typeof l10nSchema>;

export const unitSteps = [
  "dialogue",
  "key_phrases",
  "grammar",
  "exercises",
  "conversation",
  "test",
  // Writing units (PR 2).
  "letters",
  "sounds",
  "words",
  "reading",
] as const;
export const unitStepSchema = z.enum(unitSteps);
export type UnitStep = z.infer<typeof unitStepSchema>;

export const unitLessonIds = ["l1", "l2", "l3"] as const;
export const unitLessonIdSchema = z.enum(unitLessonIds);
export type UnitLessonId = z.infer<typeof unitLessonIdSchema>;

const idSchema = z.string().min(1).max(40);
const audioPathSchema = z.string().min(1).nullable();
const textSchema = z.string().min(1);
const promptSchema = z.union([l10nSchema, textSchema]);

const optionSchema = z.strictObject({ id: idSchema, text: textSchema });

const mcqFields = {
  id: idSchema,
  prompt: promptSchema,
  options: z.array(optionSchema).min(2).max(4),
  answer: idSchema,
  explain: l10nSchema,
};

const mcqItemSchema = z.strictObject({ ...mcqFields, kind: z.literal("mcq"), audio: audioPathSchema });
/** Listening multiple choice: same as `mcq`, the audio is mandatory. */
const listenMcqItemSchema = z.strictObject({
  ...mcqFields,
  kind: z.literal("listen_mcq"),
  audio: textSchema,
  /** Target-language text the audio says (what the audio script synthesises). */
  audioText: textSchema,
});

const orderItemSchema = z.strictObject({
  id: idSchema,
  kind: z.literal("order"),
  prompt: l10nSchema,
  tokens: z.array(textSchema).min(2).max(10),
  distractors: z.array(textSchema).max(2),
  /** The sentence to rebuild. */
  answer: textSchema,
  /** Other accepted sentences. */
  accept: z.array(textSchema),
  explain: l10nSchema,
});

const clozeItemSchema = z.strictObject({
  id: idSchema,
  kind: z.literal("cloze"),
  before: z.string(),
  after: z.string(),
  accept: z.array(textSchema).min(1),
  hint: l10nSchema.nullable(),
  explain: l10nSchema,
});

const typeItemSchema = z.strictObject({
  id: idSchema,
  kind: z.literal("type"),
  prompt: l10nSchema,
  accept: z.array(textSchema).min(1),
  explain: l10nSchema,
});

const matchItemSchema = z.strictObject({
  id: idSchema,
  kind: z.literal("match"),
  pairs: z.array(z.strictObject({ left: textSchema, right: l10nSchema })).min(3).max(5),
  explain: l10nSchema,
});

export const unitItemSchema = z.discriminatedUnion("kind", [
  mcqItemSchema,
  listenMcqItemSchema,
  orderItemSchema,
  clozeItemSchema,
  typeItemSchema,
  matchItemSchema,
]);
export type UnitItem = z.infer<typeof unitItemSchema>;
export type UnitItemKind = UnitItem["kind"];

const speakerSchema = z.strictObject({ id: idSchema, name: textSchema, voice: textSchema });

/** Latin-script reading of a line, only for languages written in another script (`checkUnit` enforces it). */
const transliterationSchema = z.string().min(1).nullable().default(null);

const lineSchema = z.strictObject({
  id: idSchema,
  speaker: idSchema,
  text: textSchema,
  transliteration: transliterationSchema,
  translation: l10nSchema,
  audio: audioPathSchema,
});

const glossSchema = z.strictObject({
  form: textSchema,
  lemma: textSchema,
  meaning: l10nSchema,
  note: l10nSchema.nullable(),
  /** The word is new in this unit (counted by `units:check`). */
  isNew: z.boolean(),
});

const keyPhraseSchema = z.strictObject({
  id: idSchema,
  text: textSchema,
  translation: l10nSchema,
  lineId: idSchema.nullable(),
  audio: audioPathSchema,
});

const lessonStepSchema = z.strictObject({
  step: unitStepSchema,
  itemIds: z.array(idSchema),
  /** Share of the step's items right (last try) needed to validate it, 0 to 1. */
  threshold: z.number().min(0).max(1),
});

const lessonSchema = z.strictObject({
  id: unitLessonIdSchema,
  steps: z.array(lessonStepSchema).min(1),
});

const turnSchema = z.strictObject({
  id: idSchema,
  speaker: idSchema,
  text: textSchema,
  transliteration: transliterationSchema,
  translation: l10nSchema,
  audio: audioPathSchema,
  itemId: idSchema.nullable(),
});

/** What an author writes: a unit without its `version`. */
export const unitStatuses = ["draft", "reviewed", "published"] as const;
export type UnitStatus = (typeof unitStatuses)[number];

/** Fields every kind of unit has, the bilan included. */
const headerFields = {
  id: unitIdSchema,
  language: languageCodeSchema,
  order: z.number().int().min(1),
  title: l10nSchema,
  situation: l10nSchema,
  minutes: z.number().int().min(1),
  canDo: z.array(z.strictObject({ id: idSchema, text: l10nSchema })).min(2).max(3),
  /** AI review status; the only one (an agent never records a human review). */
  aiReview: z.strictObject({ reviewedOn: dateKeySchema, passes: z.number().int().min(2), arbiter: textSchema }).nullable(),
  /**
   * Editorial status: `draft`, then `reviewed` (AI review done, audio may still be missing), then `published` (served in
   * production; `units:check` then requires every audio file). Reviewed and published need `aiReview`.
   */
  status: z.enum(unitStatuses).default("draft"),
};

/** Fields the authors of situation and writing units write. */
const commonFields = {
  ...headerFields,
  items: z.array(unitItemSchema).min(1),
  lessons: z.array(lessonSchema).length(3),
  test: z.strictObject({ itemIds: z.array(idSchema).length(10), passScore: z.literal(8) }),
};

const reviewedNeedsAiReview = {
  check: (unit: { status: UnitStatus; aiReview: unknown }) => unit.status === "draft" || unit.aiReview !== null,
  params: { message: "A reviewed or published unit needs aiReview", path: ["status"] },
};

/** A situation unit: a dialogue, its key phrases, a grammar point, exercises and a conversation. */
const situationUnitSchema = z
  .strictObject({
    ...commonFields,
    kind: z.literal("situation"),
    level: z.enum(["A0", "A1"]),
    /** Id of the grammar curriculum point the unit covers, or null. */
    grammarPointId: z.string().min(1).nullable(),
    dialogue: z.strictObject({
      title: textSchema,
      speakers: z.array(speakerSchema).length(2),
      lines: z.array(lineSchema).min(6).max(10),
      audio: audioPathSchema,
      glosses: z.array(glossSchema),
    }),
    keyPhrases: z.array(keyPhraseSchema).min(6).max(10),
    grammar: z.strictObject({ summary: l10nSchema, itemIds: z.array(idSchema).min(2) }).nullable(),
    conversation: z.strictObject({ turns: z.array(turnSchema).min(1) }),
  })
  .refine(reviewedNeedsAiReview.check, reviewedNeedsAiReview.params);

/** What a script unit teaches about one letter. */
export const LETTER_KINDS = ["same", "false-friend", "new", "sign"] as const;

const letterSchema = z.strictObject({
  upper: textSchema,
  lower: textSchema,
  /** Letter-by-letter transliteration (the system of the legacy alphabet module; `units:check` recomputes it). */
  latin: textSchema,
  /** Name of the letter (e.g. "бэ"). */
  name: textSchema,
  kind: z.enum(LETTER_KINDS),
  /** For a false friend: the misleading Latin letter. Null otherwise (`checkUnit` enforces it). */
  lookalike: textSchema.nullable(),
  /** The sound, described for a French or English speaker. */
  sound: l10nSchema,
  example: z.strictObject({ word: textSchema, translation: l10nSchema, audio: audioPathSchema }),
});

const scriptWordSchema = z.strictObject({
  id: idSchema,
  text: textSchema,
  latin: textSchema,
  translation: l10nSchema,
  audio: audioPathSchema,
});

/**
 * A writing unit: it teaches one group of letters of a script (`j4-pr2.md` §1). No dialogue, key phrases, grammar nor
 * conversation. Its steps are `letters`, `sounds` (lesson 1), `words`, `reading` (lesson 2) and the test (lesson 3).
 */
const scriptUnitSchema = z
  .strictObject({
    ...commonFields,
    kind: z.literal("script"),
    level: z.literal("A0"),
    /** Voice of the audio of the examples and words (`units:audio`; `checkUnit` refuses an uncleared one). */
    voice: textSchema,
    letters: z.array(letterSchema).min(4).max(8),
    /** Words readable with the letters of this unit and of the writing units before it. */
    words: z.array(scriptWordSchema).min(8).max(14),
  })
  .refine(reviewedNeedsAiReview.check, reviewedNeedsAiReview.params);

/** One question of a bilan: an item of the test of one of its source units. */
const drawSchema = z.strictObject({ unit: unitIdSchema, item: idSchema });

/**
 * The end-of-path assessment (`j4-pr3.md` §2): only a test, made of 10 items drawn from the tests of other units. An
 * author writes the draws; the registry resolves them into `items`, `lessons`, `test` and `drawnFrom` (`AssessmentUnit`).
 */
export const assessmentUnitSourceSchema = z
  .strictObject({
    ...headerFields,
    kind: z.literal("assessment"),
    level: z.literal("A1"),
    /** The 10 questions, in the order shown (units mixed). */
    draws: z.array(drawSchema).length(10),
  })
  .refine(reviewedNeedsAiReview.check, reviewedNeedsAiReview.params);

export const unitSchema = z.discriminatedUnion("kind", [situationUnitSchema, scriptUnitSchema, assessmentUnitSourceSchema]);

/** What an author writes (`transliteration` may be left out); parsing fills it with null. */
export type UnitSource = z.input<typeof unitSchema>;
/** A parsed unit source. */
export type ParsedUnitSource = z.output<typeof unitSchema>;
export type SituationUnitSource = Extract<UnitSource, { kind: "situation" }>;
export type ScriptUnitSource = Extract<UnitSource, { kind: "script" }>;
export type AssessmentUnitSource = Extract<UnitSource, { kind: "assessment" }>;
export type UnitDraw = AssessmentUnitSource["draws"][number];
export type UnitLesson = z.infer<typeof lessonSchema>;
export type ScriptLetter = ScriptUnitSource["letters"][number];
export type ScriptWord = ScriptUnitSource["words"][number];

/** Narrows a unit (source or parsed) to a writing unit. */
export function isScriptUnit<T extends { kind: string }>(unit: T): unit is Extract<T, { kind: "script" }> {
  return unit.kind === "script";
}

/** Narrows a unit (source or resolved) to the end-of-path assessment. */
export function isAssessmentUnit<T extends { kind: string }>(unit: T): unit is Extract<T, { kind: "assessment" }> {
  return unit.kind === "assessment";
}

/** Languages written in a non-Latin script: the only ones whose lines may carry a transliteration. */
export const NON_LATIN_LANGUAGES: readonly string[] = ["ru", "uk", "el", "ar", "zh", "ja", "ko"];

/** The version of a unit: 12 hex characters of the SHA-256 of its canonical source. */
export const unitVersionSchema = z.string().regex(/^[0-9a-f]{12}$/, "Expected 12 hex characters");
export type UnitVersion = z.infer<typeof unitVersionSchema>;

/** A bilan once the registry has resolved its draws (`j4-pr3.md` §2.1). */
export type ResolvedAssessmentSource = z.output<typeof assessmentUnitSourceSchema> & {
  /** The drawn items, ids rewritten `<nn>-<itemId>` (`nn` = number of the source unit). */
  items: UnitItem[];
  /** One lesson with one step, the test. */
  lessons: UnitLesson[];
  test: { itemIds: string[]; passScore: 8 };
  /** Rewritten item id to the unit it was drawn from (the fail screen lists those units). */
  drawnFrom: Record<string, UnitId>;
};

/** A source and its content hash: what the registry serves. */
export type Unit = (Exclude<ParsedUnitSource, { kind: "assessment" }> | ResolvedAssessmentSource) & { version: UnitVersion };
export type SituationUnit = Extract<Unit, { kind: "situation" }>;
export type ScriptUnit = Extract<Unit, { kind: "script" }>;
export type AssessmentUnit = Extract<Unit, { kind: "assessment" }>;
