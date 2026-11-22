import type { DateKey } from "@dailylingua/schemas";
import { appSchema, type AppClient } from "./client";
import { unwrap } from "./query";

/** Both reads are scoped to the signed-in owner by RLS. */
export async function getLearningProgress(client: AppClient, day: DateKey) {
  const database = appSchema(client);
  const [days, streaks] = await Promise.all([
    database.from("learning_day").select("xp_verified").eq("day", day).maybeSingle(),
    database.from("streak_state").select("current,best,freezes,mode").maybeSingle(),
  ]);
  return { xp: unwrap(days)?.xp_verified ?? 0, streak: unwrap(streaks) };
}
