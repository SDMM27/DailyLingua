import { describe, expect, it } from "vitest";
import { flushQueue, INITIAL_FLUSH_STATE, type FlushOptions } from "./flush";
import { createMemoryEventQueue } from "./memory-queue";
import { backoffDelayMs, DEFAULT_RETRY_POLICY, INITIAL_RETRY_STATE, isDue, recordFailure } from "./retry";
import type { EventQueue, PendingEvent } from "./types";

function event(n: number): PendingEvent {
  return { clientEventId: `e${n}`, kind: "test", payload: { n }, occurredAt: new Date(Date.UTC(2026, 10, 13, 8, 0, n)).toISOString() };
}

async function queueOf(count: number): Promise<EventQueue> {
  const queue = createMemoryEventQueue();
  for (let n = 1; n <= count; n++) await queue.enqueue(event(n));
  return queue;
}

const options: FlushOptions = { batchSize: 2, maxBatches: 10, retry: { baseDelayMs: 1_000, maxDelayMs: 8_000, factor: 2 } };

describe("memory queue", () => {
  it("keeps the order, ignores a repeated id and removes what is acknowledged", async () => {
    const queue = await queueOf(3);
    await queue.enqueue(event(2));
    expect(await queue.size()).toBe(3);
    expect((await queue.peekBatch(2)).map((e) => e.clientEventId)).toEqual(["e1", "e2"]);
    expect(await queue.size()).toBe(3);
    await queue.ack(["e1", "unknown"]);
    expect((await queue.peekBatch(10)).map((e) => e.clientEventId)).toEqual(["e2", "e3"]);
  });
});

describe("retry", () => {
  it("grows with each failure up to the cap", () => {
    const delays = [0, 1, 2, 3, 4, 5, 6].map((failures) => backoffDelayMs(failures, options.retry));
    expect(delays).toEqual([0, 1_000, 2_000, 4_000, 8_000, 8_000, 8_000]);
    expect(backoffDelayMs(1, DEFAULT_RETRY_POLICY)).toBe(DEFAULT_RETRY_POLICY.baseDelayMs);
  });

  it("schedules the next attempt from the instant it is given", () => {
    const first = recordFailure(INITIAL_RETRY_STATE, 10_000, options.retry);
    expect(first).toEqual({ failures: 1, nextAttemptAt: 11_000 });
    expect(recordFailure(first, 11_000, options.retry)).toEqual({ failures: 2, nextAttemptAt: 13_000 });
    expect(isDue(first, 10_999)).toBe(false);
    expect(isDue(first, 11_000)).toBe(true);
    expect(isDue(INITIAL_RETRY_STATE, 0)).toBe(true);
  });
});

describe("flushQueue", () => {
  it("delivers every event in batches, oldest first, and empties the queue", async () => {
    const queue = await queueOf(5);
    const batches: string[][] = [];
    const result = await flushQueue(queue, async (batch) => void batches.push(batch.map((e) => e.clientEventId)), INITIAL_FLUSH_STATE, 0, options);
    expect(batches).toEqual([["e1", "e2"], ["e3", "e4"], ["e5"]]);
    expect(result.outcome).toBe("empty");
    expect(result.sent).toBe(5);
    expect(await queue.size()).toBe(0);
  });

  it("does nothing on an empty queue", async () => {
    let calls = 0;
    const result = await flushQueue(createMemoryEventQueue(), async () => void calls++, INITIAL_FLUSH_STATE, 0, options);
    expect(result).toMatchObject({ outcome: "empty", sent: 0 });
    expect(calls).toBe(0);
  });

  it("keeps the events and waits longer after each failure", async () => {
    const queue = await queueOf(3);
    const offline = async () => {
      throw new Error("offline");
    };
    const first = await flushQueue(queue, offline, INITIAL_FLUSH_STATE, 1_000, options);
    expect(first.outcome).toBe("failed");
    expect(first.state.retry).toEqual({ failures: 1, nextAttemptAt: 2_000 });
    expect(await queue.size()).toBe(3);

    let calls = 0;
    const counting = async () => void calls++;
    const early = await flushQueue(queue, counting, first.state, 1_999, options);
    expect(early.outcome).toBe("waiting");
    expect(calls).toBe(0);

    const second = await flushQueue(queue, offline, first.state, 2_000, options);
    expect(second.state.retry).toEqual({ failures: 2, nextAttemptAt: 4_000 });

    const recovered = await flushQueue(queue, counting, second.state, 4_000, options);
    expect(recovered.outcome).toBe("empty");
    expect(recovered.state.retry).toEqual(INITIAL_RETRY_STATE);
    expect(calls).toBe(2);
    expect(await queue.size()).toBe(0);
  });

  it("keeps what was acknowledged when a later batch fails", async () => {
    const queue = await queueOf(5);
    let calls = 0;
    const result = await flushQueue(
      queue,
      async () => {
        if (++calls === 2) throw new Error("lost");
      },
      INITIAL_FLUSH_STATE,
      0,
      options,
    );
    expect(result).toMatchObject({ outcome: "failed", sent: 2 });
    expect((await queue.peekBatch(10)).map((e) => e.clientEventId)).toEqual(["e3", "e4", "e5"]);
  });

  it("never sends an id twice with success, even when the acknowledgement fails", async () => {
    const memory = await queueOf(3);
    let failAck = true;
    const queue: EventQueue = {
      ...memory,
      async ack(ids) {
        if (failAck) throw new Error("storage error");
        await memory.ack(ids);
      },
    };
    const accepted: string[] = [];
    const send = async (batch: readonly PendingEvent[]) => void accepted.push(...batch.map((e) => e.clientEventId));

    const first = await flushQueue(queue, send, INITIAL_FLUSH_STATE, 0, options);
    expect(first.outcome).toBe("failed");
    expect(accepted).toEqual(["e1", "e2"]);
    expect([...first.state.delivered]).toEqual(["e1", "e2"]);
    expect(await memory.size()).toBe(3);

    failAck = false;
    const second = await flushQueue(queue, send, first.state, first.state.retry.nextAttemptAt, options);
    expect(second.outcome).toBe("empty");
    expect(accepted).toEqual(["e1", "e2", "e3"]);
    expect(second.state.delivered.size).toBe(0);
    expect(await memory.size()).toBe(0);
  });

  it("sends an event enqueued twice once", async () => {
    const queue = createMemoryEventQueue();
    await queue.enqueue(event(1));
    await queue.enqueue(event(1));
    const accepted: string[] = [];
    await flushQueue(queue, async (batch) => void accepted.push(...batch.map((e) => e.clientEventId)), INITIAL_FLUSH_STATE, 0, options);
    expect(accepted).toEqual(["e1"]);
  });

  it("ends after maxBatches and says that events remain", async () => {
    const queue = await queueOf(7);
    const result = await flushQueue(queue, async () => {}, INITIAL_FLUSH_STATE, 0, { ...options, maxBatches: 2 });
    expect(result).toMatchObject({ outcome: "more", sent: 4 });
    expect(await queue.size()).toBe(3);
  });

  it("treats a failing queue as a failure, not as an exception", async () => {
    const broken: EventQueue = {
      ...createMemoryEventQueue(),
      async peekBatch() {
        throw new Error("storage unavailable");
      },
    };
    const result = await flushQueue(broken, async () => {}, INITIAL_FLUSH_STATE, 0, options);
    expect(result.outcome).toBe("failed");
  });
});

describe("rejected events", () => {
  const ids = (events: readonly PendingEvent[]) => events.map((e) => e.clientEventId);
  const AT = Date.UTC(2026, 10, 16, 9, 0, 0);

  it("moves a refused event to the rejected store with its reason and still delivers the others", async () => {
    const queue = await queueOf(3);
    const accepted: string[] = [];
    const send = async (batch: readonly PendingEvent[]) => {
      accepted.push(...ids(batch).filter((id) => id !== "e2"));
      return { rejected: [{ clientEventId: "e2", reason: "invalid_schema" }] };
    };
    const result = await flushQueue(queue, send, INITIAL_FLUSH_STATE, AT, options);
    expect(result).toMatchObject({ outcome: "empty", sent: 2, rejected: 1 });
    expect(accepted).toEqual(["e1", "e3"]);
    expect(await queue.size()).toBe(0);
    expect(await queue.rejectedCount()).toBe(1);
    expect(await queue.listRejected(10)).toEqual([
      { ...event(2), reason: "invalid_schema", rejectedAt: new Date(AT).toISOString() },
    ]);
    expect(result.state.rejected.size).toBe(0);
  });

  it("never sends a rejected event again, even when it is enqueued again", async () => {
    const queue = await queueOf(2);
    await flushQueue(queue, async () => ({ rejected: [{ clientEventId: "e1", reason: "too_old" }] }), INITIAL_FLUSH_STATE, AT, options);
    await queue.enqueue(event(1));
    expect(await queue.size()).toBe(0);
    await queue.enqueue(event(3));
    const sent: string[] = [];
    await flushQueue(queue, async (batch) => void sent.push(...ids(batch)), INITIAL_FLUSH_STATE, AT, options);
    expect(sent).toEqual(["e3"]);
    expect(await queue.rejectedCount()).toBe(1);
  });

  it("treats a sender that resolves with nothing as all accepted", async () => {
    const queue = await queueOf(2);
    const result = await flushQueue(queue, async () => undefined, INITIAL_FLUSH_STATE, AT, options);
    expect(result).toMatchObject({ outcome: "empty", sent: 2, rejected: 0 });
    expect(await queue.rejectedCount()).toBe(0);
  });

  it("ignores a refusal for an id that was not in the batch", async () => {
    const queue = await queueOf(1);
    const result = await flushQueue(queue, async () => ({ rejected: [{ clientEventId: "ghost", reason: "other" }] }), INITIAL_FLUSH_STATE, AT, options);
    expect(result).toMatchObject({ sent: 1, rejected: 0 });
    expect(await queue.rejectedCount()).toBe(0);
    expect(result.state.rejected.size).toBe(0);
  });

  it.each(["", "Bad Reason", "with-dash", "x".repeat(65)])("replaces the reason %j by invalid_reason", async (reason) => {
    const queue = await queueOf(1);
    await flushQueue(queue, async () => ({ rejected: [{ clientEventId: "e1", reason }] }), INITIAL_FLUSH_STATE, AT, options);
    expect((await queue.listRejected(10)).map((e) => e.reason)).toEqual(["invalid_reason"]);
  });

  it("records a refusal at the next call, without sending the event again, when reject fails once", async () => {
    const memory = await queueOf(2);
    let failReject = true;
    const queue: EventQueue = {
      ...memory,
      async reject(entries) {
        if (failReject) throw new Error("storage error");
        await memory.reject(entries);
      },
    };
    const sent: string[] = [];
    const send = async (batch: readonly PendingEvent[]) => {
      sent.push(...ids(batch));
      return { rejected: [{ clientEventId: "e1", reason: "foreign_session" }] };
    };

    const first = await flushQueue(queue, send, INITIAL_FLUSH_STATE, AT, options);
    expect(first.outcome).toBe("failed");
    expect(first.rejected).toBe(0);
    expect([...first.state.rejected]).toEqual([["e1", "foreign_session"]]);
    expect(await memory.size()).toBe(2);

    failReject = false;
    const second = await flushQueue(queue, send, first.state, first.state.retry.nextAttemptAt, options);
    expect(second).toMatchObject({ outcome: "empty", sent: 0, rejected: 1 });
    expect(sent).toEqual(["e1", "e2"]);
    expect(await memory.size()).toBe(0);
    expect((await memory.listRejected(10)).map((e) => e.reason)).toEqual(["foreign_session"]);
    expect(second.state.rejected.size).toBe(0);
  });

  it("keeps rejected events oldest first, does not duplicate them, and discards them on request", async () => {
    const queue = await queueOf(3);
    const entry = (n: number) => ({ clientEventId: `e${n}`, reason: "other", rejectedAt: "2026-11-16T09:00:00.000Z" });
    await queue.reject([entry(2), entry(1), entry(9)]);
    await queue.reject([entry(2)]);
    expect(await queue.size()).toBe(1);
    expect(await queue.rejectedCount()).toBe(2);
    expect(ids(await queue.listRejected(1))).toEqual(["e2"]);
    await queue.discardRejected(["e2", "unknown"]);
    expect(ids(await queue.listRejected(10))).toEqual(["e1"]);
    expect(await queue.rejectedCount()).toBe(1);
  });
});
