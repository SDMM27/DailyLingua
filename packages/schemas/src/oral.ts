import { z } from "zod";
import { l10nSchema, unitIdSchema, unitVersionSchema } from "./unit";

/** Longest id of an oral sentence: `<unitId>#<lineId|keyPhraseId>` (`j5-pr1-atelier-oral.md` §1). */
export const MAX_ORAL_SENTENCE_ID_CHARS = 80;

/** What the oral workshop says or dictates: a line of a dialogue or a key phrase of a published situation unit. */
export const oralSentenceSchema = z.strictObject({
  id: z.string().min(3).max(MAX_ORAL_SENTENCE_ID_CHARS),
  unitId: unitIdSchema,
  unitVersion: unitVersionSchema,
  /** Order of the unit in its language's path, for sorting. */
  unitOrder: z.number().int().min(1),
  /** Language of the unit, the prefix of its id. */
  language: z.string().regex(/^[a-z]{2,3}$/),
  text: z.string().min(1),
  translation: l10nSchema,
  audio: z.string().min(1),
  /** Words of `text` (`countWords`). */
  words: z.number().int().min(1),
});
export type OralSentence = z.infer<typeof oralSentenceSchema>;
