import { DEFAULT_RETRY_POLICY, INITIAL_RETRY_STATE, isDue, recordFailure, type RetryPolicy, type RetryState } from "./retry";
import type { BatchSender, DeliveryReport, EventQueue, PendingEvent } from "./types";

export interface FlushOptions {
  /** Events per delivery. */
  batchSize: number;
  /** Deliveries per call, so that a call always ends. */
  maxBatches: number;
  retry: RetryPolicy;
}

export const DEFAULT_FLUSH_OPTIONS: FlushOptions = { batchSize: 20, maxBatches: 50, retry: DEFAULT_RETRY_POLICY };

/**
 * What a flush carries from one call to the next. `delivered` holds the ids the server accepted but
 * that are still in the queue (the removal failed): they are removed without being sent again, so
 * this client never delivers an id twice with success. `rejected` (id to reason) holds the refusals
 * received but not yet recorded in the rejected store (`reject()` failed): they are recorded at the
 * next call, never sent again.
 */
export interface FlushState {
  retry: RetryState;
  delivered: ReadonlySet<string>;
  rejected: ReadonlyMap<string, string>;
}

export const INITIAL_FLUSH_STATE: FlushState = { retry: INITIAL_RETRY_STATE, delivered: new Set(), rejected: new Map() };

const REASON_FORMAT = /^[a-z_]{1,64}$/;
const INVALID_REASON = "invalid_reason";

export type FlushOutcome =
  /** Nothing left to deliver. */
  | "empty"
  /** The delay of an earlier failure has not elapsed: nothing was attempted. */
  | "waiting"
  /** A step failed: the next attempt is later, at `state.retry.nextAttemptAt`. */
  | "failed"
  /** `maxBatches` deliveries went through and events remain: call again. */
  | "more";

export interface FlushResult {
  outcome: FlushOutcome;
  /** Events newly accepted by the server during this call. */
  sent: number;
  /** Refusals newly recorded in the rejected store during this call. */
  rejected: number;
  state: FlushState;
}

/** The events once each, in order (a queue should not hold duplicates; this is a safeguard). */
function uniqueById(batch: readonly PendingEvent[]): PendingEvent[] {
  const seen = new Set<string>();
  return batch.filter((event) => !seen.has(event.clientEventId) && seen.add(event.clientEventId));
}

/**
 * Delivers the queued events in batches, oldest first, at `now` (epoch milliseconds, read by the
 * caller: nothing here reads a clock). A failure ends the call and schedules the next attempt with a
 * growing delay; a full success clears the delay. Events the sender reports as permanently refused
 * move to the rejected store and are never sent again. Never throws because of a failing sender or queue.
 */
export async function flushQueue(
  queue: EventQueue,
  send: BatchSender,
  state: FlushState,
  now: number,
  options: FlushOptions = DEFAULT_FLUSH_OPTIONS,
): Promise<FlushResult> {
  if (!isDue(state.retry, now)) return { outcome: "waiting", sent: 0, rejected: 0, state };

  let delivered = state.delivered;
  let refused = state.rejected;
  let sent = 0;
  let rejected = 0;
  const failed = (): FlushResult => ({
    outcome: "failed",
    sent,
    rejected,
    state: { retry: recordFailure(state.retry, now, options.retry), delivered, rejected: refused },
  });
  const finished = (outcome: "empty" | "more"): FlushResult => ({
    outcome,
    sent,
    rejected,
    state: { retry: INITIAL_RETRY_STATE, delivered, rejected: refused },
  });

  for (let round = 0; round < options.maxBatches; round++) {
    let batch: PendingEvent[];
    try {
      batch = uniqueById(await queue.peekBatch(options.batchSize));
    } catch {
      return failed();
    }
    if (batch.length === 0) return finished("empty");

    const toSend = batch.filter((event) => !delivered.has(event.clientEventId) && !refused.has(event.clientEventId));
    if (toSend.length > 0) {
      let report: DeliveryReport | void;
      try {
        report = await send(toSend);
      } catch {
        return failed();
      }
      const sentIds = new Set(toSend.map((event) => event.clientEventId));
      const newRefusals = new Map<string, string>();
      for (const { clientEventId, reason } of report?.rejected ?? []) {
        // An id that was not in this batch is not ours to act on.
        if (sentIds.has(clientEventId)) newRefusals.set(clientEventId, REASON_FORMAT.test(reason) ? reason : INVALID_REASON);
      }
      refused = new Map([...refused, ...newRefusals]);
      const accepted = toSend.filter((event) => !newRefusals.has(event.clientEventId));
      delivered = new Set([...delivered, ...accepted.map((event) => event.clientEventId)]);
      sent += accepted.length;
    }

    const batchIds = new Set(batch.map((event) => event.clientEventId));
    const toReject = [...refused].filter(([id]) => batchIds.has(id));
    if (toReject.length > 0) {
      try {
        const rejectedAt = new Date(now).toISOString();
        await queue.reject(toReject.map(([clientEventId, reason]) => ({ clientEventId, reason, rejectedAt })));
      } catch {
        return failed();
      }
      rejected += toReject.length;
      refused = new Map([...refused].filter(([id]) => !batchIds.has(id)));
    }

    const rejectedIds = new Set(toReject.map(([id]) => id));
    try {
      await queue.ack(batch.map((event) => event.clientEventId).filter((id) => !rejectedIds.has(id)));
    } catch {
      return failed();
    }
    delivered = new Set([...delivered].filter((id) => !batchIds.has(id)));
  }
  return finished("more");
}
