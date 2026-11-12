import { canLearn, isTargetLanguage, isValidNativeLanguage, isValidTimeZone } from "@dailylingua/core";
import { startLevelSchema } from "@dailylingua/schemas";
import { z } from "zod";

export const DAILY_MINUTES_OPTIONS = [10, 15, 20, 30] as const;
export const DEFAULT_DAILY_MINUTES = 15;

/** What the installation collects: four decisions, plus the time zone read from the browser. */
export const completeOnboardingSchema = z
  .object({
    nativeLanguage: z.string().refine(isValidNativeLanguage),
    targetLanguage: z.string().refine(isTargetLanguage),
    startLevel: startLevelSchema,
    dailyMinutes: z.number().refine((minutes) => (DAILY_MINUTES_OPTIONS as readonly number[]).includes(minutes)),
    timeZone: z.string().refine(isValidTimeZone),
  })
  .refine((value) => canLearn(value.nativeLanguage, value.targetLanguage));

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
