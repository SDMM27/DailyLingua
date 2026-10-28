import { describe, expect, it } from "vitest";
import type { GenerateMissionOutcome } from "@/lib/generation/generate-mission";
import type { DateKey } from "@/lib/schemas/common";
import { runDailyMissions, type DueUser } from "./daily-missions";

const DATE = "2026-10-15" as DateKey;
const users = (n: number): DueUser[] => Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, date: DATE }));

describe("runDailyMissions", () => {
  it("counts every outcome and stays ok when only no-content / no-preferences / rest-day / pending happen", async () => {
    const outcomes: Record<string, GenerateMissionOutcome> = {
      u0: { status: "ready", missionId: "m0", source: "ai" },
      u1: { status: "pending", missionId: "m1" },
      u2: { status: "no-content" },
      u3: { status: "no-preferences" },
      u4: { status: "rest-day" },
    };
    const report = await runDailyMissions({
      listDueUsers: async () => users(5),
      prepare: async (id) => outcomes[id],
      deadlineMs: 10_000,
    });
    expect(report).toMatchObject({ status: "ok", due: 5, ready: 1, pending: 1, failed: 0, noContent: 1, noPreferences: 1, restDays: 1, errors: 0, skipped: 0 });
  });

  it("is partial when a mission failed, and logs its id and reason only", async () => {
    const logs: string[] = [];
    const report = await runDailyMissions({
      listDueUsers: async () => users(1),
      prepare: async () => ({ status: "failed", missionId: "m9", reason: "invalid" }),
      deadlineMs: 10_000,
      log: (m) => logs.push(m),
    });
    expect(report).toMatchObject({ status: "partial", failed: 1 });
    expect(logs.join("\n")).toContain("m9");
    expect(logs.join("\n")).toContain("invalid");
  });

  it("isolates an exception: the other users are still processed", async () => {
    const report = await runDailyMissions({
      listDueUsers: async () => users(3),
      prepare: async (id) => {
        if (id === "u1") throw new Error("boom");
        return { status: "ready", missionId: id, source: "template" };
      },
      deadlineMs: 10_000,
    });
    expect(report).toMatchObject({ status: "partial", ready: 2, errors: 1, skipped: 0 });
  });

  it("stops starting users after the deadline and lets the ones in progress finish", async () => {
    let clock = 0;
    const started: string[] = [];
    const report = await runDailyMissions({
      listDueUsers: async () => users(5),
      prepare: async (id) => {
        started.push(id);
        clock += 100;
        return { status: "ready", missionId: id, source: "template" };
      },
      now: () => new Date(clock),
      deadlineMs: 250,
      concurrency: 1,
    });
    expect(started).toEqual(["u0", "u1", "u2"]);
    expect(report).toMatchObject({ status: "partial", due: 5, ready: 3, skipped: 2, durationMs: 300 });
  });

  it("never runs more than `concurrency` users at once, and passes the limit on", async () => {
    let running = 0;
    let peak = 0;
    let receivedLimit = -1;
    const report = await runDailyMissions({
      listDueUsers: async (_now, limit) => {
        receivedLimit = limit;
        return users(10);
      },
      prepare: async (id) => {
        peak = Math.max(peak, ++running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        return { status: "ready", missionId: id, source: "template" };
      },
      deadlineMs: 10_000,
      concurrency: 2,
      limit: 42,
    });
    expect(peak).toBe(2);
    expect(receivedLimit).toBe(42);
    expect(report.ready).toBe(10);
  });

  it("defaults to a limit of 500 and lets a listing failure surface", async () => {
    let receivedLimit = -1;
    await runDailyMissions({
      listDueUsers: async (_now, limit) => {
        receivedLimit = limit;
        return [];
      },
      prepare: async () => ({ status: "no-content" }),
      deadlineMs: 1000,
    });
    expect(receivedLimit).toBe(500);

    await expect(
      runDailyMissions({
        listDueUsers: async () => {
          throw new Error("rpc down");
        },
        prepare: async () => ({ status: "no-content" }),
        deadlineMs: 1000,
      }),
    ).rejects.toThrow("rpc down");
  });

  it("reports the stale guests removed, and a failing cleanup is non-fatal", async () => {
    const ok = await runDailyMissions({
      listDueUsers: async () => [],
      prepare: async () => ({ status: "no-content" }),
      cleanupGuests: async () => 4,
      deadlineMs: 10_000,
    });
    expect(ok).toMatchObject({ status: "ok", staleGuestsDeleted: 4, guestCleanupErrors: 0 });

    const logs: string[] = [];
    const failed = await runDailyMissions({
      listDueUsers: async () => users(1),
      prepare: async () => ({ status: "ready", missionId: "m", source: "ai" }),
      cleanupGuests: async () => {
        throw new Error("rpc down");
      },
      deadlineMs: 10_000,
      log: (m) => logs.push(m),
    });
    expect(failed).toMatchObject({ status: "ok", ready: 1, staleGuestsDeleted: 0, guestCleanupErrors: 1 });
    expect(logs.join(" ")).toContain("rpc down");
  });
});
