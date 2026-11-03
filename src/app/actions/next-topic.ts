"use server";

import { revalidatePath } from "next/cache";
import { UserFacingError } from "@/lib/data/errors";
import { nextWorkedDate } from "@/lib/domain/schedule";
import { setNextTopicInputSchema } from "@/lib/schemas/mission-request";
import type { ActionResult } from "./result";
import { runAction } from "./shared";

/**
 * « Demain, plutôt » : the domain of the next mission of a language. The date is never read from
 * the client: it is the next day this language is worked, from the saved preferences and the
 * user's today. `topic` null goes back to « Au hasard de mes sujets ».
 */
export async function setNextTopic(input: unknown): Promise<ActionResult> {
  return runAction(setNextTopicInputSchema, input, async (repo, { language, topic }) => {
    const [preferences, today] = await Promise.all([repo.getPreferences(), repo.getToday()]);
    const goal = preferences?.goals.find((g) => g.language === language);
    if (!goal) throw new UserFacingError("Cette langue ne fait pas partie de tes langues.");
    await repo.setMissionRequest({ language, date: nextWorkedDate(goal.days, today), topic });
    revalidatePath("/");
    revalidatePath("/mission");
  });
}
