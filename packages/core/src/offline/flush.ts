import { DEFAULT_RETRY_POLICY, INITIAL_RETRY_STATE, isDue, recordFailure, type RetryPolicy, type RetryState } from "./retry";
import type { BatchSender, EventQueue, PendingEvent } from "./types";

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
 * this client never delivers an id twice with success.
 */
export interface FlushState {
  retry: RetryState;
  delivered: ReadonlySet<string>;
}

export const INITIAL_FLUSH_STATE: FlushState = { retry: INITIAL_RETRY_STATE, delivered: new Set() };

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
 * growing delay; a full success clears the delay. Never throws because of a failing sender or queue.
 */
export async function flushQueue(
  queue: EventQueue,
  send: BatchSender,
  state: FlushState,
  now: number,
  options: FlushOptions = DEFAULT_FLUSH_OPTIONS,
): Promise<FlushResult> {
  if (!isDue(state.retry, now)) return { outcome: "waiting", sent: 0, state };

  let delivered = state.delivered;
  let sent = 0;
  const failed = (): FlushResult => ({
    outcome: "failed",
    sent,
    state: { retry: recordFailure(state.retry, now, options.retry), delivered },
  });

  for (let round = 0; round < options.maxBatches; round++) {
    let batch: PendingEvent[];
    try {
      batch = uniqueById(await queue.peekBatch(options.batchSize));
    } catch {
      return failed();
    }
    if (batch.length === 0) return { outcome: "empty", sent, state: { retry: INITIAL_RETRY_STATE, delivered } };

    const toSend = batch.filter((event) => !delivered.has(event.clientEventId));
    if (toSend.length > 0) {
      try {
        await send(toSend);
      } catch {
        return failed();
      }
      delivered = new Set([...delivered, ...toSend.map((event) => event.clientEventId)]);
      sent += toSend.length;
    }

    const ids = batch.map((event) => event.clientEventId);
    try {
      await queue.ack(ids);
    } catch {
      return failed();
    }
    delivered = new Set([...delivered].filter((id) => !ids.includes(id)));
  }
  return { outcome: "more", sent, state: { retry: INITIAL_RETRY_STATE, delivered } };
}
