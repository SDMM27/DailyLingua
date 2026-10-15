import { authorizeCronRequest } from "@/lib/security/cron-secret";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Longest wait for the database check before the app is reported unhealthy. */
export const DATABASE_TIMEOUT_MS = 5_000;

/** Everything the handler reads from its surroundings, replaceable in tests. */
export interface HealthHandlerDeps {
  env?: Record<string, string | undefined>;
  getSupabaseEnv?: () => unknown;
  /** Resolves when the database answers, rejects otherwise. */
  checkDatabase?: () => Promise<void>;
  timeoutMs?: number;
  now?: () => Date;
  error?: (message: string) => void;
}

async function pingDatabase(): Promise<void> {
  const { error } = await createSupabaseAdminClient().from("languages").select("code").limit(1);
  if (error) throw new Error(error.message);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`délai dépassé (${ms} ms)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Liveness probe. Public: it only tells the mode, the deployed commit and the time.
 * The database is checked only for a request carrying a valid `Bearer <CRON_SECRET>`, so the public
 * route cannot be used to hit the database. Error details go in the server logs, never the response.
 */
export async function handleHealthRequest(request: Request, deps: HealthHandlerDeps = {}): Promise<Response> {
  const {
    env = process.env,
    getSupabaseEnv: readEnv = getSupabaseEnv,
    checkDatabase = pingDatabase,
    timeoutMs = DATABASE_TIMEOUT_MS,
    now = () => new Date(),
    error = console.error,
  } = deps;

  const body: Record<string, unknown> = {
    ok: true,
    mode: readEnv() ? "supabase" : "demo",
    commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    time: now().toISOString(),
  };

  let status = 200;
  if (authorizeCronRequest(request.headers.get("authorization"), env).ok) {
    if (body.mode === "demo") {
      body.database = "skipped";
    } else {
      try {
        await withTimeout(checkDatabase(), timeoutMs);
        body.database = "ok";
      } catch (cause) {
        error(`Santé : base de données en erreur : ${cause instanceof Error ? cause.message : String(cause)}`);
        body.database = "error";
        body.ok = false;
        status = 503;
      }
    }
  }

  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
