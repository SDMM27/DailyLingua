import "server-only";
import { z } from "zod";
import { addDays, deterministicUuid, learningDay, planIngest, type IngestState, type RawEvent, type RejectedDelivery } from "@dailylingua/core";
import {
  IngestBatchError,
  callIngestBatch,
  readIngestRows,
  readVerifiedSentences,
  type AppClient,
  type DayWindow,
  type IngestBatchResult,
  type IngestRefs,
  type IngestRows,
} from "@dailylingua/data";
import { ingestBatchPayloadSchema, ingestMemoSchema, rejectionReasons, type DeliveryReportValue, type IngestMemo, type RejectionReason } from "@dailylingua/schemas";
import { filterReviewModes } from "./card-keys";
import { buildIngestState } from "./build-state";
import { buildNextMemo } from "./next-memo";
import { extractRefs, extractSentenceIds } from "./refs";
import type { CheckRewrites } from "./rewrite-checks";

/**
 * The ingestion of a batch of events (`j2-pr1-lot-w.md` section 5): read the state, decide with `planIngest` (core),
 * write with `app.ingest_batch`. The caller (the route) has authenticated `userId`; nothing here reads it from an event.
 */

/** Optimistic-concurrency retries (the state moved between the read and the write) before a passing failure. */
export const MAX_STALE_ATTEMPTS = 3;
/** Size `ingest_batch` accepts (`1 MiB`): above it the batch is split event by event. */
export const MAX_PAYLOAD_BYTES = 1_048_576;
/** Calls the isolation mode makes at most: one per event of a batch. */
export const MAX_ISOLATION_EVENTS = 50;
/** `production_submitted` accepted per rolling 24 hours of reception (W-I1): the next ones are `too_many`. */
export const MAX_PRODUCTIONS_PER_24H = 10;

export type LogFn = (level: "warn" | "error", message: string, data?: Record<string, unknown>) => void;

/** The two things this module needs from the database; the route builds it on the service client, tests fake it. */
export interface IngestStore {
  readRows(userId: string, refs: IngestRefs, window: (timeZone: string) => DayWindow, now: Date): Promise<IngestRows>;
  callBatch(userId: string, expectedSeq: number, payload: unknown): Promise<IngestBatchResult>;
  checkRewrites?: CheckRewrites;
  readVerifiedSentences?(userId: string, correctionIds: readonly string[]): Promise<IngestState["verifiedSentences"]>;
}

export function createIngestStore(service: AppClient, checkRewrites?: CheckRewrites): IngestStore {
  return {
    readRows: (userId, refs, window, now) => readIngestRows(service, userId, refs, window, now),
    callBatch: (userId, expectedSeq, payload) => callIngestBatch(service, userId, expectedSeq, payload),
    checkRewrites,
    readVerifiedSentences: (userId, ids) => readVerifiedSentences(service, userId, ids),
  };
}

/** A failure that is nobody's fault but the server's (database busy or down, state moving): the client sends again later. */
export class IngestTransientError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "IngestTransientError";
  }
}

export interface IngestResult {
  /** The events refused for good, with the reason. */
  rejected: RejectedDelivery[];
  /** Events that were already ingested (nothing was written for them). */
  duplicates: string[];
  /** What the route answers. */
  report: DeliveryReportValue;
  feedbackEligible?: boolean;
}

const defaultLog: LogFn = (level, message, data) => (level === "error" ? console.error : console.warn)(`[ingest] ${message}`, data ?? {});

const reasons: ReadonlySet<string> = new Set(rejectionReasons);
const asReason = (reason: string): RejectionReason => (reasons.has(reason) ? (reason as RejectionReason) : "invalid_payload");

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const eventIdSchema = z.uuid();

/**
 * Units that are not published are graded only with `UNIT_DRAFTS=show` (local work, previews), and never on the
 * production deployment of Vercel whatever the variable says. Read at call time.
 */
export function unitDraftsAllowed(env: Record<string, string | undefined> = process.env): boolean {
  return env.UNIT_DRAFTS === "show" && env.VERCEL_ENV !== "production";
}

/** Days of sessions of the user read around the server day (`ingest-rows`: server day - 8 to + 1). */
const windowOf = (now: Date) => (timeZone: string): DayWindow => {
  const today = learningDay(now, timeZone);
  return { from: addDays(today, -8), to: addDays(today, 1) };
};

/**
 * The cap on productions, applied before `planIngest`: at most 10 accepted per rolling 24 hours of reception, whatever
 * the day the events claim. The productions the server received in the last 24 hours (`received`, read from the
 * database) and the ones of this batch, in batch order, count. A replay of an event the ledger knows passes (it is a
 * duplicate, not a new production); an event without a readable id passes too (the plan refuses it).
 */
function capProductions(events: readonly unknown[], state: IngestState, received: number): { kept: unknown[]; rejected: RejectedDelivery[] } {
  let count = received;
  const kept: unknown[] = [];
  const rejected: RejectedDelivery[] = [];
  for (const event of events) {
    if (!isRecord(event) || event.kind !== "production_submitted" || typeof event.clientEventId !== "string" || Object.hasOwn(state.knownEvents, event.clientEventId)) {
      kept.push(event);
      continue;
    }
    if (count >= MAX_PRODUCTIONS_PER_24H) {
      rejected.push({ clientEventId: event.clientEventId, reason: "too_many" });
      continue;
    }
    count++;
    kept.push(event);
  }
  return { kept, rejected };
}

interface Outcome {
  rejected: RejectedDelivery[];
  duplicates: string[];
  feedbackEligible?: boolean;
}

interface FeedbackTarget {
  productionId: string;
  sessionId: string;
  deferred?: boolean;
}

function memoOf(raw: unknown, log: LogFn, userId: string): IngestMemo | null {
  if (isRecord(raw) && Object.keys(raw).length === 0) return null;
  const parsed = ingestMemoSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  log("error", "the stored memo is unreadable and was ignored", { userId });
  return null;
}

/** One read, one decision, one write, for these events. Throws `IngestBatchError` when SQL refuses or the state moved. */
async function processOnce(store: IngestStore, userId: string, events: readonly unknown[], now: Date, log: LogFn, feedbackTarget?: FeedbackTarget): Promise<Outcome> {
  const eventRefs = extractRefs(events);
  const refs = feedbackTarget ? {
    ...eventRefs,
    productionIds: [...eventRefs.productionIds, feedbackTarget.productionId],
    sessionIds: [...eventRefs.sessionIds, feedbackTarget.sessionId],
  } : eventRefs;
  const rows = await store.readRows(userId, refs, windowOf(now), now);
  const previousMemo = memoOf(rows.ingestState.memo, log, userId);
  const serverDay = learningDay(now, rows.profile.timeZone);
  const allowDrafts = unitDraftsAllowed();
  const { state, cardModes, skippedSessions } = buildIngestState({ userId, rows, memo: previousMemo, serverDay, feedbackTarget, unitIds: refs.unitIds, sentenceIds: extractSentenceIds(events), allowDrafts });
  if (refs.correctionIds?.length && store.readVerifiedSentences) {
    state.verifiedSentences = await store.readVerifiedSentences(userId, refs.correctionIds);
  }
  if (skippedSessions.length > 0) log("warn", "stored session plans could not be read and were left out", { userId, sessions: skippedSessions });

  const { kept, rejected: refusedModes } = filterReviewModes(events, cardModes, state.knownEvents);
  const { kept: capped, rejected: tooMany } = capProductions(kept, state, rows.recentProductionCount);
  const options = { allowDrafts };
  let plan = planIngest(state, capped as RawEvent[], now, options);
  if (store.checkRewrites && plan.payload.rewrites.length > 0) {
    const rewriteChecks = await store.checkRewrites({ state: plan.nextState, rows: plan.payload.rewrites, now });
    if (Object.values(rewriteChecks).some((check) => check.fixedErrorIds.length > 0)) {
      plan = planIngest({ ...state, rewriteChecks }, capped as RawEvent[], now, options);
    }
  }

  // The ledger: the fingerprint of every event this batch accepted, with the kind of the raw event.
  const kindOf = new Map<string, string>();
  for (const event of capped) if (isRecord(event) && typeof event.clientEventId === "string" && typeof event.kind === "string") kindOf.set(event.clientEventId, event.kind);
  const ledger = Object.entries(plan.nextState.knownEvents)
    .filter(([id, fingerprint]) => !Object.hasOwn(state.knownEvents, id) && fingerprint !== null && kindOf.has(id))
    .map(([id, fingerprint]) => ({ client_event_id: id, kind: kindOf.get(id) as string, fingerprint: fingerprint as string }));

  // D4: the right answers that earned nothing leave a trace, idempotent by construction.
  const now_ = now.toISOString();
  const zeroed = new Map<string, { client_event_id: string; name: "xp_zeroed"; value: { clientEventId: string; reason: string }; occurred_at: string }>();
  for (const { clientEventId, reason } of plan.report.zeroed) {
    const id = deterministicUuid(`xp_zeroed:${clientEventId}:${reason}`);
    zeroed.set(id, { client_event_id: id, name: "xp_zeroed", value: { clientEventId, reason }, occurred_at: now_ });
  }

  const empty = ledger.length === 0 && zeroed.size === 0 && Object.values(plan.payload).every((value) => (Array.isArray(value) ? value.length === 0 : value === null));
  const outcome: Outcome = {
    rejected: [...plan.rejected, ...refusedModes, ...tooMany],
    duplicates: [...plan.report.duplicates],
    ...(feedbackTarget ? { feedbackEligible: plan.nextState.productions[feedbackTarget.productionId]?.feedbackEligible === true } : {}),
  };
  // Nothing to write (replays, refusals): the sequence is left alone.
  if (empty) return outcome;

  const payload = {
    ...plan.payload,
    ui_events: [...plan.payload.ui_events, ...zeroed.values()],
    events: ledger,
    memo: buildNextMemo(previousMemo, plan.nextState, serverDay),
  };
  const checked = ingestBatchPayloadSchema.safeParse(payload);
  if (!checked.success) throw new IngestBatchError("refused", null, `the payload does not match the contract: ${checked.error.issues[0]?.message ?? ""}`);
  if (new TextEncoder().encode(JSON.stringify(checked.data)).length > MAX_PAYLOAD_BYTES) throw new IngestBatchError("refused", null, "the payload is over 1 MiB");

  const written = await store.callBatch(userId, rows.ingestState.seq, checked.data);
  return { ...outcome, duplicates: [...new Set([...outcome.duplicates, ...written.duplicates])] };
}

/** `processOnce`, started again from a fresh read when the sequence moved (two tabs, two devices), then a passing failure. */
async function processWithRetry(store: IngestStore, userId: string, events: readonly unknown[], now: Date, log: LogFn, feedbackTarget?: FeedbackTarget): Promise<Outcome> {
  for (let attempt = 1; attempt <= MAX_STALE_ATTEMPTS; attempt++) {
    try {
      return await processOnce(store, userId, events, now, log, feedbackTarget);
    } catch (error) {
      if (error instanceof IngestBatchError && error.code === "stale") continue;
      throw error;
    }
  }
  throw new IngestTransientError("the state kept moving");
}

/** The order events are replayed in during the isolation: by instant, then as received (an unreadable instant goes last). */
function isolationOrder(events: readonly unknown[]): unknown[] {
  const instant = (event: unknown) => (isRecord(event) && typeof event.occurredAt === "string" ? event.occurredAt : "￿");
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => (instant(a.event) < instant(b.event) ? -1 : instant(a.event) > instant(b.event) ? 1 : a.index - b.index))
    .map(({ event }) => event);
}

/**
 * Ingests the events of one delivery for `userId`. A batch SQL refuses for good (classes 22 and 23, 42501) is replayed
 * event by event, the state read again each time: the one that is refused again is `server_refused`, the others pass
 * (D9). Throws `IngestTransientError` for what a later delivery may fix (busy, unavailable, state moving).
 */
export async function ingestEvents(input: { store: IngestStore; userId: string; events: readonly unknown[]; now: Date; log?: LogFn; feedbackTarget?: FeedbackTarget }): Promise<IngestResult> {
  const { store, userId, events, now } = input;
  const log = input.log ?? defaultLog;

  let outcome: Outcome;
  try {
    outcome = await processWithRetry(store, userId, events, now, log, input.feedbackTarget);
  } catch (error) {
    if (events.length > 0 && error instanceof IngestBatchError && error.code === "refused") {
      log("warn", "a batch was refused by the database and is replayed event by event", { userId, sqlstate: error.sqlstate, message: error.message });
      outcome = await isolate(store, userId, events, now, log);
    } else throw toTransient(error, log, userId);
  }

  const seen = new Set<string>();
  const rejected = outcome.rejected
    .map((entry) => ({ clientEventId: entry.clientEventId, reason: asReason(entry.reason) }))
    .filter((entry) => eventIdSchema.safeParse(entry.clientEventId).success)
    .filter((entry) => (seen.has(entry.clientEventId) ? false : (seen.add(entry.clientEventId), true)));
  return { ...outcome, rejected, report: { rejected } };
}

async function isolate(store: IngestStore, userId: string, events: readonly unknown[], now: Date, log: LogFn): Promise<Outcome> {
  const rejected: RejectedDelivery[] = [];
  const duplicates = new Set<string>();
  const ordered = isolationOrder(events);
  for (const event of ordered.slice(0, MAX_ISOLATION_EVENTS)) {
    try {
      const single = await processWithRetry(store, userId, [event], now, log);
      rejected.push(...single.rejected);
      for (const id of single.duplicates) duplicates.add(id);
    } catch (error) {
      if (error instanceof IngestBatchError && error.code === "refused") {
        const id = isRecord(event) && typeof event.clientEventId === "string" ? event.clientEventId : null;
        log("warn", "an event is refused by the database", { userId, clientEventId: id, sqlstate: error.sqlstate, message: error.message });
        if (id !== null) rejected.push({ clientEventId: id, reason: "server_refused" });
      } else throw toTransient(error, log, userId);
    }
  }
  for (const event of ordered.slice(MAX_ISOLATION_EVENTS)) {
    if (isRecord(event) && typeof event.clientEventId === "string" && !duplicates.has(event.clientEventId)) {
      rejected.push({ clientEventId: event.clientEventId, reason: "server_refused" });
    }
  }
  return { rejected, duplicates: [...duplicates] };
}

function toTransient(error: unknown, log: LogFn, userId: string): IngestTransientError {
  if (error instanceof IngestTransientError) return error;
  // The SQL message goes to the log, never to the response.
  log("error", "ingestion failed", { userId, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error), code: error instanceof IngestBatchError ? error.code : undefined, sqlstate: error instanceof IngestBatchError ? error.sqlstate : undefined });
  return new IngestTransientError("ingestion failed", error);
}
