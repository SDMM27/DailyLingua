import { describe, expect, it } from "vitest";
import { runLoggedJob, type CronRunLog, type CronRunResult } from "./run-log";

function memoryLog(options: { failStart?: boolean; failFinish?: boolean } = {}) {
  const finished: { id: string; result: CronRunResult }[] = [];
  const log: CronRunLog = {
    async start() {
      if (options.failStart) throw new Error("db down");
      return "run-1";
    },
    async finish(id, result) {
      if (options.failFinish) throw new Error("db down");
      finished.push({ id, result });
    },
  };
  return { log, finished };
}

const OK: CronRunResult = { status: "ok", stats: { n: 1 } };

describe("runLoggedJob", () => {
  it("records the result of a successful task", async () => {
    const { log, finished } = memoryLog();
    const result = await runLoggedJob("ingest", log, async () => OK);
    expect(result).toEqual(OK);
    expect(finished).toEqual([{ id: "run-1", result: OK }]);
  });

  it("records an error and rethrows when the task throws", async () => {
    const { log, finished } = memoryLog();
    await expect(
      runLoggedJob("missions", log, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(finished).toEqual([{ id: "run-1", result: { status: "error", stats: {}, error: "boom" } }]);
  });

  it("still runs the task when the journal is down, and reports it", async () => {
    const { log } = memoryLog({ failStart: true });
    const reports: string[] = [];
    let ran = false;
    const result = await runLoggedJob(
      "ingest",
      log,
      async () => {
        ran = true;
        return OK;
      },
      (m) => reports.push(m),
    );
    expect(ran).toBe(true);
    expect(result).toEqual(OK);
    expect(reports).toHaveLength(1);
  });

  it("does not fail the task when the journal cannot record its end", async () => {
    const { log } = memoryLog({ failFinish: true });
    const reports: string[] = [];
    await expect(runLoggedJob("ingest", log, async () => OK, (m) => reports.push(m))).resolves.toEqual(OK);
    expect(reports).toHaveLength(1);

    // The original task error wins over a journal failure.
    await expect(
      runLoggedJob("ingest", log, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
