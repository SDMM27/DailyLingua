import { z } from "zod";
import { dateKeySchema, languageCodeSchema } from "./common";

export const immersionKinds = ["video", "audio", "reading", "conversation", "other"] as const;
export const immersionKind = z.enum(immersionKinds);
export type ImmersionKind = z.infer<typeof immersionKind>;

export const IMMERSION_MAX_MINUTES = 600;

/** Time spent in a language outside the app, declared by the learner. */
export const immersionEntryInput = z.strictObject({
  language: languageCodeSchema,
  day: dateKeySchema,
  minutes: z.int().min(1).max(IMMERSION_MAX_MINUTES),
  kind: immersionKind,
});
export type ImmersionEntryInput = z.infer<typeof immersionEntryInput>;
