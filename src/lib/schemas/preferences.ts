import { z } from "zod";
import { isValidTimeZone } from "@/lib/domain/dates";
import { WEEKDAY_NAMES } from "@/lib/domain/labels";
import { ALL_WEEKDAYS, minutesOnWeekday } from "@/lib/domain/schedule";
import { MAX_DAILY_MINUTES, MIN_LANGUAGE_MINUTES } from "@/lib/domain/time-budget";
import { cefrLevelSchema, contentTypeSchema, languageSchema } from "./common";

export const TOPICS = [
  "société",
  "culture",
  "histoire",
  "sciences",
  "économie",
  "politique",
  "littérature",
  "cinéma",
  "technologie",
  "voyage",
  "gastronomie",
  "sport",
] as const;
export const topicSchema = z.enum(TOPICS);
export type Topic = z.infer<typeof topicSchema>;

export const DIFFICULTY_MODES = ["comfortable", "matched", "challenge"] as const;
export const difficultyModeSchema = z.enum(DIFFICULTY_MODES);
export type DifficultyMode = z.infer<typeof difficultyModeSchema>;

export const LANGUAGE_PURPOSES = ["general", "conversational", "professional", "travel", "exam"] as const;
export const languagePurposeSchema = z.enum(LANGUAGE_PURPOSES);
export type LanguagePurpose = z.infer<typeof languagePurposeSchema>;

export const languageGoalSchema = z.object({
  language: languageSchema,
  level: cefrLevelSchema,
  targetLevel: cefrLevelSchema,
  focus: z.string().trim().max(200),
  /** Why the learner studies this language; missing = general, so rows/payloads from before the field still parse. */
  purpose: languagePurposeSchema.default("general"),
  /**
   * Minutes per day for this language. The field keeps its historical name `weight` (storage, RPC):
   * it used to be a relative share, and `splitBudget` still accepts it as one.
   */
  weight: z
    .number()
    .int()
    .min(MIN_LANGUAGE_MINUTES, "Au moins 10 minutes par langue")
    .max(MAX_DAILY_MINUTES, "Au plus 120 minutes par jour au total"),
  /**
   * ISO weekdays (1 = Monday … 7 = Sunday) on which the language is worked, at least one, no
   * duplicate. Missing = every day, so rows/payloads from before the field still parse.
   */
  days: z
    .array(z.number().int().min(1).max(7))
    .min(1, "Choisis au moins un jour")
    .refine((days) => new Set(days).size === days.length, { message: "Chaque jour ne peut apparaître qu'une fois" })
    .default([...ALL_WEEKDAYS]),
  /** Interests for this language (French labels); each language has its own. */
  topics: z.array(topicSchema).min(1, "Choisis au moins un sujet"),
  /** Formats of content wanted for this language. */
  contentTypes: z.array(contentTypeSchema).min(1, "Choisis au moins un type de contenu"),
});
export type LanguageGoal = z.infer<typeof languageGoalSchema>;

export const preferencesSchema = z
  .object({
    goals: z
      .array(languageGoalSchema)
      .min(1, "Choisis au moins une langue")
      .max(4)
      .refine((goals) => new Set(goals.map((g) => g.language)).size === goals.length, {
        message: "Chaque langue ne peut apparaître qu'une fois",
      }),
    /**
     * No longer entered: it is the total of the busiest weekday (the languages' minutes of that
     * day), recomputed on save (and by the `save_preferences` RPC). Kept for code that still reads it.
     */
    dailyMinutes: z.number().int().min(10).max(120),
    difficulty: difficultyModeSchema,
    /** HH:mm, local time in `timeZone`. */
    generationTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format HH:mm attendu"),
    timeZone: z.string().min(1).refine(isValidTimeZone, "Fuseau horaire inconnu"),
    /** Day streak shown on the home page; missing = shown, so data from before the field still parses. */
    showStreak: z.boolean().default(true),
  })
  .superRefine((prefs, ctx) => {
    // A day may carry any number of languages, as long as they fit in 120 minutes together.
    const over = ALL_WEEKDAYS.filter((weekday) => minutesOnWeekday(prefs.goals, weekday) > MAX_DAILY_MINUTES);
    if (over.length === 0) return;
    const names = over.length < ALL_WEEKDAYS.length ? ` (${over.map((d) => WEEKDAY_NAMES[d - 1]).join(", ")})` : "";
    ctx.addIssue({ code: "custom", message: `Au plus 120 minutes par jour au total${names}`, path: ["goals"] });
  });
export type Preferences = z.infer<typeof preferencesSchema>;
