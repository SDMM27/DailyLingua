import { z } from "zod";
import { dateKeySchema } from "../common";
import { reviewModeSchema } from "./client-events";
import { ingestPayloadSchema } from "./ingest-payload";
import { rejectionReasonSchema } from "./rules";

/**
 * What the server persists besides the rows of the learner's work (`j2-pr1-lot-w.md`, D3): the memo of derived state
 * that `app.ingest_state.memo` holds, the batch payload `app.ingest_batch` takes, the plan stored in `session.plan`
 * and the delivery report `POST /api/events` answers with.
 */

/** Counters of one learning day: the same shape as `StateDay` of `@dailylingua/core/ingest` (a test in `apps/web` checks it). */
export const stateDaySchema = z.strictObject({
  xpByReason: z.record(z.string(), z.number()),
  reviewSuccesses: z.number().int().min(0),
  newCards: z.number().int().min(0),
  readingTexts: z.number().int().min(0),
  rewards: z.record(z.string(), z.number()),
  focusBySession: z.record(z.string(), z.number()),
  rewardsByCorrection: z.record(z.string(), z.number()),
  counted: z.array(z.string()),
});
export type StateDayValue = z.infer<typeof stateDaySchema>;

/** `app.ingest_state.memo`: at most 256 KiB of JSON (checked by the writer and by SQL). */
export const MAX_MEMO_BYTES = 262_144;

export const ingestMemoSchema = z.strictObject({
  v: z.literal(1),
  /** Counters of the recent days, by day of the action. */
  days: z.record(dateKeySchema, stateDaySchema),
  /** State of the texts the learner earned reading XP on. */
  texts: z.record(z.uuid(), z.strictObject({ readingEarnedDay: dateKeySchema.nullable(), referenceWpm: z.number().nullable() })),
  /** State of the productions that are not settled long ago. */
  productions: z.record(
    z.uuid(),
    z.strictObject({ day: dateKeySchema, late: z.boolean(), settled: z.boolean(), correctionDeferred: z.boolean() }),
  ),
  catchUpDays: z.array(dateKeySchema),
});
export type IngestMemo = z.infer<typeof ingestMemoSchema>;

/** An entry of the ledger of ingested events (`app.ingest_event`): the fingerprint of the delivered event. */
export const ingestEventEntrySchema = z.strictObject({
  client_event_id: z.uuid(),
  kind: z.string().regex(/^[a-z_]{1,40}$/),
  fingerprint: z.string().regex(/^[0-9a-f]{32}$/),
});
export type IngestEventEntry = z.infer<typeof ingestEventEntrySchema>;

/** The `p_payload` of `app.ingest_batch` once the ledger (`events`) and the memo are added to the payload `planIngest` makes. */
export const ingestBatchPayloadSchema = ingestPayloadSchema.extend({
  events: z.array(ingestEventEntrySchema).max(500),
  memo: ingestMemoSchema.nullable(),
});
export type IngestBatchPayload = z.infer<typeof ingestBatchPayloadSchema>;

const planStepSchema = z.enum(["wake", "reading", "workshop", "expression", "momentum"]);

/**
 * The plan written in `session.plan` when the server creates a session: what the session is made of, never an
 * answer key. `momentumWords = "whole_text_plus_180"` is stored `null` (the convention of `StateSession`).
 */
export const storedSessionPlanSchema = z.strictObject({
  v: z.literal(1),
  steps: z.array(z.strictObject({ step: planStepSchema, minutes: z.number().min(0), required: z.boolean() })).max(5),
  requiredSteps: z.array(planStepSchema).max(5),
  wake: z.strictObject({
    cardIds: z.array(z.uuid()).max(120),
    newCardIds: z.array(z.uuid()).max(120),
    budgetMinutes: z.number().positive(),
    errorItemId: z.uuid().nullable(),
  }),
  reading: z.strictObject({ textId: z.uuid().nullable(), itemIds: z.array(z.uuid()).max(20) }),
  workshop: z.strictObject({ itemIds: z.array(z.uuid()).max(20) }),
  momentumWords: z.number().int().positive().nullable(),
  rewriteSentences: z.number().int().min(0).max(5),
  /** The mode each card was served in: the key of its answer (`j2-pr1-lot-w.md`, D5). */
  servedCards: z.record(z.uuid(), reviewModeSchema),
  resumption: z.boolean(),
  newCardsSuspendedThrough: dateKeySchema.nullable(),
});
export type StoredSessionPlan = z.infer<typeof storedSessionPlanSchema>;

/** The answer of `POST /api/events`: the events refused for good (`server_refused` is the server's own reason). */
export const deliveryReportSchema = z.strictObject({
  rejected: z
    .array(z.strictObject({ clientEventId: z.string().min(1).max(64), reason: rejectionReasonSchema }))
    .max(500),
});
export type DeliveryReportValue = z.infer<typeof deliveryReportSchema>;
