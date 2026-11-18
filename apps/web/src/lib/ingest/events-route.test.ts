import { MAX_BATCH_BYTES, MAX_EVENTS_PER_BATCH } from "@dailylingua/schemas";
import { describe, expect, it, vi } from "vitest";
import { createEventsHandler, isSameOrigin, readBodyLimited, secondsToNextHour, type EventsRouteDeps } from "./events-route";
import { IngestTransientError } from "./ingest-events";

const URL_ = "https://app.example.test/api/events";
const ORIGIN = "https://app.example.test";
const USER = { id: "11111111-1111-4111-8111-111111111111" };

function deps(overrides: Partial<EventsRouteDeps> = {}): EventsRouteDeps & { ingest: ReturnType<typeof vi.fn>; claimRate: ReturnType<typeof vi.fn> } {
  return {
    getUser: vi.fn(async () => USER),
    claimRate: vi.fn(async () => true),
    ingest: vi.fn(async () => ({ rejected: [], duplicates: [], report: { rejected: [] } })),
    now: () => new Date("2026-11-18T12:34:56.000Z"),
    log: () => undefined,
    ...overrides,
  } as never;
}

function post(body: BodyInit | null, headers: Record<string, string> = {}) {
  return new Request(URL_, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", ...headers }, body });
}
const events = (n: number) => JSON.stringify(Array.from({ length: n }, (_, i) => ({ clientEventId: `e${i}` })));

describe("POST /api/events: guards, in order", () => {
  it("refuses a request without an Origin, or with another one, before anything else (403)", async () => {
    const d = deps();
    const handler = createEventsHandler(d);
    expect((await handler(new Request(URL_, { method: "POST", headers: { "Content-Type": "application/json" }, body: "[]" }))).status).toBe(403);
    expect((await handler(post("[]", { Origin: "https://evil.example.test" }))).status).toBe(403);
    expect((await handler(post("[]", { Origin: "null" }))).status).toBe(403);
    expect((await handler(post("[]", { Origin: "not a url" }))).status).toBe(403);
    expect(d.getUser).not.toHaveBeenCalled();
  });

  it("refuses a content type that is not JSON (415), before it reads the user", async () => {
    const d = deps();
    const handler = createEventsHandler(d);
    expect((await handler(post("[]", { "Content-Type": "text/plain" }))).status).toBe(415);
    expect((await handler(post("[]", { "Content-Type": "application/x-www-form-urlencoded" }))).status).toBe(415);
    expect(d.getUser).not.toHaveBeenCalled();
  });

  it("answers 401 JSON, never a redirect, to a signed-out visitor, and reads no body", async () => {
    const d = deps({ getUser: vi.fn(async () => null) });
    const response = await createEventsHandler(d)(post(events(1)));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthenticated" });
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(d.claimRate).not.toHaveBeenCalled();
  });

  it("answers 400 to an invalid JSON body or one that is not an array", async () => {
    const handler = createEventsHandler(deps());
    expect((await handler(post("{nope"))).status).toBe(400);
    expect((await handler(post('{"a":1}'))).status).toBe(400);
    expect((await handler(post('"text"'))).status).toBe(400);
    expect((await handler(post(""))).status).toBe(400);
  });

  it("answers 413 above 50 events and above 64 KiB, the size being counted as it streams, not from Content-Length", async () => {
    const d = deps();
    const handler = createEventsHandler(d);
    expect((await handler(post(events(MAX_EVENTS_PER_BATCH + 1)))).status).toBe(413);
    const big = JSON.stringify([{ pad: "x".repeat(MAX_BATCH_BYTES) }]);
    expect((await handler(post(big))).status).toBe(413);
    // A lying Content-Length does not help: the body is cut at the limit.
    expect((await handler(post(big, { "Content-Length": "10" }))).status).toBe(413);
    expect(d.ingest).not.toHaveBeenCalled();
  });

  it("stops reading the stream at the limit", async () => {
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        controller.enqueue(new Uint8Array(16 * 1024));
      },
    });
    const request = new Request(URL_, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
    const result = await readBodyLimited(request, MAX_BATCH_BYTES);
    expect(result).toEqual({ ok: false, reason: "too_large" });
    expect(pulled).toBeLessThan(10);
  });

  it("answers 429 with Retry-After until the next hour when the allowance is spent, and ingests nothing", async () => {
    const d = deps({ claimRate: vi.fn(async () => false) });
    const response = await createEventsHandler(d)(post(events(3)));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe(String(secondsToNextHour(new Date("2026-11-18T12:34:56.000Z"))));
    expect(response.headers.get("retry-after")).toBe("1504");
    expect(d.claimRate).toHaveBeenCalledWith(USER.id, 3, 600);
    expect(d.ingest).not.toHaveBeenCalled();
  });
});

describe("POST /api/events: answers", () => {
  it("answers 200 with the delivery report and no-store, passing the user, the events and the instant", async () => {
    const d = deps({ ingest: vi.fn(async () => ({ rejected: [{ clientEventId: "e1", reason: "unknown_card" }], duplicates: [], report: { rejected: [{ clientEventId: "e1", reason: "unknown_card" }] } })) as never });
    const response = await createEventsHandler(d)(post(events(2)));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ rejected: [{ clientEventId: "e1", reason: "unknown_card" }] });
    expect(d.ingest).toHaveBeenCalledWith({ userId: USER.id, events: [{ clientEventId: "e0" }, { clientEventId: "e1" }], now: new Date("2026-11-18T12:34:56.000Z") });
  });

  it("answers 200 to an empty batch without claiming or ingesting anything", async () => {
    const d = deps();
    const response = await createEventsHandler(d)(post("[]"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rejected: [] });
    expect(d.claimRate).not.toHaveBeenCalled();
    expect(d.ingest).not.toHaveBeenCalled();
  });

  it("answers 503, with the SQL message only in the log, when the ingestion fails for a passing reason", async () => {
    const log = vi.fn();
    const d = deps({ log, ingest: vi.fn(async () => Promise.reject(new IngestTransientError("ingestion failed", new Error("relation app.secret does not exist")))) as never });
    const response = await createEventsHandler(d)(post(events(1)));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });

  it("answers 503 when the user, the allowance or the report cannot be had, never a stack or a message", async () => {
    const log = vi.fn();
    const failing = (overrides: Partial<EventsRouteDeps>) => createEventsHandler(deps({ log, ...overrides }))(post(events(1)));
    expect((await failing({ getUser: vi.fn(async () => Promise.reject(new Error("auth down secret"))) })).status).toBe(503);
    expect((await failing({ claimRate: vi.fn(async () => Promise.reject(new Error("rpc secret"))) })).status).toBe(503);
    const odd = await failing({ ingest: vi.fn(async () => ({ rejected: [], duplicates: [], report: { rejected: [{ clientEventId: "e", reason: "whatever" }] } })) as never });
    expect(odd.status).toBe(503);
    expect(JSON.stringify(await odd.json())).not.toContain("secret");
    expect(log).toHaveBeenCalled();
  });
});

describe("isSameOrigin", () => {
  it("accepts the origin of the request URL, or the host the browser asked for behind a proxy", () => {
    expect(isSameOrigin(post("[]"))).toBe(true);
    const proxied = new Request("http://internal:3000/api/events", { method: "POST", headers: { Origin: ORIGIN, "x-forwarded-host": "app.example.test" } });
    expect(isSameOrigin(proxied)).toBe(true);
    expect(isSameOrigin(new Request("http://internal:3000/api/events", { method: "POST", headers: { Origin: "https://evil.test", "x-forwarded-host": "app.example.test" } }))).toBe(false);
  });
});

describe("secondsToNextHour", () => {
  it("counts the seconds to the next full hour, at least one", () => {
    expect(secondsToNextHour(new Date("2026-11-18T12:00:00.000Z"))).toBe(3600);
    expect(secondsToNextHour(new Date("2026-11-18T12:59:59.500Z"))).toBe(1);
    expect(secondsToNextHour(new Date("2026-11-18T12:59:59.999Z"))).toBe(1);
  });
});
