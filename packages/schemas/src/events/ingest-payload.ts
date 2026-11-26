import { z } from "zod";
import { dateKeySchema, isoInstantSchema, languageCodeSchema } from "../common";
import { cardKindSchema, cardSourceSchema, cardStateSchema, reviewRatingSchema } from "../memory";
import { reviewModeSchema, sessionStepSchema, uiEventNameSchema } from "./client-events";
import { streakModeSchema } from "./game-settings";
import { unitIdSchema, unitVersionSchema } from "../unit";

/**
 * The `p_payload` of `app.ingest_batch(p_user_id, p_expected_seq, p_payload)`: what `planIngest`
 * (`@dailylingua/core`) rounds up and the SQL function applies in one transaction. The contract is
 * the "Lot S" section of `docs/refonte/specs/j2-pr1-lots.md`.
 *
 * Naming: this object is a wire format between TypeScript and a SQL function, so it is written in
 * snake_case, exactly as the contract and the columns spell it; `planIngest` builds it directly and the
 * caller (`packages/data`) hands it to the RPC as it is, with no conversion layer. Everything else in
 * the packages (events, state, reports) stays camelCase.
 *
 * Every key is always present (an empty array, or `null` for `streak`). Instants are ISO 8601 strings,
 * days are `YYYY-MM-DD`. Objects are strict: SQL rejects what this schema does not know.
 */
const jsonObjectSchema = z.record(z.string(), z.unknown());
const MAX_ROWS = 500;

export const ingestSessionStatuses = ["started", "completed", "abandoned"] as const;

export const learningDayCauses = ["work", "session", "freeze", "rest", "repair", "travel", "off", "none"] as const;
export const learningDayCauseSchema = z.enum(learningDayCauses);
export type LearningDayCause = z.infer<typeof learningDayCauseSchema>;

/** `step` of an `attempts` row: a step of the session, `unit` for an item of a unit, `oral` for a sentence of the oral workshop (no session). */
export const attemptStepSchema = z.union([sessionStepSchema, z.literal("unit"), z.literal("oral")]);

/** Key of a validated step of a unit in `unit_progress.steps`: `<lesson>:<step>` (e.g. `l1:key_phrases`). */
export const UNIT_STEP_KEY_PATTERN = /^l[1-3]:[a-z_]{1,20}$/;

export const xpSourceSchema = z.strictObject({
  kind: z.enum(["attempt", "review"]),
  client_event_id: z.uuid(),
});

export const ingestPayloadSchema = z.strictObject({
  sessions: z
    .array(
      z.strictObject({
        id: z.uuid(),
        status: z.enum(ingestSessionStatuses),
        started_at: isoInstantSchema.nullable(),
        completed_at: isoInstantSchema.nullable(),
      }),
    )
    .max(MAX_ROWS),
  session_steps: z
    .array(
      z.strictObject({
        session_id: z.uuid(),
        step: sessionStepSchema,
        validated_at: isoInstantSchema.nullable(),
        proof: jsonObjectSchema,
      }),
    )
    .max(MAX_ROWS),
  attempts: z
    .array(
      z.strictObject({
        client_event_id: z.uuid(),
        session_id: z.uuid().nullable(),
        language: languageCodeSchema,
        step: attemptStepSchema,
        exercise_kind: z.string().min(1).max(40),
        exercise_ref: z.uuid(),
        answer: jsonObjectSchema,
        result: jsonObjectSchema,
        correct: z.boolean(),
        duration_ms: z.number().int().min(0),
        occurred_at: isoInstantSchema,
      }),
    )
    .max(MAX_ROWS),
  reviews: z
    .array(
      z.strictObject({
        client_event_id: z.uuid(),
        card_id: z.uuid(),
        rating: reviewRatingSchema,
        mode: reviewModeSchema,
        reviewed_at: isoInstantSchema,
        elapsed_days: z.number().min(0),
        scheduled_days: z.number().min(0),
        card: z.strictObject({
          state: cardStateSchema,
          stability: z.number().positive().nullable(),
          difficulty: z.number().min(1).max(10).nullable(),
          due_at: isoInstantSchema,
          last_review_at: isoInstantSchema.nullable(),
          reps: z.number().int().min(0),
          lapses: z.number().int().min(0),
        }),
      }),
    )
    .max(MAX_ROWS),
  cards_created: z
    .array(
      z.strictObject({
        id: z.uuid(),
        language: languageCodeSchema,
        kind: cardKindSchema,
        front: z.string().min(1),
        back: z.string().nullable(),
        back_language: languageCodeSchema.nullable(),
        context: z.string().nullable(),
        source: cardSourceSchema,
        payload: jsonObjectSchema,
        state: cardStateSchema,
        due_at: isoInstantSchema,
      }),
    )
    .max(MAX_ROWS),
  productions: z
    .array(
      z.strictObject({
        id: z.uuid(),
        client_event_id: z.uuid(),
        session_id: z.uuid().nullable(),
        language: languageCodeSchema,
        mode: z.enum(["writing", "spoken"]),
        task: jsonObjectSchema,
        text: z.string(),
      }),
    )
    .max(MAX_ROWS),
  rewrites: z
    .array(
      z.strictObject({
        client_event_id: z.uuid(),
        correction_id: z.uuid(),
        sentence_index: z.number().int().min(0),
        text: z.string(),
        accepted: z.boolean(),
      }),
    )
    .max(MAX_ROWS),
  error_items: z.array(z.strictObject({ id: z.uuid(), reworked_day: dateKeySchema })).max(MAX_ROWS),
  text_reads: z.array(z.strictObject({ text_id: z.uuid(), first_read_day: dateKeySchema })).max(MAX_ROWS),
  xp: z
    .array(
      z.strictObject({
        source: xpSourceSchema.nullable(),
        language: languageCodeSchema.nullable(),
        day: dateKeySchema,
        amount: z.number().int().min(1).max(100),
        reason: z.string().min(1),
        rule_version: z.string().min(1),
        league_eligible: z.boolean(),
        meta: jsonObjectSchema,
      }),
    )
    .max(MAX_ROWS),
  learning_days: z
    .array(
      z.strictObject({
        day: dateKeySchema,
        time_zone: z.string().min(1),
        xp_verified: z.number().int().min(0),
        validated: z.boolean(),
        cause: learningDayCauseSchema,
        first_activity_at: isoInstantSchema.nullable(),
      }),
    )
    .max(MAX_ROWS),
  streak: z
    .strictObject({
      current: z.number().int().min(0),
      best: z.number().int().min(0),
      last_day: dateKeySchema.nullable(),
      freezes: z.number().int().min(0).max(3),
      mode: streakModeSchema,
      last_repair_day: dateKeySchema.nullable(),
      freezes_granted_through: dateKeySchema.nullable(),
      best_set_on: dateKeySchema.nullable(),
      time_zone_changed_at: isoInstantSchema.nullable(),
    })
    .nullable(),
  timezone_changes: z.array(z.strictObject({ effective_at: isoInstantSchema, time_zone: z.string().min(1) })).max(MAX_ROWS),
  device_cursors: z
    .array(z.strictObject({ device_id: z.uuid(), last_seq: z.number().int().min(0), last_day: dateKeySchema }))
    .max(MAX_ROWS),
  ui_events: z
    .array(
      z.strictObject({
        client_event_id: z.uuid(),
        name: uiEventNameSchema,
        value: z.unknown(),
        occurred_at: isoInstantSchema,
      }),
    )
    .max(MAX_ROWS),
  /**
   * Upserts of `app.unit_progress` (`j4-pr1-architecture.md` §5): SQL merges `steps` (a step already recorded keeps
   * its instant), keeps the greatest `best_score` and `test_attempts`, and sets `passed_at` once, never clearing it.
   */
  unit_progress: z
    .array(
      z.strictObject({
        unit_id: unitIdSchema,
        language: languageCodeSchema,
        version: unitVersionSchema,
        steps: z.record(z.string().regex(UNIT_STEP_KEY_PATTERN), isoInstantSchema),
        best_score: z.number().int().min(0).max(10).nullable(),
        test_attempts: z.number().int().min(0),
        passed_at: isoInstantSchema.nullable(),
        passed_version: unitVersionSchema.nullable(),
      }),
    )
    .max(MAX_ROWS),
  /** Inserts of `app.unit_test`: one graded test submission, `id` is the client's `attemptId`. */
  unit_tests: z
    .array(
      z.strictObject({
        id: z.uuid(),
        unit_id: unitIdSchema,
        version: unitVersionSchema,
        client_event_id: z.uuid(),
        score: z.number().int().min(0).max(10),
        passed: z.boolean(),
        missed: z.array(z.string().min(1).max(40)).max(10),
      }),
    )
    .max(MAX_ROWS),
});
export type IngestPayload = z.infer<typeof ingestPayloadSchema>;
export type IngestXpLine = IngestPayload["xp"][number];

/** A payload that changes nothing: every key present, no row. */
export function emptyIngestPayload(): IngestPayload {
  return {
    sessions: [],
    session_steps: [],
    attempts: [],
    reviews: [],
    cards_created: [],
    productions: [],
    rewrites: [],
    error_items: [],
    text_reads: [],
    xp: [],
    learning_days: [],
    streak: null,
    timezone_changes: [],
    device_cursors: [],
    ui_events: [],
    unit_progress: [],
    unit_tests: [],
  };
}

/** Whether the payload would change nothing. */
export function isEmptyIngestPayload(payload: IngestPayload): boolean {
  return Object.values(payload).every((value) => value === null || (Array.isArray(value) && value.length === 0));
}
