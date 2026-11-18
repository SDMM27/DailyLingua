import type { EventQueue, PendingEvent, RejectedEvent } from "./types";

/** In-memory `EventQueue`: for tests and for environments without durable storage. */
export function createMemoryEventQueue(initial: readonly PendingEvent[] = []): EventQueue {
  const events = new Map<string, PendingEvent>();
  const rejected = new Map<string, RejectedEvent>();
  for (const event of initial) if (!events.has(event.clientEventId)) events.set(event.clientEventId, event);
  return {
    async enqueue(event) {
      // An id the server refused is never sent again.
      if (!events.has(event.clientEventId) && !rejected.has(event.clientEventId)) events.set(event.clientEventId, event);
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
    async reject(entries) {
      for (const { clientEventId, reason, rejectedAt } of entries) {
        const event = events.get(clientEventId);
        if (!event) continue;
        events.delete(clientEventId);
        if (!rejected.has(clientEventId)) rejected.set(clientEventId, { ...event, reason, rejectedAt });
      }
    },
    async listRejected(limit) {
      return [...rejected.values()].slice(0, Math.max(0, Math.floor(limit)));
    },
    async discardRejected(clientEventIds) {
      for (const id of clientEventIds) rejected.delete(id);
    },
    async rejectedCount() {
      return rejected.size;
    },
  };
}
