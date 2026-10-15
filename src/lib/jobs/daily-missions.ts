import type { SupabaseClient } from "@supabase/supabase-js";
import type { GenerateMissionOutcome } from "@/lib/generation/generate-mission";
import { dateKeySchema, type DateKey } from "@/lib/schemas/common";
import type { Database } from "@/lib/supabase/database.types";

export interface DueUser {
  userId: string;
  date: DateKey;
}

export interface DailyMissionsInput {
  listDueUsers: (now: Date, limit: number) => Promise<DueUser[]>;
  prepare: (userId: string, date: DateKey) => Promise<GenerateMissionOutcome>;
  now?: () => Date;
  /** Total time budget from the start of the run; no new user is started once it is over. */
  deadlineMs: number;
  /** Default 3. */
  concurrency?: number;
  /** Default 500. */
  limit?: number;
  log?: (message: string) => void;
}

export interface DailyMissionsReport {
  status: "ok" | "partial";
  due: number;
  ready: number;
  pending: number;
  failed: number;
  noContent: number;
  noPreferences: number;
  /** Exceptions thrown by `prepare` (it should return a "failed" outcome instead). */
  errors: number;
  /** Not started for lack of time. */
  skipped: number;
  durationMs: number;
}

/**
 * Generates the mission of every user who is due. One user's failure never stops the others, and
 * the run stops starting users once the deadline has passed (the ones in progress finish). Logs
 * carry ids and short reasons only: no e-mail, no mission text.
 */
export async function runDailyMissions(input: DailyMissionsInput): Promise<DailyMissionsReport> {
  const { listDueUsers, prepare, deadlineMs, concurrency = 3, limit = 500, log = () => {} } = input;
  const now = input.now ?? (() => new Date());
  const startedAt = now().getTime();
  const due = await listDueUsers(now(), limit);

  const report: DailyMissionsReport = {
    status: "ok",
    due: due.length,
    ready: 0,
    pending: 0,
    failed: 0,
    noContent: 0,
    noPreferences: 0,
    errors: 0,
    skipped: 0,
    durationMs: 0,
  };

  let next = 0;
  const workers = Array.from({ length: Math.min(Math.max(concurrency, 1), due.length) }, async () => {
    while (next < due.length) {
      if (now().getTime() - startedAt >= deadlineMs) return;
      const { userId, date } = due[next++];
      try {
        const outcome = await prepare(userId, date);
        switch (outcome.status) {
          case "ready":
            report.ready++;
            break;
          case "pending":
            report.pending++;
            break;
          case "failed":
            report.failed++;
            log(`Mission ${outcome.missionId ?? "?"} en échec : ${outcome.reason}`);
            break;
          case "no-content":
            report.noContent++;
            break;
          case "no-preferences":
            report.noPreferences++;
            break;
        }
      } catch (error) {
        report.errors++;
        log(`Utilisateur ${userId} (${date}) : exception : ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  await Promise.all(workers);

  report.skipped = due.length - next;
  if (report.skipped > 0) log(`Échéance atteinte : ${report.skipped} utilisateur(s) non traité(s).`);
  report.status = report.skipped > 0 || report.failed > 0 || report.errors > 0 ? "partial" : "ok";
  report.durationMs = now().getTime() - startedAt;
  return report;
}

/** `listDueUsers` backed by the `list_due_mission_users` function (service role only). */
export function createSupabaseDueUsers(client: SupabaseClient<Database>): DailyMissionsInput["listDueUsers"] {
  return async (now, limit) => {
    const { data, error } = await client.rpc("list_due_mission_users", { p_now: now.toISOString(), p_limit: limit });
    if (error) throw new Error(`Supabase (utilisateurs à servir) : ${error.message}`);
    return data.map((row) => ({ userId: row.user_id, date: dateKeySchema.parse(row.mission_date) }));
  };
}
