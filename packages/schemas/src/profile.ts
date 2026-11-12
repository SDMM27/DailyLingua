import { z } from "zod";
import { cefrLevelSchema, isoInstantSchema, languageCodeSchema, skillSchema, timeOfDaySchema } from "./common";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const profileSchema = z.object({
  userId: z.uuid(),
  nativeLanguage: languageCodeSchema,
  uiLanguage: languageCodeSchema,
  /** IANA zone name. */
  timeZone: z.string().min(1),
  reminderTime: timeOfDaySchema.nullable(),
  gameSettings: jsonObjectSchema,
  isGuest: z.boolean(),
  legacyMigratedAt: isoInstantSchema.nullable(),
  createdAt: isoInstantSchema,
  updatedAt: isoInstantSchema,
});
export type Profile = z.infer<typeof profileSchema>;

/** ISO weekdays: 1 = Monday … 7 = Sunday. */
const studyDaysSchema = z
  .array(z.number().int().min(1).max(7))
  .min(1)
  .refine((days) => new Set(days).size === days.length, "Duplicate weekday");

export const enrollmentSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  language: languageCodeSchema,
  purpose: z.string().nullable(),
  targetLevel: cefrLevelSchema.nullable(),
  dailyMinutes: z.number().int().min(5).max(120),
  days: studyDaysSchema,
  focus: jsonObjectSchema,
  position: z.number().int().min(0),
  active: z.boolean(),
  createdAt: isoInstantSchema,
  updatedAt: isoInstantSchema,
});
export type Enrollment = z.infer<typeof enrollmentSchema>;

export const skillEstimateSources = ["legacy", "placement", "assessment", "estimated", "declared"] as const;
export const skillEstimateSourceSchema = z.enum(skillEstimateSources);
export type SkillEstimateSource = z.infer<typeof skillEstimateSourceSchema>;

export const skillEstimateSchema = z.object({
  userId: z.uuid(),
  language: languageCodeSchema,
  skill: skillSchema,
  /** Continuous scale: 0 = A0, 1 = start of A1 … 6 = start of C2, 7 = end of C2. */
  levelValue: z.number().min(0).max(7),
  uncertainty: z.number().positive(),
  source: skillEstimateSourceSchema,
  updatedAt: isoInstantSchema,
});
export type SkillEstimate = z.infer<typeof skillEstimateSchema>;

export const saveProfileInputSchema = z.object({
  nativeLanguage: languageCodeSchema,
  uiLanguage: languageCodeSchema,
  timeZone: z.string().min(1),
  reminderTime: timeOfDaySchema.nullable(),
});
export type SaveProfileInput = z.infer<typeof saveProfileInputSchema>;
