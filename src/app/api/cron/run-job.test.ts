import { describe, expect, it, vi } from "vitest";
import type { CronRunLog, CronRunResult } from "@/lib/jobs";
import { handleCronRequest, type CronHandlerDeps } from "./run-job";

const SECRET = "test-cron-secret-0123456789-abcdefghij";

function request(secret: string | null = SECRET) {
  return new Request("http://localhost/api/cron/missions", {
    headers: secret === null ? {} : { authorization: `Bearer ${secret}` },
  });
}

function setup(overrides: CronHandlerDeps = {}) {
  const log: CronRunLog = {
    start: vi.fn(async () => "run-1"),
    finish: vi.fn(async () => {}),
  };
  const admin = {} as never;
  const deps: CronHandlerDeps = {
    env: { CRON_SECRET: SECRET },
    getSupabaseEnv: () => ({ SUPABASE_SERVICE_ROLE_KEY: "service-role-key-0123456789" }),
    createAdminClient: vi.fn(() => admin),
    createRunLog: vi.fn(() => log),
    warn: vi.fn(),
    error: vi.fn(),
    ...overrides,
  };
  return { deps, log, admin };
}

const okResult: CronRunResult = { status: "ok", stats: { ready: 2 } };

describe("handleCronRequest", () => {
  it("answers 503 without a configured secret and does not run the task", async () => {
    const { deps } = setup({ env: {} });
    const task = vi.fn(async () => okResult);
    const response = await handleCronRequest(request(), "missions", task, deps);
    expect(response.status).toBe(503);
    expect(task).not.toHaveBeenCalled();
    expect(deps.createAdminClient).not.toHaveBeenCalled();
  });

  it("answers 401 for a wrong secret and does not run the task", async () => {
    const { deps } = setup();
    const task = vi.fn(async () => okResult);
    for (const given of ["x".repeat(40), null]) {
      const response = await handleCronRequest(request(given), "missions", task, deps);
      expect(response.status).toBe(401);
    }
    expect(task).not.toHaveBeenCalled();
    expect(deps.createAdminClient).not.toHaveBeenCalled();
  });

  it("skips in demo mode", async () => {
    const { deps } = setup({ getSupabaseEnv: () => null });
    const task = vi.fn(async () => okResult);
    const response = await handleCronRequest(request(), "missions", task, deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "skipped", reason: "Supabase non configuré" });
    expect(task).not.toHaveBeenCalled();
  });

  it("answers 503 when the service role key is missing", async () => {
    const { deps } = setup({ getSupabaseEnv: () => ({}) });
    const task = vi.fn(async () => okResult);
    const response = await handleCronRequest(request(), "missions", task, deps);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(task).not.toHaveBeenCalled();
  });

  it("runs the task between the journal start and finish", async () => {
    const { deps, log, admin } = setup();
    const task = vi.fn(async () => okResult);
    const response = await handleCronRequest(request(), "missions", task, deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ job: "missions", status: "ok", stats: { ready: 2 } });
    expect(task).toHaveBeenCalledWith(admin);
    expect(log.start).toHaveBeenCalledWith("missions");
    expect(log.finish).toHaveBeenCalledWith("run-1", okResult);
  });

  it("answers 200 for a partial run", async () => {
    const { deps, log } = setup();
    const partial: CronRunResult = { status: "partial", stats: { failed: 1 } };
    const response = await handleCronRequest(request(), "ingest", async () => partial, deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ job: "ingest", status: "partial", stats: { failed: 1 } });
    expect(log.finish).toHaveBeenCalledWith("run-1", partial);
  });

  it("answers 500 without leaking the error message", async () => {
    const { deps, log } = setup();
    const response = await handleCronRequest(
      request(),
      "missions",
      async () => {
        throw new Error("secret-detail postgres://user:pw@host");
      },
      deps,
    );
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("secret-detail");
    expect(JSON.parse(text)).toEqual({ job: "missions", status: "error", error: "La tâche a échoué." });
    expect(deps.error).toHaveBeenCalledWith(expect.stringContaining("secret-detail"));
    expect(log.finish).toHaveBeenCalledWith("run-1", expect.objectContaining({ status: "error" }));
  });

  it("sets Cache-Control: no-store on every response", async () => {
    const task = async () => okResult;
    const responses = [
      await handleCronRequest(request(), "missions", task, setup({ env: {} }).deps),
      await handleCronRequest(request("x".repeat(40)), "missions", task, setup().deps),
      await handleCronRequest(request(), "missions", task, setup({ getSupabaseEnv: () => null }).deps),
      await handleCronRequest(request(), "missions", task, setup().deps),
      await handleCronRequest(request(), "missions", async () => Promise.reject(new Error("x")), setup().deps),
    ];
    for (const response of responses) expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
