import { createMemoryEventQueue, type PendingEvent } from "@dailylingua/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startEventSync } from "./event-sync";

function event(n: number): PendingEvent {
  return { clientEventId: `e${n}`, kind: "test", payload: null, occurredAt: "2026-11-13T08:00:00.000Z" };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", new EventTarget());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("startEventSync", () => {
  it("retries after a growing delay and as soon as the network returns", async () => {
    const queue = createMemoryEventQueue([event(1), event(2), event(3)]);
    let online = false;
    const delivered: string[] = [];
    const results: string[] = [];
    const sync = startEventSync({
      queue,
      send: async (batch) => {
        if (!online) throw new Error("offline");
        delivered.push(...batch.map((e) => e.clientEventId));
      },
      onResult: (result) => results.push(result.outcome),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(results).toEqual(["failed"]);
    expect(await queue.size()).toBe(3);

    // Still offline when the first delay (2 s) has passed: a second failure, a longer wait.
    await vi.advanceTimersByTimeAsync(2_000);
    expect(results).toEqual(["failed", "failed"]);

    // The network returns: no need to wait for the 4 s delay.
    online = true;
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);
    expect(results).toEqual(["failed", "failed", "empty"]);
    expect(delivered).toEqual(["e1", "e2", "e3"]);
    expect(await queue.size()).toBe(0);
    sync.stop();
  });

  it("does not report or retry once stopped", async () => {
    const queue = createMemoryEventQueue([event(1)]);
    const onResult = vi.fn();
    const sync = startEventSync({
      queue,
      send: async () => {
        throw new Error("offline");
      },
      onResult,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(onResult).toHaveBeenCalledTimes(1);
    sync.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(onResult).toHaveBeenCalledTimes(1);
  });
});
