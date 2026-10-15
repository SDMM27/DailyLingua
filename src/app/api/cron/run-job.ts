import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseCronRunLog,
  runLoggedJob,
  type CronJob,
  type CronRunLog,
  type CronRunResult,
} from "@/lib/jobs";
import { authorizeCronRequest } from "@/lib/security/cron-secret";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

type AdminClient = SupabaseClient<Database>;

/** Everything the handler reads from its surroundings, replaceable in tests. */
export interface CronHandlerDeps {
  env?: Record<string, string | undefined>;
  getSupabaseEnv?: () => { SUPABASE_SERVICE_ROLE_KEY?: string } | null;
  createAdminClient?: () => AdminClient;
  createRunLog?: (admin: AdminClient) => CronRunLog;
  warn?: (message: string) => void;
  error?: (message: string) => void;
}

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/**
 * Shared body of the scheduled job routes. The secret is checked first, before anything else is
 * read or created. Responses never carry a stack or a raw error message (they go in the logs).
 */
export async function handleCronRequest(
  request: Request,
  job: CronJob,
  task: (admin: AdminClient) => Promise<CronRunResult>,
  deps: CronHandlerDeps = {},
): Promise<Response> {
  const {
    env = process.env,
    getSupabaseEnv: readEnv = getSupabaseEnv,
    createAdminClient = createSupabaseAdminClient,
    createRunLog = createSupabaseCronRunLog,
    warn = console.warn,
    error = console.error,
  } = deps;

  const authorization = authorizeCronRequest(request.headers.get("authorization"), env);
  if (!authorization.ok) return json({ error: authorization.message }, authorization.status);

  try {
    const supabaseEnv = readEnv();
    if (!supabaseEnv) return json({ status: "skipped", reason: "Supabase non configuré" });
    if (!supabaseEnv.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "SUPABASE_SERVICE_ROLE_KEY est requis pour les tâches planifiées." }, 503);
    }

    const admin = createAdminClient();
    const result = await runLoggedJob(job, createRunLog(admin), () => task(admin), warn);
    return json({ job, status: result.status, stats: result.stats });
  } catch (cause) {
    error(`Tâche planifiée (${job}) : ${cause instanceof Error ? cause.message : String(cause)}`);
    return json({ job, status: "error", error: "La tâche a échoué." }, 500);
  }
}
