import type { DateKey } from "@dailylingua/schemas";
import { appSchema, type AppClient } from "./client";
import { listSkillEstimates } from "./enrollments";
import { unwrapRows } from "./query";
import { getUnitProgress } from "./unit-progress";

export type ProgressPilotLanguage = "ru" | "it";

/** Loads language-specific evidence and account-wide study days with the signed-in client. */
export async function getProgressOverview(
  client: AppClient,
  userId: string,
  language: ProgressPilotLanguage,
  firstDay: DateKey,
  lastDay: DateKey,
) {
  const [skills, units, days] = await Promise.all([
    listSkillEstimates(client, language),
    getUnitProgress(client, userId, language),
    appSchema(client)
      .from("learning_day")
      .select("day")
      .eq("user_id", userId)
      .gte("day", firstDay)
      .lte("day", lastDay)
      .not("first_activity_at", "is", null)
      .order("day"),
  ]);

  return {
    skills,
    passedUnits: units.filter((unit) => unit.passedAt !== null),
    studyDays: unwrapRows(days).map((day) => day.day),
  };
}
