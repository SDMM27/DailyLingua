import { DEFAULT_TIME_ZONE } from "@/lib/domain/dates";
import type { Preferences } from "@/lib/schemas/preferences";

export const MOCK_PREFERENCES: Preferences = {
  goals: [
    {
      language: "ru",
      level: "B2",
      targetLevel: "C1",
      focus: "Compréhension fine, registre soutenu, connecteurs écrits",
      weight: 2,
    },
    {
      language: "it",
      level: "B1",
      targetLevel: "B2",
      focus: "Vocabulaire actif, expression orale, spontanéité",
      weight: 1,
    },
  ],
  dailyMinutes: 30,
  topics: ["société", "culture", "histoire", "sciences", "cinéma"],
  contentTypes: ["article", "podcast", "interview"],
  difficulty: "matched",
  generationTime: "07:00",
  timeZone: DEFAULT_TIME_ZONE,
};
