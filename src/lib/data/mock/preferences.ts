import { DEFAULT_TIME_ZONE } from "@/lib/domain/dates";
import type { Preferences } from "@/lib/schemas/preferences";

export const MOCK_PREFERENCES: Preferences = {
  goals: [
    {
      language: "ru",
      level: "B2",
      targetLevel: "C1",
      focus: "Compréhension fine, registre soutenu, connecteurs écrits",
      purpose: "general",
      weight: 2,
      topics: ["société", "culture", "histoire", "sciences", "cinéma"],
      contentTypes: ["article", "podcast", "interview"],
    },
    {
      language: "it",
      level: "B1",
      targetLevel: "B2",
      focus: "Vocabulaire actif, expression orale, spontanéité",
      purpose: "conversational",
      weight: 1,
      topics: ["société", "culture", "histoire", "sciences", "cinéma"],
      contentTypes: ["article", "podcast", "interview"],
    },
  ],
  dailyMinutes: 30,
  difficulty: "matched",
  generationTime: "07:00",
  timeZone: DEFAULT_TIME_ZONE,
};
