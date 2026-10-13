import type { Preferences } from "@/lib/schemas/preferences";
import { DEFAULT_TIME_ZONE } from "./dates";

/**
 * Starting point of the first-run screen. `goals` is empty on purpose: the user has to choose
 * their languages (the saved preferences require at least one).
 */
export const ONBOARDING_DEFAULTS: Preferences = {
  goals: [],
  dailyMinutes: 30,
  topics: ["société", "culture"],
  contentTypes: ["article", "podcast"],
  difficulty: "matched",
  generationTime: "07:00",
  timeZone: DEFAULT_TIME_ZONE,
};
