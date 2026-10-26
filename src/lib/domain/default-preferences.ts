import type { LanguageGoal, Preferences } from "@/lib/schemas/preferences";
import { DEFAULT_TIME_ZONE } from "./dates";

/** Topics and content types given to a language added without a first language to copy from. */
export const DEFAULT_LANGUAGE_TASTES: Pick<LanguageGoal, "topics" | "contentTypes"> = {
  topics: ["société", "culture"],
  contentTypes: ["article", "podcast", "video"],
};

/**
 * Starting point of the first-run screen. `goals` is empty on purpose: the user has to choose
 * their languages (the saved preferences require at least one).
 */
export const ONBOARDING_DEFAULTS: Preferences = {
  goals: [],
  dailyMinutes: 30,
  difficulty: "matched",
  generationTime: "07:00",
  timeZone: DEFAULT_TIME_ZONE,
  showStreak: true,
};
