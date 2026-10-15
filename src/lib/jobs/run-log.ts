import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

export type CronJob = "ingest" | "missions";

export interface CronRunResult {
  status: "ok" | "partial" | "error";
  /** Counters only: no user data, no secrets. */
  stats: Record<string, number | string | null>;
  error?: string;
}

/** Journal of job runs. Implemented on the `cron_runs` table; faked in tests. */
export interface CronRunLog {
  /** Opens a "running" row and returns its id (null when nothing could be recorded). */
  start(job: CronJob): Promise<string | null>;
  finish(id: string, result: CronRunResult): Promise<void>;
}

const MAX_ERROR_LENGTH = 500;

export function createSupabaseCronRunLog(client: SupabaseClient<Database>): CronRunLog {
  return {
    async start(job) {
      const { data, error } = await client.from("cron_runs").insert({ job }).select("id").single();
      if (error) throw new Error(`cron_runs : ${error.message}`);
      return data.id;
    },

    async finish(id, result) {
      const { error } = await client
        .from("cron_runs")
        .update({
          status: result.status,
          stats: result.stats as NonNullable<Json>,
          error: result.error?.slice(0, MAX_ERROR_LENGTH) ?? null,
          finished_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw new Error(`cron_runs : ${error.message}`);
    },
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs `task` between a start and a finish row of the journal. A journal failure never prevents
 * or fails the task (it is only reported); a task exception is recorded as "error" and rethrown.
 */
export async function runLoggedJob(
  job: CronJob,
  log: CronRunLog,
  task: () => Promise<CronRunResult>,
  report: (message: string) => void = () => {},
): Promise<CronRunResult> {
  let runId: string | null = null;
  try {
    runId = await log.start(job);
  } catch (error) {
    report(`Journal (${job}) : début non enregistré : ${messageOf(error)}`);
  }

  const finish = async (result: CronRunResult) => {
    if (!runId) return;
    try {
      await log.finish(runId, result);
    } catch (error) {
      report(`Journal (${job}) : fin non enregistrée : ${messageOf(error)}`);
    }
  };

  let result: CronRunResult;
  try {
    result = await task();
  } catch (error) {
    await finish({ status: "error", stats: {}, error: messageOf(error) });
    throw error;
  }
  await finish(result);
  return result;
}
