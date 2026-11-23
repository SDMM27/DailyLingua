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
export const CLEARED_VOICES = ["ru_RU-denis-medium", "ru_RU-dmitri-medium", "it_IT-paola-medium"] as const;
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
export const unitSchema = z.strictObject({
  id: unitIdSchema,
  language: languageCodeSchema,
  level: z.enum(["A0", "A1"]),
  order: z.number().int().min(1),
  kind: z.enum(["situation", "script"]),
  title: l10nSchema,
  situation: l10nSchema,
  minutes: z.number().int().min(1),
  canDo: z.array(z.strictObject({ id: idSchema, text: l10nSchema })).min(2).max(3),
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
  items: z.array(unitItemSchema).min(1),
  lessons: z.array(lessonSchema).length(3),
  test: z.strictObject({ itemIds: z.array(idSchema).length(10), passScore: z.literal(8) }),
  conversation: z.strictObject({ turns: z.array(turnSchema).min(1) }),
  /** AI review status; the only one (an agent never records a human review). */
  aiReview: z.strictObject({ reviewedOn: dateKeySchema, passes: z.number().int().min(2), arbiter: textSchema }).nullable(),
});
/** What an author writes (`transliteration` may be left out); parsing fills it with null. */
export type UnitSource = z.input<typeof unitSchema>;
/** A parsed unit source. */
export type ParsedUnitSource = z.output<typeof unitSchema>;

/** Languages written in a non-Latin script: the only ones whose lines may carry a transliteration. */
export const NON_LATIN_LANGUAGES: readonly string[] = ["ru", "uk", "el", "ar", "zh", "ja", "ko"];

/** The version of a unit: 12 hex characters of the SHA-256 of its canonical source. */
export const unitVersionSchema = z.string().regex(/^[0-9a-f]{12}$/, "Expected 12 hex characters");
export type UnitVersion = z.infer<typeof unitVersionSchema>;

/** A source and its content hash: what the registry serves. */
export type Unit = ParsedUnitSource & { version: UnitVersion };
