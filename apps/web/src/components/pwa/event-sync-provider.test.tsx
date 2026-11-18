// @vitest-environment jsdom
import type { PendingEvent } from "@dailylingua/core";
import { render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queue = { enqueue: vi.fn<(event: PendingEvent) => Promise<void>>(async () => undefined), size: vi.fn(async () => 4) };
const stop = vi.fn();
const flushNow = vi.fn(async () => ({ outcome: "empty" }));
const createQueue = vi.fn<(name: string) => typeof queue>(() => queue);
const start = vi.fn<(options: unknown) => { stop: typeof stop; flushNow: typeof flushNow }>(() => ({ stop, flushNow }));
let available = true;
vi.mock("@/lib/offline/indexeddb-queue", () => ({ createIndexedDbEventQueue: (name: string) => createQueue(name), indexedDbAvailable: () => available }));
vi.mock("@/lib/offline/event-sync", () => ({ startEventSync: (options: unknown) => start(options) }));

const { EventSyncProvider, useEventSync } = await import("./event-sync-provider");

let seen: ReturnType<typeof useEventSync> = null;
function Probe() {
  const api = useEventSync();
  useEffect(() => {
    seen = api;
  });
  return null;
}

const event: PendingEvent = { clientEventId: "e1", kind: "ui_event", payload: {}, occurredAt: "2026-11-18T08:00:00.000Z" };

beforeEach(() => {
  vi.clearAllMocks();
  available = true;
  seen = null;
});

describe("EventSyncProvider", () => {
  it("opens the queue of the user, starts the delivery with the HTTP sender and stops it on unmount", () => {
    const view = render(
      <EventSyncProvider userId="user-1">
        <Probe />
      </EventSyncProvider>,
    );
    expect(createQueue).toHaveBeenCalledWith("dailylingua-events-user-1");
    expect(start).toHaveBeenCalledTimes(1);
    expect((start.mock.calls[0]?.[0] as { queue: unknown; send: unknown }).queue).toBe(queue);
    expect(typeof (start.mock.calls[0]?.[0] as { send: unknown }).send).toBe("function");
    expect(seen?.userId).toBe("user-1");
    view.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("enqueues in the queue of the user and asks for a delivery, and reports the size of the queue", async () => {
    render(
      <EventSyncProvider userId="user-1">
        <Probe />
      </EventSyncProvider>,
    );
    await seen?.enqueue(event);
    expect(queue.enqueue).toHaveBeenCalledWith(event);
    await waitFor(() => expect(flushNow).toHaveBeenCalledTimes(1));
    expect(await seen?.queueSize()).toBe(4);
  });

  it("uses another queue for another user", () => {
    const view = render(
      <EventSyncProvider userId="user-1">
        <Probe />
      </EventSyncProvider>,
    );
    view.rerender(
      <EventSyncProvider userId="user-2">
        <Probe />
      </EventSyncProvider>,
    );
    expect(createQueue.mock.calls.map((call) => call[0])).toEqual(["dailylingua-events-user-1", "dailylingua-events-user-2"]);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(seen?.userId).toBe("user-2");
  });

  it("gives an empty context, and starts nothing, without IndexedDB", () => {
    available = false;
    render(
      <EventSyncProvider userId="user-1">
        <Probe />
      </EventSyncProvider>,
    );
    expect(seen).toBeNull();
    expect(start).not.toHaveBeenCalled();
  });
});
