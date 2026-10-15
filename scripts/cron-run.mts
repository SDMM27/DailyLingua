/**
 * Runs a scheduled job by hand, like the scheduled job route does (same task, same cron_runs journal),
 * without HTTP and without CRON_SECRET.
 *
 *   npm run cron:run -- ingest      fetches the feeds
 *   npm run cron:run -- missions    generates the missions of the users who are due
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env.local), and
 * ANTHROPIC_API_KEY for missions unless MISSION_GENERATOR=template.
 * Exit code 0 when ok, 2 when partial, 1 on error.
 */
import { createClient } from "@supabase/supabase-js";
import { readContentLicensePolicy } from "@/lib/content/policy";
import { createSupabaseContentStore } from "@/lib/content/supabase-store";
import { createMissionPreparer } from "@/lib/generation/preparer";
import { createSupabaseDueUsers, runDailyMissions } from "@/lib/jobs/daily-missions";
import { runIngestJob } from "@/lib/jobs/ingest-job";
import { createSupabaseCronRunLog, runLoggedJob, type CronJob, type CronRunResult } from "@/lib/jobs/run-log";
import type { Database } from "@/lib/supabase/database.types";

const JOBS: CronJob[] = ["ingest", "missions"];
// Same budget as the route: 60 s under its maxDuration of 300 s.
const MISSIONS_DEADLINE_MS = 240_000;

const job = process.argv[2] as CronJob | undefined;
if (!job || !JOBS.includes(job)) {
  console.error(`Usage : npm run cron:run -- <${JOBS.join("|")}>`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (voir .env.example).");
  process.exit(1);
}

const client = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
let ingestReport: Awaited<ReturnType<typeof runIngestJob>>["report"] | undefined;

const task = async (): Promise<CronRunResult> => {
  if (job === "ingest") {
    const result = await runIngestJob({
      store: createSupabaseContentStore(client),
      policy: readContentLicensePolicy(),
    });
    ingestReport = result.report;
    return { status: result.status, stats: result.stats };
  }
  const { status, ...stats } = await runDailyMissions({
    listDueUsers: createSupabaseDueUsers(client),
    prepare: createMissionPreparer(client, { log: console.warn }),
    deadlineMs: MISSIONS_DEADLINE_MS,
    log: console.warn,
  });
  return { status, stats };
};

try {
  const result = await runLoggedJob(job, createSupabaseCronRunLog(client), task, console.warn);
  if (ingestReport) {
    console.table(
      ingestReport.sources.map((s) => ({
        source: s.key,
        statut: s.status,
        "items du flux": s.fetched,
        retenus: s.kept,
        nouveaux: s.inserted,
        écartés: Object.entries(s.rejected)
          .map(([reason, count]) => `${reason}:${count}`)
          .join(" "),
        erreur: s.error ?? "",
      })),
    );
  }
  console.log(`Job ${job} : ${result.status}`);
  console.table(result.stats);
  process.exitCode = result.status === "ok" ? 0 : result.status === "partial" ? 2 : 1;
} catch (error) {
  console.error(`Job ${job} en erreur : ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
