import { z } from "zod";
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

export const languageGoalSchema = z.object({
  language: languageSchema,
  level: cefrLevelSchema,
  targetLevel: cefrLevelSchema,
  focus: z.string().trim().max(200),
  /** Relative share of the daily time; weights are normalised across languages. */
  weight: z.number().int().min(1).max(10),
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
  topics: z.array(topicSchema).min(1, "Choisis au moins un sujet"),
  contentTypes: z.array(contentTypeSchema).min(1, "Choisis au moins un type de contenu"),
  difficulty: difficultyModeSchema,
  /** HH:mm, local time in `timeZone`. */
  generationTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format HH:mm attendu"),
  timeZone: z.string().min(1),
});
export type Preferences = z.infer<typeof preferencesSchema>;
