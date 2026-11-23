import { describe, expect, it } from "vitest";
import {
  clientEventBatchSchema,
  clientEventSchema,
  emptyIngestPayload,
  flattenGameSettings,
  type GameSettings,
  gameSettingKeys,
  gameSettingsSchema,
  ingestPayloadSchema,
  isEmptyIngestPayload,
  MAX_EVENTS_PER_BATCH,
  sessionPacketSchema,
  xpRuleIds,
} from "../index";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const DEVICE = ID(900);
const AT = "2026-11-12T10:00:00.000Z";
const UNIT = "it-a1-01-saluer";
const VERSION = "0123456789ab";
const BASE = { tz: "Europe/Paris", deviceId: DEVICE, seq: 1 };

function event(kind: string, payload: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return { clientEventId: ID(1), kind, occurredAt: AT, payload: { ...BASE, ...payload }, ...extra };
}

describe("rule identifiers", () => {
  it("are those of the scale, once each", () => {
    expect(xpRuleIds).toHaveLength(16);
    expect(new Set(xpRuleIds).size).toBe(16);
    expect(xpRuleIds).toContain("review.bonus.reconquest");
    expect(xpRuleIds).toContain("session.complete");
    expect(xpRuleIds).toContain("unit.complete");
  });
});

describe("clientEventSchema", () => {
  const good: Record<string, Record<string, unknown>> = {
    session_started: { sessionId: ID(2) },
    review_attempt: { cardId: ID(3), mode: "recognition", answer: "opt-1", shownAt: "2026-11-12T09:59:55.000Z", answeredAt: "2026-11-12T09:59:58.000Z", audioPlays: 0 },
    reading_progress: { sessionId: ID(2), textId: ID(4), ratio: 0.25 },
    comprehension_answer: { sessionId: ID(2), itemId: ID(5), answer: "a" },
    focus_attempt: { sessionId: ID(2), itemId: ID(5), try: 1, answer: "ciao", shownAt: "2026-11-12T09:59:55.000Z" },
    production_submitted: { sessionId: ID(2), productionId: ID(6), text: "Ciao a tutti.", composeMs: 12000 },
    rewrite_submitted: { correctionId: ID(7), sentenceIndex: 0, text: "Ciao." },
    fluency_pass: { sessionId: ID(2), textId: ID(4), startedAt: "2026-11-12T09:58:00.000Z", endedAt: "2026-11-12T09:59:00.000Z" },
    session_step_completed: { sessionId: ID(2), step: "reading" },
    ui_event: { name: "sound_toggled", value: { on: true } },
    unit_item_attempt: { unitId: UNIT, unitVersion: VERSION, lesson: "l1", itemId: "d-q1", try: 1, answer: "a", shownAt: "2026-11-12T09:59:55.000Z" },
    unit_step_completed: { unitId: UNIT, unitVersion: VERSION, lesson: "l1", step: "key_phrases" },
    unit_test_submitted: { unitId: UNIT, unitVersion: VERSION, attemptId: ID(8), startedAt: "2026-11-12T09:55:00.000Z", answers: [{ itemId: "t-1", answer: "a" }] },
  };

  it.each(Object.keys(good))("accepts a %s", (kind) => {
    expect(clientEventSchema.safeParse(event(kind, good[kind] as Record<string, unknown>)).success).toBe(true);
  });

  it.each(Object.keys(good))("refuses a field the schema does not know on a %s (no value comes from the client)", (kind) => {
    for (const extra of ["xp", "score", "correct"]) {
      const bad = event(kind, { ...(good[kind] as Record<string, unknown>), [extra]: 5 });
      expect(clientEventSchema.safeParse(bad).success, `${kind}+${extra}`).toBe(false);
    }
    expect(clientEventSchema.safeParse({ ...event(kind, good[kind] as Record<string, unknown>), xp: 5 }).success).toBe(false);
  });

  it.each(Object.keys(good))("requires tz, deviceId and seq on a %s", (kind) => {
    for (const key of ["tz", "deviceId", "seq"]) {
      const payload = { ...BASE, ...(good[kind] as Record<string, unknown>) } as Record<string, unknown>;
      delete payload[key];
      expect(clientEventSchema.safeParse({ ...event(kind, {}), payload }).success, `${kind}-${key}`).toBe(false);
    }
  });

  it("refuses an unknown kind, a bad zone, a bad ratio and a bad try", () => {
    expect(clientEventSchema.safeParse(event("grant_xp", {})).success).toBe(false);
    expect(clientEventSchema.safeParse(event("session_started", { sessionId: ID(2), tz: "Mars/Olympus" })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("reading_progress", { ...(good.reading_progress as object), ratio: 0.3 })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("focus_attempt", { ...(good.focus_attempt as object), try: 4 })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("ui_event", { name: "free_text" })).success).toBe(false);
  });

  it("orders the timestamps of a review: shownAt <= answeredAt <= occurredAt", () => {
    const review = good.review_attempt as Record<string, unknown>;
    expect(clientEventSchema.safeParse(event("review_attempt", { ...review, answeredAt: "2026-11-12T10:00:01.000Z" })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("review_attempt", { ...review, shownAt: "2026-11-12T10:00:00.000Z" })).success).toBe(false);
  });

  it("orders the timestamps of a fluency pass and bounds free text", () => {
    const pass = good.fluency_pass as Record<string, unknown>;
    expect(clientEventSchema.safeParse(event("fluency_pass", { ...pass, startedAt: pass.endedAt })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("production_submitted", { ...(good.production_submitted as object), text: "x".repeat(4001) })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("rewrite_submitted", { ...(good.rewrite_submitted as object), text: "x".repeat(501) })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("ui_event", { name: "sound_toggled", value: "x".repeat(3000) })).success).toBe(false);
  });

  it("checks the unit fields: id, version, lesson, item id, try, answers, and orders the instants", () => {
    const attempt = good.unit_item_attempt as Record<string, unknown>;
    const test = good.unit_test_submitted as Record<string, unknown>;
    expect(clientEventSchema.safeParse(event("unit_item_attempt", { ...attempt, unitId: "Saluer" })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("unit_item_attempt", { ...attempt, unitVersion: "0123456789AB" })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("unit_item_attempt", { ...attempt, lesson: "l4" })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("unit_item_attempt", { ...attempt, itemId: "x".repeat(41) })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("unit_item_attempt", { ...attempt, try: 0 })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("unit_item_attempt", { ...attempt, shownAt: "2026-11-12T10:00:01.000Z" })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("unit_item_attempt", { ...attempt, shownAt: AT })).success).toBe(true);
    expect(clientEventSchema.safeParse(event("unit_step_completed", { ...(good.unit_step_completed as object), step: "finale" })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("unit_test_submitted", { ...test, startedAt: AT })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("unit_test_submitted", { ...test, answers: [] })).success).toBe(false);
    const eleven = Array.from({ length: 11 }, (_, i) => ({ itemId: `t-${i}`, answer: "a" }));
    expect(clientEventSchema.safeParse(event("unit_test_submitted", { ...test, answers: eleven })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("unit_test_submitted", { ...test, answers: [{ itemId: "t-1", answer: "a", correct: true }] })).success).toBe(false);
    expect(clientEventSchema.safeParse(event("unit_test_submitted", { ...test, attemptId: "attempt-1" })).success).toBe(false);
  });

  it("caps a batch at 50 events", () => {
    const one = event("session_started", { sessionId: ID(2) });
    expect(clientEventBatchSchema.safeParse(Array.from({ length: MAX_EVENTS_PER_BATCH }, () => one)).success).toBe(true);
    expect(clientEventBatchSchema.safeParse(Array.from({ length: MAX_EVENTS_PER_BATCH + 1 }, () => one)).success).toBe(false);
  });
});

describe("gameSettingsSchema", () => {
  it("accepts the closed list of keys and nothing else", () => {
    const full: GameSettings = {
      xpVisible: false,
      ring: { enabled: true, tier: 20 },
      streak: { enabled: true, mode: "weekly", weeklyTarget: 4, restDays: [6, 7] },
      celebrations: "reduced",
      sound: { enabled: true, volume: 3 },
      haptics: false,
      notifications: { enabled: true, time: "19:00", weeklySummary: true },
      answerTolerance: { accents: "strict" },
    };
    expect(gameSettingsSchema.safeParse(full).success).toBe(true);
    expect(gameSettingsSchema.safeParse({}).success).toBe(true);
    expect(Object.keys(flattenGameSettings(full)).sort()).toEqual([...gameSettingKeys].sort());
    for (const bad of [
      { xp: 1 },
      { ring: { tier: 45 } },
      { ring: { enabled: true, color: "red" } },
      { streak: { mode: "monthly" } },
      { streak: { weeklyTarget: 1 } },
      { streak: { restDays: [1, 2, 3] } },
      { streak: { restDays: [1, 1] } },
      { streak: { restDays: [8] } },
      { sound: { volume: 4 } },
      { notifications: { time: "7pm" } },
    ]) {
      expect(gameSettingsSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });

  it("flattens only the keys that are present", () => {
    expect(flattenGameSettings({ ring: { tier: 20 }, haptics: true })).toEqual({ "ring.tier": 20, haptics: true });
  });
});

describe("ingestPayloadSchema", () => {
  it("accepts the empty payload and recognises it", () => {
    const empty = emptyIngestPayload();
    expect(ingestPayloadSchema.safeParse(empty).success).toBe(true);
    expect(isEmptyIngestPayload(empty)).toBe(true);
    expect(isEmptyIngestPayload({ ...empty, ui_events: [{ client_event_id: ID(1), name: "sound_toggled", value: {}, occurred_at: AT }] })).toBe(false);
  });

  it("accepts a full row of each kind, in snake_case", () => {
    const payload = {
      ...emptyIngestPayload(),
      sessions: [{ id: ID(2), status: "completed", started_at: AT, completed_at: AT }],
      session_steps: [{ session_id: ID(2), step: "wake", validated_at: AT, proof: { answered: [] } }],
      attempts: [{ client_event_id: ID(1), session_id: ID(2), language: "it", step: "reading", exercise_kind: "mcq", exercise_ref: ID(5), answer: { value: "a" }, result: { xpReason: "reread" }, correct: true, duration_ms: 4200, occurred_at: AT }],
      reviews: [{ client_event_id: ID(3), card_id: ID(4), rating: 3, mode: "production", reviewed_at: AT, elapsed_days: 2.1, scheduled_days: 6, card: { state: "review", stability: 6.2, difficulty: 5.1, due_at: AT, last_review_at: AT, reps: 5, lapses: 0 } }],
      cards_created: [{ id: ID(8), language: "it", kind: "word", front: "casa", back: "maison", back_language: "fr", context: null, source: "session", payload: {}, state: "new", due_at: AT }],
      productions: [{ id: ID(6), client_event_id: ID(9), session_id: ID(2), language: "it", mode: "writing", task: {}, text: "Ciao" }],
      rewrites: [{ client_event_id: ID(10), correction_id: ID(7), sentence_index: 0, text: "Ciao", accepted: true }],
      error_items: [{ id: ID(11), reworked_day: "2026-11-12" }],
      text_reads: [{ text_id: ID(12), first_read_day: "2026-11-12" }],
      xp: [{ source: { kind: "attempt", client_event_id: ID(1) }, language: "it", day: "2026-11-12", amount: 2, reason: "focus.first_try", rule_version: "j2.1", league_eligible: true, meta: {} }],
      learning_days: [{ day: "2026-11-12", time_zone: "Europe/Paris", xp_verified: 84, validated: true, cause: "work", first_activity_at: AT }],
      streak: { current: 3, best: 9, last_day: "2026-11-12", freezes: 2, mode: "daily", last_repair_day: null, freezes_granted_through: "2026-11-09", best_set_on: "2026-11-01", time_zone_changed_at: null },
      timezone_changes: [{ effective_at: AT, time_zone: "Europe/Rome" }],
      device_cursors: [{ device_id: DEVICE, last_seq: 41, last_day: "2026-11-12" }],
      ui_events: [{ client_event_id: ID(13), name: "sound_toggled", value: {}, occurred_at: AT }],
      unit_progress: [{ unit_id: UNIT, language: "it", version: VERSION, steps: { "l1:dialogue": AT }, best_score: 8, test_attempts: 1, passed_at: AT, passed_version: VERSION }],
      unit_tests: [{ id: ID(14), unit_id: UNIT, version: VERSION, client_event_id: ID(15), score: 8, passed: true, missed: ["t-3", "t-7"] }],
    };
    expect(ingestPayloadSchema.safeParse(payload).success).toBe(true);
    expect(ingestPayloadSchema.safeParse({ ...payload, attempts: [{ ...payload.attempts[0], session_id: null, step: "unit", exercise_kind: "unit_mcq" }] }).success).toBe(true);
  });

  it("refuses a unit row out of format", () => {
    const empty = emptyIngestPayload();
    const progress = { unit_id: UNIT, language: "it", version: VERSION, steps: {}, best_score: null, test_attempts: 0, passed_at: null, passed_version: null };
    expect(ingestPayloadSchema.safeParse({ ...empty, unit_progress: [progress] }).success).toBe(true);
    expect(ingestPayloadSchema.safeParse({ ...empty, unit_progress: [{ ...progress, steps: { "l4:dialogue": AT } }] }).success).toBe(false);
    expect(ingestPayloadSchema.safeParse({ ...empty, unit_progress: [{ ...progress, best_score: 11 }] }).success).toBe(false);
    expect(ingestPayloadSchema.safeParse({ ...empty, unit_progress: [{ ...progress, version: "abc" }] }).success).toBe(false);
    const test = { id: ID(14), unit_id: UNIT, version: VERSION, client_event_id: ID(15), score: 8, passed: true, missed: [] };
    expect(ingestPayloadSchema.safeParse({ ...empty, unit_tests: [{ ...test, score: -1 }] }).success).toBe(false);
    expect(ingestPayloadSchema.safeParse({ ...empty, unit_tests: [{ ...test, unit_id: "unit" }] }).success).toBe(false);
  });

  it("refuses an extra key, a camelCase key, a missing key and an XP line out of bounds", () => {
    const empty = emptyIngestPayload();
    expect(ingestPayloadSchema.safeParse({ ...empty, extra: [] }).success).toBe(false);
    const missing: Record<string, unknown> = { ...empty };
    delete missing.ui_events;
    expect(ingestPayloadSchema.safeParse(missing).success).toBe(false);
    expect(ingestPayloadSchema.safeParse({ ...empty, textReads: [] }).success).toBe(false);
    const line = { source: null, language: null, day: "2026-11-12", amount: 2, reason: "x", rule_version: "j2.1", league_eligible: true, meta: {} };
    expect(ingestPayloadSchema.safeParse({ ...empty, xp: [line] }).success).toBe(true);
    expect(ingestPayloadSchema.safeParse({ ...empty, xp: [{ ...line, amount: 0 }] }).success).toBe(false);
    expect(ingestPayloadSchema.safeParse({ ...empty, xp: [{ ...line, amount: 101 }] }).success).toBe(false);
  });
});

describe("sessionPacketSchema", () => {
  it("accepts a packet and refuses an unknown field", () => {
    const packet = {
      session: { id: ID(2), language: "it", day: "2026-11-12", format: 15, kind: "daily", status: "planned", servedAt: AT },
      steps: [{ step: "wake", minutes: 3, required: true }],
      text: null,
      items: [],
      cards: [],
      errorOfTheDay: null,
      quotas: { writingFeedback: { used: 0, limit: 3 }, rewriteCheck: { used: 0, limit: 6 } },
      serverDay: "2026-11-12",
      timeZone: "Europe/Paris",
    };
    expect(sessionPacketSchema.safeParse(packet).success).toBe(true);
    expect(sessionPacketSchema.safeParse({ ...packet, extra: 1 }).success).toBe(false);
    expect(sessionPacketSchema.safeParse({ ...packet, session: { ...packet.session, format: 25 } }).success).toBe(false);
  });
});
