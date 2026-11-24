import { listEnrollments, listSkillEstimates } from "@dailylingua/data";
import { cache } from "react";
import { getRequestClient, getSessionUser } from "@/lib/session";
import { hasPath } from "./path";
import { visibleUnitsFor } from "./visibility";

/**
 * The language whose path the signed-in learner may open (the active language, a beginner level, at least one visible
 * unit), or null. The tab bar and the Today card rely on it; read once per request.
 */
export const getPathLanguage = cache(async (): Promise<string | null> => {
  if (!(await getSessionUser())) return null;
  try {
    const client = await getRequestClient();
    const enrollment = (await listEnrollments(client))[0];
    if (!enrollment) return null;
    const estimates = await listSkillEstimates(client, enrollment.language);
    return hasPath(estimates, visibleUnitsFor(enrollment.language)) ? enrollment.language : null;
  } catch {
    // The tab is a convenience: without it the three other tabs still work.
    return null;
  }
});
