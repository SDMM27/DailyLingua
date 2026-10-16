import { z } from "zod";
import { isValidTimeZone } from "@/lib/domain/dates";
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
  /** Relative share of the daily time; weights are normalised across languages. */
  weight: z.number().int().min(1).max(10),
  /** Interests for this language (French labels); each language has its own. */
  topics: z.array(topicSchema).min(1, "Choisis au moins un sujet"),
  /** Formats of content wanted for this language. */
  contentTypes: z.array(contentTypeSchema).min(1, "Choisis au moins un type de contenu"),
});
export type LanguageGoal = z.infer<typeof languageGoalSchema>;

export const preferencesSchema = z.object({
  goals: z
    .array(languageGoalSchema)
    .min(1, "Choisis au moins une langue")
    .max(4)
    .refine((goals) => new Set(goals.map((g) => g.language)).size === goals.length, {
      message: "Chaque langue ne peut apparaître qu'une fois",
    }),
  dailyMinutes: z.number().int().min(10).max(120),
  difficulty: difficultyModeSchema,
  /** HH:mm, local time in `timeZone`. */
  generationTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format HH:mm attendu"),
  timeZone: z.string().min(1).refine(isValidTimeZone, "Fuseau horaire inconnu"),
});
export type Preferences = z.infer<typeof preferencesSchema>;
