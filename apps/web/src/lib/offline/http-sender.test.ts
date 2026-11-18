import type { PendingEvent } from "@dailylingua/core";
import { describe, expect, it, vi } from "vitest";
import { createHttpSender, EVENTS_ENDPOINT } from "./http-sender";

const batch: PendingEvent[] = [{ clientEventId: "00000000-0000-4000-8000-000000000001", kind: "ui_event", payload: { a: 1 }, occurredAt: "2026-11-18T08:00:00.000Z" }];
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("createHttpSender", () => {
  it("POSTs the batch as JSON to /api/events with the cookie of the site", async () => {
    const fetcher = answer(200, { rejected: [] });
    await createHttpSender({ fetch: fetcher as unknown as typeof fetch })(batch);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(EVENTS_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(init.cache).toBe("no-store");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual(batch);
  });

  it("resolves with the delivery report of a 200, the refused events included", async () => {
    const report = { rejected: [{ clientEventId: "e1", reason: "server_refused" }] };
    await expect(createHttpSender({ fetch: answer(200, report) as unknown as typeof fetch })(batch)).resolves.toEqual(report);
  });

  it.each([401, 403, 429, 500, 503])("rejects on a %s: a passing failure, the queue keeps the events", async (status) => {
    await expect(createHttpSender({ fetch: answer(status, { error: "x" }) as unknown as typeof fetch })(batch)).rejects.toThrow(String(status));
  });

  it("rejects on a network error, on an answer that is not JSON and on one that is not a delivery report", async () => {
    await expect(createHttpSender({ fetch: vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) as unknown as typeof fetch })(batch)).rejects.toThrow("Failed to fetch");
    await expect(createHttpSender({ fetch: answer(200, "<html>") as unknown as typeof fetch })(batch)).rejects.toThrow(/JSON/);
    await expect(createHttpSender({ fetch: answer(200, { rejected: [{ clientEventId: "e", reason: "whatever" }] }) as unknown as typeof fetch })(batch)).rejects.toThrow(/delivery report/);
    await expect(createHttpSender({ fetch: answer(200, { ok: true }) as unknown as typeof fetch })(batch)).rejects.toThrow(/delivery report/);
  });

  const event = (n: number): PendingEvent => ({ clientEventId: `00000000-0000-4000-8000-00000000000${n}`, kind: "ui_event", payload: { n }, occurredAt: "2026-11-18T08:00:00.000Z" });
  const four = [event(1), event(2), event(3), event(4)];
  const sentIds = (fetcher: ReturnType<typeof vi.fn>) => fetcher.mock.calls.map((call) => (JSON.parse((call as unknown as [string, RequestInit])[1].body as string) as PendingEvent[]).map((e) => e.clientEventId.slice(-1)));

  it("splits a batch the server finds too large (413) in two, recursively, and merges the reports", async () => {
    // Four events: too large; each pair: too large; the single events: 3 is refused alone, the others go through.
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      const events = JSON.parse(init.body as string) as PendingEvent[];
      if (events.length > 1 || events[0]?.clientEventId.endsWith("3")) return new Response("{}", { status: 413 });
      return new Response(JSON.stringify({ rejected: events[0]?.clientEventId.endsWith("1") ? [{ clientEventId: events[0].clientEventId, reason: "too_many" }] : [] }), { status: 200 });
    });
    const report = await createHttpSender({ fetch: fetcher as unknown as typeof fetch })(four);
    expect(sentIds(fetcher)).toEqual([["1", "2", "3", "4"], ["1", "2"], ["1"], ["2"], ["3", "4"], ["3"], ["4"]]);
    expect(report).toEqual({
      rejected: [
        { clientEventId: four[0]?.clientEventId, reason: "too_many" },
        { clientEventId: four[2]?.clientEventId, reason: "invalid_payload" },
      ],
    });
  });

  it("refuses a single event that is too large (413) as invalid_payload", async () => {
    const report = await createHttpSender({ fetch: answer(413, {}) as unknown as typeof fetch })(batch);
    expect(report).toEqual({ rejected: [{ clientEventId: batch[0]?.clientEventId, reason: "invalid_payload" }] });
  });

  it.each([400, 415])("refuses every event of the batch as invalid_payload on a %s", async (status) => {
    const fetcher = answer(status, { error: "x" });
    const report = await createHttpSender({ fetch: fetcher as unknown as typeof fetch })(four);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(report).toEqual({ rejected: four.map((e) => ({ clientEventId: e.clientEventId, reason: "invalid_payload" })) });
  });

  it("still rejects when a half of a split batch meets a passing failure", async () => {
    let n = 0;
    const fetcher = vi.fn(async () => new Response("{}", { status: ++n === 1 ? 413 : 503 }));
    await expect(createHttpSender({ fetch: fetcher as unknown as typeof fetch })(four)).rejects.toThrow("503");
  });
});
