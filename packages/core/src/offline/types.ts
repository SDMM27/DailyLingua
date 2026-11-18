/**
 * An event produced on the device while it may be offline. `clientEventId` is chosen by the client
 * (a UUID) and is the idempotency key: the server must treat a second delivery of the same id as
 * the first one. `payload` is JSON-serialisable; `occurredAt` is an ISO 8601 instant, the moment the
 * learner acted, not the moment of delivery.
 */
export interface PendingEvent {
  clientEventId: string;
  kind: string;
  payload: unknown;
  occurredAt: string;
}

/**
 * Durable first-in, first-out store of the events not delivered yet. The browser implements it with
 * IndexedDB; the tests with `createMemoryEventQueue`.
 */
export interface EventQueue {
  /** Appends an event. An event whose `clientEventId` is already queued is ignored. */
  enqueue(event: PendingEvent): Promise<void>;
  /** The oldest `limit` events, oldest first, without removing them. */
  peekBatch(limit: number): Promise<PendingEvent[]>;
  /** Removes the events with these ids (unknown ids are ignored). */
  ack(clientEventIds: readonly string[]): Promise<void>;
  size(): Promise<number>;
}

/**
 * Delivers a batch. Resolves when the server has accepted every event of the batch (a repeated
 * delivery counts as accepted: the server is idempotent on `clientEventId`); rejects otherwise.
 */
export type BatchSender = (batch: readonly PendingEvent[]) => Promise<void>;
