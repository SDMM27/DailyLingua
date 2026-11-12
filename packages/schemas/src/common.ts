import { z } from "zod";

export const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const cefrLevelSchema = z.enum(cefrLevels);
export type CefrLevel = z.infer<typeof cefrLevelSchema>;

/** ISO 639 code (2 or 3 lowercase letters). Any language is a valid mother tongue; only some can be studied. */
export const languageCodeSchema = z.string().regex(/^[a-z]{2,3}$/, "Expected a 2 or 3 letter lowercase ISO 639 code");
export type LanguageCode = z.infer<typeof languageCodeSchema>;

/** Calendar day in YYYY-MM-DD, always interpreted in the user's time zone. */
export const dateKeySchema = z.iso.date();
export type DateKey = z.infer<typeof dateKeySchema>;

/** Instant as an ISO 8601 string (the form the database and the wire use). */
export const isoInstantSchema = z.iso.datetime({ offset: true });
export type IsoInstant = z.infer<typeof isoInstantSchema>;

/** Wall-clock time of day, `HH:mm`. */
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm");
export type TimeOfDay = z.infer<typeof timeOfDaySchema>;

export const skills = ["reading", "listening", "writing", "speaking"] as const;
export const skillSchema = z.enum(skills);
export type Skill = z.infer<typeof skillSchema>;

/** Text with the language it is written in: replaces every `*_fr`-style field. */
export const localizedTextSchema = z.object({
  text: z.string(),
  lang: languageCodeSchema,
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;
