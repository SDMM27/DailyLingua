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

  it.each([400, 401, 403, 413, 415, 429, 500, 503])("rejects on a %s: a passing failure, the queue keeps the events", async (status) => {
    await expect(createHttpSender({ fetch: answer(status, { error: "x" }) as unknown as typeof fetch })(batch)).rejects.toThrow(String(status));
  });

  it("rejects on a network error, on an answer that is not JSON and on one that is not a delivery report", async () => {
    await expect(createHttpSender({ fetch: vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) as unknown as typeof fetch })(batch)).rejects.toThrow("Failed to fetch");
    await expect(createHttpSender({ fetch: answer(200, "<html>") as unknown as typeof fetch })(batch)).rejects.toThrow(/JSON/);
    await expect(createHttpSender({ fetch: answer(200, { rejected: [{ clientEventId: "e", reason: "whatever" }] }) as unknown as typeof fetch })(batch)).rejects.toThrow(/delivery report/);
    await expect(createHttpSender({ fetch: answer(200, { ok: true }) as unknown as typeof fetch })(batch)).rejects.toThrow(/delivery report/);
  });
});
