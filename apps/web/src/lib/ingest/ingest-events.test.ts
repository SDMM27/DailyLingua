import { IngestBatchError, type IngestRows } from "@dailylingua/data";
import { ingestBatchPayloadSchema } from "@dailylingua/schemas";
import { describe, expect, it, vi } from "vitest";
import { CARD, DEVICE, NOW, SESSION, USER, cardRow, rows, uuid } from "@/test/ingest-rows";
import { IngestTransientError, ingestEvents, MAX_STALE_ATTEMPTS, type IngestStore } from "./ingest-events";

const at = (time: string) => `2026-11-18T${time}.000Z`;
let sequence = 0;
const started = (id: number, time = "08:00:00") => ({ clientEventId: uuid(id), kind: "session_started", occurredAt: at(time), payload: { tz: "Europe/Paris", deviceId: DEVICE, seq: ++sequence, sessionId: SESSION } });
const review = (id: number, cardId: string, mode: string, answer: string, time = "08:10:10") => ({
  clientEventId: uuid(id),
  kind: "review_attempt",
  occurredAt: at(time),
  payload: { tz: "Europe/Paris", deviceId: DEVICE, seq: ++sequence, cardId, mode, answer, shownAt: at("08:10:05"), answeredAt: at(time), audioPlays: 0 },
});

interface Fake extends IngestStore {
  calls: { expectedSeq: number; payload: Record<string, unknown> }[];
  reads: number;
}

function fakeStore(options: { rows?: () => IngestRows; call?: (n: number, payload: Record<string, unknown>) => Promise<{ seq: number; duplicates: string[] }> } = {}): Fake {
  const fake: Fake = {
    calls: [],
    reads: 0,
    async readRows() {
      fake.reads++;
      return (options.rows ?? (() => rows()))();
    },
    async callBatch(_userId, expectedSeq, payload) {
      fake.calls.push({ expectedSeq, payload: payload as Record<string, unknown> });
      return options.call ? options.call(fake.calls.length, payload as Record<string, unknown>) : { seq: expectedSeq + 1, duplicates: [] };
    },
  };
  return fake;
}

const run = (store: IngestStore, events: unknown[]) => ingestEvents({ store, userId: USER, events, now: NOW, log: () => undefined });

describe("ingestEvents: the nominal path", () => {
  it("reads once, decides with planIngest and writes one payload that matches the contract", async () => {
    const store = fakeStore({ rows: () => rows({ ingestState: { seq: 7, memo: {} } }) });
    const event = started(1);
    const result = await run(store, [event]);
    expect(result).toEqual({ rejected: [], duplicates: [], report: { rejected: [] } });
    expect(store.reads).toBe(1);
    expect(store.calls).toHaveLength(1);
    expect(store.calls[0]?.expectedSeq).toBe(7);
    const payload = ingestBatchPayloadSchema.parse(store.calls[0]?.payload);
    expect(payload.sessions).toEqual([{ id: SESSION, status: "started", started_at: event.occurredAt, completed_at: null }]);
    // The ledger holds the fingerprint of the accepted event, with its kind; the memo comes with it.
    expect(payload.events).toEqual([{ client_event_id: event.clientEventId, kind: "session_started", fingerprint: expect.stringMatching(/^[0-9a-f]{32}$/) }]);
    expect(payload.memo).toMatchObject({ v: 1 });
  });

  it("writes nothing for a replay of an event the ledger already knows, and reports it as a duplicate", async () => {
    const event = started(1);
    const first = fakeStore();
    await run(first, [event]);
    const fingerprint = (first.calls[0]?.payload.events as { fingerprint: string }[])[0]?.fingerprint as string;

    const store = fakeStore({ rows: () => rows({ knownEvents: { [event.clientEventId]: fingerprint } }) });
    const result = await run(store, [event]);
    expect(store.calls).toHaveLength(0);
    expect(result).toEqual({ rejected: [], duplicates: [event.clientEventId], report: { rejected: [] } });
  });

  it("reports the events planIngest refuses, once each, and does not write them to the ledger", async () => {
    const store = fakeStore();
    const ghost = { ...started(2), payload: { ...started(2).payload, sessionId: uuid(999) } };
    const result = await run(store, [started(1), ghost]);
    expect(result.rejected).toEqual([{ clientEventId: ghost.clientEventId, reason: "unknown_session" }]);
    const payload = store.calls[0]?.payload.events as { client_event_id: string }[];
    expect(payload.map((entry) => entry.client_event_id)).toEqual([uuid(1)]);
  });

  it("refuses a review in another mode than the served one before it is decided (D5)", async () => {
    const store = fakeStore({ rows: () => rows({ cards: [cardRow(2, { stability: 5 })] }) });
    // Card 2 was served as typed (production): declaring a choice on it is a forgery.
    const forged = review(5, CARD(2), "recognition", CARD(2));
    const honest = review(6, CARD(2), "production", "parola2", "08:10:20");
    const result = await run(store, [forged, honest]);
    expect(result.rejected).toEqual([{ clientEventId: forged.clientEventId, reason: "invalid_payload" }]);
    expect((store.calls[0]?.payload.reviews as { client_event_id: string }[]).map((r) => r.client_event_id)).toEqual([honest.clientEventId]);
  });

  it("leaves a trace of the right answers that earned nothing, with a stable id (D4)", async () => {
    // A second review of the same card the same day is right but pays nothing.
    const store = fakeStore({ rows: () => rows({ cards: [cardRow(1, { state: "new", stability: null, difficulty: null, lastReviewAt: null, lastReview: null })] }) });
    const first = review(7, CARD(1), "recognition", CARD(1), "08:10:10");
    const second = review(8, CARD(1), "recognition", CARD(1), "08:20:10");
    const secondFixed = { ...second, payload: { ...second.payload, shownAt: at("08:20:05"), answeredAt: at("08:20:10") } };
    await run(store, [first, secondFixed]);
    const payload = ingestBatchPayloadSchema.parse(store.calls[0]?.payload);
    const zeroed = payload.ui_events.filter((e) => e.name === "xp_zeroed");
    expect(zeroed.length).toBeGreaterThan(0);
    for (const entry of zeroed) {
      expect(entry.occurred_at).toBe(NOW.toISOString());
      expect(entry.value).toMatchObject({ clientEventId: expect.any(String), reason: expect.any(String) });
    }
    // The same decision again gives the same ids: replaying cannot double the trace.
    const again = fakeStore({ rows: () => rows({ cards: [cardRow(1, { state: "new", stability: null, difficulty: null, lastReviewAt: null, lastReview: null })] }) });
    await run(again, [first, secondFixed]);
    expect(ingestBatchPayloadSchema.parse(again.calls[0]?.payload).ui_events.map((e) => e.client_event_id)).toEqual(payload.ui_events.map((e) => e.client_event_id));
  });

  it("does not trust an event that is not an object: nothing throws, nothing is written", async () => {
    const store = fakeStore();
    const result = await run(store, [null, 3, "x", [], { clientEventId: "nope" }]);
    expect(store.calls).toHaveLength(0);
    // Only an entry with a string id can be reported; the others are dropped.
    expect(result.rejected).toEqual([{ clientEventId: "nope", reason: "invalid_payload" }]);
  });
});

describe("ingestEvents: a state that moved (stale)", () => {
  it("starts again from a fresh read and writes the second time", async () => {
    const store = fakeStore({ call: async (n, payload) => (n === 1 ? Promise.reject(new IngestBatchError("stale", "40001", "stale")) : { seq: 9, duplicates: [(payload.events as { client_event_id: string }[])[0]?.client_event_id as string] }) });
    const result = await run(store, [started(1)]);
    expect(store.reads).toBe(2);
    expect(store.calls).toHaveLength(2);
    expect(result.duplicates).toEqual([uuid(1)]);
  });

  it("gives up after three attempts with a passing failure", async () => {
    const store = fakeStore({ call: async () => Promise.reject(new IngestBatchError("stale", "40001", "stale")) });
    await expect(run(store, [started(1)])).rejects.toBeInstanceOf(IngestTransientError);
    expect(store.calls).toHaveLength(MAX_STALE_ATTEMPTS);
  });
});

describe("ingestEvents: passing failures", () => {
  it.each(["busy", "unavailable"] as const)("a %s database is a passing failure, and its message stays in the log", async (code) => {
    const log = vi.fn();
    const store = fakeStore({ call: async () => Promise.reject(new IngestBatchError(code, "XX000", "relation app.secret_table does not exist")) });
    const error = await ingestEvents({ store, userId: USER, events: [started(1)], now: NOW, log }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(IngestTransientError);
    expect((error as Error).message).not.toContain("secret_table");
    expect(JSON.stringify(log.mock.calls)).toContain("secret_table");
  });

  it("a memo over 256 KiB is a server error, not a refusal of the events", async () => {
    const counted = Array.from({ length: 6000 }, (_, i) => `review:${uuid(i)}`);
    const days = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`2026-11-${String(8 + i).padStart(2, "0")}`, { xpByReason: {}, reviewSuccesses: 0, newCards: 0, readingTexts: 0, rewards: {}, focusBySession: {}, rewardsByCorrection: {}, counted }]));
    const store = fakeStore({ rows: () => rows({ ingestState: { seq: 0, memo: { v: 1, days, texts: {}, productions: {}, catchUpDays: [] } } }) });
    await expect(run(store, [started(1)])).rejects.toBeInstanceOf(IngestTransientError);
    expect(store.calls).toHaveLength(0);
  });
});

describe("ingestEvents: a batch the database refuses (isolation)", () => {
  it("replays event by event, re-reads the state each time, refuses the one that fails again and keeps the others", async () => {
    const bad = started(2, "08:00:20");
    const good = started(3, "08:00:30");
    const store = fakeStore({
      call: async (_n, payload) => {
        const ids = (payload.events as { client_event_id: string }[]).map((e) => e.client_event_id);
        if (ids.includes(bad.clientEventId)) throw new IngestBatchError("refused", "23514", "a bound");
        return { seq: 1, duplicates: [] };
      },
    });
    const result = await run(store, [good, bad]);
    expect(result.rejected).toEqual([{ clientEventId: bad.clientEventId, reason: "server_refused" }]);
    // One read and one call for the whole batch, then one read and one call per event, in order of instant.
    expect(store.reads).toBe(3);
    expect(store.calls).toHaveLength(3);
    expect((store.calls[1]?.payload.events as { client_event_id: string }[]).map((e) => e.client_event_id)).toEqual([bad.clientEventId]);
    expect((store.calls[2]?.payload.events as { client_event_id: string }[]).map((e) => e.client_event_id)).toEqual([good.clientEventId]);
  });

  it("starts again when an isolated event meets a stale sequence, and stops on a passing failure", async () => {
    const a = started(2, "08:00:20");
    const b = started(3, "08:00:30");
    let n = 0;
    const store = fakeStore({
      call: async () => {
        n++;
        if (n === 1) throw new IngestBatchError("refused", "22023", "bad");
        if (n === 2) throw new IngestBatchError("stale", "40001", "stale");
        if (n === 4) throw new IngestBatchError("busy", "55P03", "lock");
        return { seq: 1, duplicates: [] };
      },
    });
    await expect(run(store, [a, b])).rejects.toBeInstanceOf(IngestTransientError);
    // The first event was retried once after the stale answer and went through; the second hit a busy database.
    expect(store.calls).toHaveLength(4);
  });

  it("ignores a stored memo it cannot read (and logs it) rather than blocking the queue", async () => {
    const store = fakeStore({ rows: () => rows({ ingestState: { seq: 0, memo: { v: 1, junk: true } } }) });
    const result = await run(store, [started(1)]);
    expect(result.rejected).toEqual([]);
    expect(store.calls).toHaveLength(1);
  });
});
