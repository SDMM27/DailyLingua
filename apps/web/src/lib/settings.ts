import { isValidNativeLanguage, isValidTimeZone } from "@dailylingua/core";
import { timeOfDaySchema } from "@dailylingua/schemas";
import { uiLocales } from "@dailylingua/i18n";
import { z } from "zod";

/** The learning part of the settings: mother tongue, time zone and the optional reminder. */
export const learningSettingsSchema = z.object({
  nativeLanguage: z.string().refine(isValidNativeLanguage),
  timeZone: z.string().refine(isValidTimeZone),
  // An empty field means no reminder.
  reminderTime: z.union([z.literal("").transform(() => null), timeOfDaySchema]),
});

export type LearningSettings = z.infer<typeof learningSettingsSchema>;

export const uiLanguageSchema = z.enum(uiLocales);
