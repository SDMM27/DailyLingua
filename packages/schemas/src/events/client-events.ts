import { z } from "zod";
import { isoInstantSchema } from "../common";

/** Limits of a delivery (`j2-architecture.md` §2). */
export const MAX_EVENTS_PER_BATCH = 50;
export const MAX_BATCH_BYTES = 64 * 1024;
export const MAX_EVENTS_PER_HOUR = 600;

export const sessionSteps = ["wake", "reading", "workshop", "expression", "momentum", "review"] as const;
export const sessionStepSchema = z.enum(sessionSteps);
export type SessionStep = z.infer<typeof sessionStepSchema>;

/** Review modes of a card: recognition (choice), production (typed), listening (audio only). */
export const reviewModes = ["recognition", "production", "listening"] as const;
export const reviewModeSchema = z.enum(reviewModes);
export type ReviewMode = z.infer<typeof reviewModeSchema>;

/**
 * Closed list of `ui_event` names (`j2-jeu-xp-serie.md` §11 and §7). A `ui_event` never has an effect
 * on XP or on the streak.
 */
export const uiEventNames = [
  "goal_set",
  "goal_reached",
  "week_goal_reached",
  "goal_lower_proposed",
  "goal_lower_accepted",
  "streak_day_validated",
  "freeze_granted",
  "freeze_used",
  "streak_repaired",
  "streak_reset",
  "streak_mode_changed",
  "rest_days_changed",
  "celebration_shown",
  "celebration_deferred",
  "bilan_closed",
  "sound_offer_answered",
  "sound_toggled",
  "haptics_toggled",
  "mechanic_toggled",
  "push_permission_prompted",
  "push_permission_result",
  "push_install_prompted",
  "push_sent",
  "push_opened",
  "push_ignored",
  "push_ignored_streak",
  "push_mode_changed",
  "push_subscription_expired",
  "xp_zeroed",
] as const;
export const uiEventNameSchema = z.enum(uiEventNames);
export type UiEventName = z.infer<typeof uiEventNameSchema>;

/** `ui_event.value` is at most 2 KB of JSON. */
export const MAX_UI_VALUE_BYTES = 2048;

const timeZoneSchema = z.string().refine((zone) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}, "Expected an IANA time zone");

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]),
);

/** Fields every payload carries (`j2-jeu-xp-serie.md` §2.1): the device's zone, the installation and its counter. */
const deviceFields = {
  tz: timeZoneSchema,
  deviceId: z.uuid(),
  seq: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
};

export const MAX_ANSWER_CHARS = 200;
const answerSchema = z.string().max(MAX_ANSWER_CHARS);

export const sessionStartedPayloadSchema = z.strictObject({ ...deviceFields, sessionId: z.uuid() });

export const reviewAttemptPayloadSchema = z.strictObject({
  ...deviceFields,
  sessionId: z.uuid().optional(),
  cardId: z.uuid(),
  mode: reviewModeSchema,
  /** Id of the chosen option, or the typed text. */
  answer: answerSchema,
  shownAt: isoInstantSchema,
  answeredAt: isoInstantSchema,
  audioPlays: z.number().int().min(0).max(20),
});

/** Reading progress milestones: one event per milestone reached. */
export const readingRatios = [0, 0.25, 0.5, 0.75, 1] as const;
export const readingProgressPayloadSchema = z.strictObject({
  ...deviceFields,
  sessionId: z.uuid(),
  textId: z.uuid(),
  ratio: z.union([z.literal(0), z.literal(0.25), z.literal(0.5), z.literal(0.75), z.literal(1)]),
});

export const comprehensionAnswerPayloadSchema = z.strictObject({
  ...deviceFields,
  sessionId: z.uuid(),
  itemId: z.uuid(),
  answer: answerSchema,
});

export const focusAttemptPayloadSchema = z.strictObject({
  ...deviceFields,
  sessionId: z.uuid(),
  itemId: z.uuid(),
  try: z.number().int().min(1).max(3),
  answer: answerSchema,
  shownAt: isoInstantSchema,
});

export const MAX_PRODUCTION_CHARS = 4000;
export const MAX_REWRITE_CHARS = 500;

export const productionSubmittedPayloadSchema = z.strictObject({
  ...deviceFields,
  sessionId: z.uuid(),
  productionId: z.uuid(),
  text: z.string().max(MAX_PRODUCTION_CHARS),
  composeMs: z.number().int().min(0),
});

export const rewriteSubmittedPayloadSchema = z.strictObject({
  ...deviceFields,
  correctionId: z.uuid(),
  sentenceIndex: z.number().int().min(0).max(1000),
  text: z.string().max(MAX_REWRITE_CHARS),
});

export const fluencyPassPayloadSchema = z.strictObject({
  ...deviceFields,
  sessionId: z.uuid(),
  textId: z.uuid(),
  startedAt: isoInstantSchema,
  endedAt: isoInstantSchema,
});

export const sessionStepCompletedPayloadSchema = z.strictObject({
  ...deviceFields,
  sessionId: z.uuid(),
  step: sessionStepSchema,
});

export const uiEventPayloadSchema = z.strictObject({
  ...deviceFields,
  name: uiEventNameSchema,
  value: jsonValueSchema.refine((value) => JSON.stringify(value ?? null).length <= MAX_UI_VALUE_BYTES, "value is over 2 KB"),
});

const ms = (value: string) => Date.parse(value);

function envelope<K extends string, P extends z.ZodType>(kind: K, payload: P) {
  return z.strictObject({
    clientEventId: z.uuid(),
    kind: z.literal(kind),
    occurredAt: isoInstantSchema,
    payload,
  });
}

/**
 * Every event the client sends: the envelope `PendingEvent` of `@dailylingua/core/offline` with a strict
 * payload per `kind`. An unknown field (`xp`, `score`, `correct`…) fails: no value ever comes from the client.
 */
export const clientEventSchema = z.discriminatedUnion("kind", [
  envelope("session_started", sessionStartedPayloadSchema),
  envelope("review_attempt", reviewAttemptPayloadSchema).superRefine((event, ctx) => {
    const { shownAt, answeredAt } = event.payload;
    if (!(ms(shownAt) <= ms(answeredAt) && ms(answeredAt) <= ms(event.occurredAt))) {
      ctx.addIssue({ code: "custom", message: "Expected shownAt <= answeredAt <= occurredAt", path: ["payload", "answeredAt"] });
    }
  }),
  envelope("reading_progress", readingProgressPayloadSchema),
  envelope("comprehension_answer", comprehensionAnswerPayloadSchema),
  envelope("focus_attempt", focusAttemptPayloadSchema),
  envelope("production_submitted", productionSubmittedPayloadSchema),
  envelope("rewrite_submitted", rewriteSubmittedPayloadSchema),
  envelope("fluency_pass", fluencyPassPayloadSchema).superRefine((event, ctx) => {
    const { startedAt, endedAt } = event.payload;
    if (!(ms(startedAt) < ms(endedAt) && ms(endedAt) <= ms(event.occurredAt))) {
      ctx.addIssue({ code: "custom", message: "Expected startedAt < endedAt <= occurredAt", path: ["payload", "endedAt"] });
    }
  }),
  envelope("session_step_completed", sessionStepCompletedPayloadSchema),
  envelope("ui_event", uiEventPayloadSchema),
]);
export type ClientEvent = z.infer<typeof clientEventSchema>;
export type ClientEventKind = ClientEvent["kind"];

/** A batch as POSTed: at most 50 events. */
export const clientEventBatchSchema = z.array(clientEventSchema).max(MAX_EVENTS_PER_BATCH);
