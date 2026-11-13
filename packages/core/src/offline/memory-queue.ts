import type { EventQueue, PendingEvent } from "./types";

/** In-memory `EventQueue`: for tests and for environments without durable storage. */
export function createMemoryEventQueue(initial: readonly PendingEvent[] = []): EventQueue {
  const events = new Map<string, PendingEvent>();
  for (const event of initial) if (!events.has(event.clientEventId)) events.set(event.clientEventId, event);
  return {
    async enqueue(event) {
      if (!events.has(event.clientEventId)) events.set(event.clientEventId, event);
    },
    async peekBatch(limit) {
      // A Map iterates in insertion order: oldest first.
      return [...events.values()].slice(0, Math.max(0, Math.floor(limit)));
    },
    async ack(clientEventIds) {
      for (const id of clientEventIds) events.delete(id);
    },
    async size() {
      return events.size;
    },
  };
}
