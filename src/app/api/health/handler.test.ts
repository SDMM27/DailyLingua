import { describe, expect, it, vi } from "vitest";
import { handleHealthRequest, type HealthHandlerDeps } from "./handler";

const SECRET = "test-cron-secret-0123456789-abcdefghij";
const TIME = new Date("2026-01-02T03:04:05.000Z");

function request(secret: string | null) {
  return new Request("http://localhost/api/health", {
    headers: secret === null ? {} : { authorization: `Bearer ${secret}` },
  });
}

function deps(overrides: HealthHandlerDeps = {}): HealthHandlerDeps {
  return {
    env: { CRON_SECRET: SECRET, VERCEL_GIT_COMMIT_SHA: "0123456789abcdef" },
    getSupabaseEnv: () => ({}),
    checkDatabase: vi.fn(async () => {}),
    now: () => TIME,
    error: vi.fn(),
    ...overrides,
  };
}

describe("handleHealthRequest", () => {
  it("answers in demo mode without checking anything", async () => {
    const d = deps({ getSupabaseEnv: () => null });
    const response = await handleHealthRequest(request(null), d);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, mode: "demo", commit: "0123456", time: TIME.toISOString() });
    expect(d.checkDatabase).not.toHaveBeenCalled();
  });

  it("has a null commit outside Vercel", async () => {
    const response = await handleHealthRequest(request(null), deps({ env: {} }));
    expect((await response.json()).commit).toBeNull();
  });

  it("reports the supabase mode without checking the database when there is no secret", async () => {
    const d = deps();
    const response = await handleHealthRequest(request(null), d);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, mode: "supabase", commit: "0123456", time: TIME.toISOString() });
    expect(d.checkDatabase).not.toHaveBeenCalled();
  });

  it("does not check the database for an invalid secret", async () => {
    const d = deps();
    const response = await handleHealthRequest(request("wrong-secret"), d);
    expect(response.status).toBe(200);
    expect(await response.json()).not.toHaveProperty("database");
    expect(d.checkDatabase).not.toHaveBeenCalled();
  });

  it("does not check the database when no secret is configured", async () => {
    const d = deps({ env: {} });
    const response = await handleHealthRequest(request(SECRET), d);
    expect(response.status).toBe(200);
    expect(d.checkDatabase).not.toHaveBeenCalled();
  });

  it("skips the database in demo mode with a valid secret", async () => {
    const d = deps({ getSupabaseEnv: () => null });
    const body = await (await handleHealthRequest(request(SECRET), d)).json();
    expect(body).toMatchObject({ ok: true, mode: "demo", database: "skipped" });
    expect(d.checkDatabase).not.toHaveBeenCalled();
  });

  it("checks the database with a valid secret", async () => {
    const d = deps();
    const response = await handleHealthRequest(request(SECRET), d);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, mode: "supabase", database: "ok" });
    expect(d.checkDatabase).toHaveBeenCalledOnce();
  });

  it("returns 503 without leaking the error when the database fails", async () => {
    const d = deps({
      checkDatabase: async () => {
        throw new Error("password authentication failed for user postgres");
      },
    });
    const response = await handleHealthRequest(request(SECRET), d);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const text = await response.text();
    expect(JSON.parse(text)).toMatchObject({ ok: false, database: "error" });
    expect(text).not.toContain("password");
    expect(d.error).toHaveBeenCalledWith(expect.stringContaining("password authentication failed"));
  });

  it("returns 503 when the database does not answer in time", async () => {
    const d = deps({ checkDatabase: () => new Promise<void>(() => {}), timeoutMs: 10 });
    const response = await handleHealthRequest(request(SECRET), d);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, database: "error" });
    expect(d.error).toHaveBeenCalledWith(expect.stringContaining("délai dépassé"));
  });
});
