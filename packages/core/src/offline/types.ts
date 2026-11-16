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

/** An event the server refused for good: it is never sent again. `rejectedAt` is an ISO 8601 instant. */
export interface RejectedEvent extends PendingEvent {
  reason: string;
  rejectedAt: string;
}

/**
 * Durable first-in, first-out store of the events not delivered yet, plus the store of the events
 * the server refused for good. The browser implements it with IndexedDB; the tests with
 * `createMemoryEventQueue`.
 */
export interface EventQueue {
  /** Appends an event. An event whose `clientEventId` is already queued, or already rejected, is ignored. */
  enqueue(event: PendingEvent): Promise<void>;
  /** The oldest `limit` events, oldest first, without removing them. */
  peekBatch(limit: number): Promise<PendingEvent[]>;
  /** Removes the events with these ids (unknown ids are ignored). */
  ack(clientEventIds: readonly string[]): Promise<void>;
  size(): Promise<number>;
  /**
   * Moves these events, atomically, from the queue to the store of the rejected ones. Unknown ids are
   * ignored; an id already rejected is not duplicated.
   */
  reject(entries: readonly { clientEventId: string; reason: string; rejectedAt: string }[]): Promise<void>;
  /** The oldest `limit` rejected events, oldest first, without removing them. */
  listRejected(limit: number): Promise<RejectedEvent[]>;
  /** Forgets the rejected events with these ids (unknown ids are ignored). */
  discardRejected(clientEventIds: readonly string[]): Promise<void>;
  rejectedCount(): Promise<number>;
}

/** An event the server will always refuse (invalid schema, someone else's session, too old). */
export interface RejectedDelivery {
  clientEventId: string;
  /** Stable code, `[a-z_]`, 1 to 64 characters. */
  reason: string;
}

export interface DeliveryReport {
  rejected: readonly RejectedDelivery[];
}

/**
 * Delivers a batch. Resolves when the server has dealt with the whole batch: every event is either
 * accepted (a repeated delivery counts as accepted: the server is idempotent on `clientEventId`) or
 * listed in `rejected`, a permanent refusal; resolving with nothing means all accepted. Rejects for a
 * passing failure of the whole batch (network, 5xx, signed out): the batch is sent again later.
 */
export type BatchSender = (batch: readonly PendingEvent[]) => Promise<DeliveryReport | void>;
