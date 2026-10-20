import { z } from "zod";
import { dateKeySchema, languageSchema } from "./common";
import { writingFeedbackSchema } from "./writing-feedback";

/** A written production of a past mission, with its review when there is one ("Mes productions"). */
export const productionEntrySchema = z.object({
  sessionId: z.string().min(1),
  /** Day of the mission. */
  date: dateKeySchema,
  language: languageSchema,
  title: z.string().min(1),
  sourceName: z.string().min(1),
  url: z.url(),
  /** The writing task the text answers, when the mission has it. */
  task: z.string().min(1).optional(),
  /** The reviewed text when there is a review, the saved draft otherwise. */
  body: z.string(),
  feedback: writingFeedbackSchema.optional(),
  /** Indexes of the corrections of the review already kept as review cards. */
  cardIndexes: z.array(z.number().int().min(0)),
});
export type ProductionEntry = z.infer<typeof productionEntrySchema>;
