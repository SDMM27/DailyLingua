import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dateKeySchema } from "@/lib/schemas/common";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseDueUsers } from "./daily-missions";
import { createSupabaseCronRunLog } from "./run-log";

/**
 * Integration tests of the job helpers against the LOCAL Supabase stack. The cron_runs rows they
 * create are deleted afterwards. Skipped when the local stack or the service role key is missing.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isLocal(value: string | undefined): value is string {
  if (!value) return false;
  try {
    return ["127.0.0.1", "localhost", "[::1]"].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

async function localStackIsUp(): Promise<boolean> {
  if (!isLocal(url) || !anonKey || !serviceKey) return false;
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey }, signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

const stackIsUp = await localStackIsUp();

describe.skipIf(!stackIsUp)("Scheduled jobs on Supabase (local database)", () => {
  let admin: SupabaseClient<Database>;
  const runIds: string[] = [];

  beforeAll(() => {
    admin = createClient<Database>(url!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  });

  afterAll(async () => {
    if (runIds.length > 0) await admin.from("cron_runs").delete().in("id", runIds);
  });

  it("writes a cron run, then finishes it (error truncated to 500 characters)", async () => {
    const log = createSupabaseCronRunLog(admin);
    const id = await log.start("ingest");
    expect(id).toBeTruthy();
    runIds.push(id!);

    const { data: running } = await admin.from("cron_runs").select("status, finished_at").eq("id", id!).single();
    expect(running).toEqual({ status: "running", finished_at: null });

    await log.finish(id!, { status: "partial", stats: { sources: 3, note: "x", skipped: null }, error: "e".repeat(800) });
    const { data: done } = await admin.from("cron_runs").select("job, status, stats, error, finished_at").eq("id", id!).single();
    expect(done).toMatchObject({ job: "ingest", status: "partial", stats: { sources: 3, note: "x", skipped: null } });
    expect(done!.error).toHaveLength(500);
    expect(done!.finished_at).not.toBeNull();
  });

  it("lists due users with valid dates", async () => {
    const due = await createSupabaseDueUsers(admin)(new Date(), 50);
    expect(Array.isArray(due)).toBe(true);
    for (const user of due) {
      expect(user.userId).toMatch(/^[0-9a-f-]{36}$/);
      expect(dateKeySchema.safeParse(user.date).success).toBe(true);
    }
  });
});
