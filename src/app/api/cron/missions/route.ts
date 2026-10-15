import { handleCronRequest } from "../run-job";
import { createMissionPreparer } from "@/lib/generation/preparer";
import { createSupabaseDueUsers, runDailyMissions } from "@/lib/jobs";

export const maxDuration = 300;

/** Stops starting new users after 240 s, leaving 60 s under maxDuration for the ones in progress. */
const DEADLINE_MS = 240_000;

/** Generates the missions of the users who are due, every hour (see .github/workflows/scheduled-jobs.yml). */
export async function GET(request: Request) {
  return handleCronRequest(request, "missions", async (admin) => {
    const { status, ...stats } = await runDailyMissions({
      listDueUsers: createSupabaseDueUsers(admin),
      prepare: createMissionPreparer(admin, { log: console.warn }),
      deadlineMs: DEADLINE_MS,
      log: console.warn,
    });
    return { status, stats };
  });
}
