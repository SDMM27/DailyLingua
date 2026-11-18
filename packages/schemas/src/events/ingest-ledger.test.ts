import { describe, expect, it } from "vitest";
import { deliveryReportSchema, emptyIngestPayload, ingestBatchPayloadSchema, ingestMemoSchema, rejectionReasons, storedSessionPlanSchema } from "../index";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const DAY = {
  xpByReason: { "review.production": 4 },
  reviewSuccesses: 2,
  newCards: 1,
  readingTexts: 0,
  rewards: {},
  focusBySession: { [ID(1)]: 2 },
  rewardsByCorrection: {},
  counted: [`review:${ID(2)}`],
};
const MEMO = {
  v: 1,
  days: { "2026-11-18": DAY },
  texts: { [ID(3)]: { readingEarnedDay: "2026-11-17", referenceWpm: 180 } },
  productions: { [ID(4)]: { day: "2026-11-18", late: false, settled: false, correctionDeferred: false } },
  catchUpDays: ["2026-11-10"],
};

describe("ingestMemoSchema", () => {
  it("accepts a memo and rejects unknown keys at every level", () => {
    expect(ingestMemoSchema.safeParse(MEMO).success).toBe(true);
    expect(ingestMemoSchema.safeParse({ ...MEMO, extra: 1 }).success).toBe(false);
    expect(ingestMemoSchema.safeParse({ ...MEMO, days: { "2026-11-18": { ...DAY, extra: 1 } } }).success).toBe(false);
    expect(ingestMemoSchema.safeParse({ ...MEMO, v: 2 }).success).toBe(false);
  });

  it("rejects a key that is not a day or an id", () => {
    expect(ingestMemoSchema.safeParse({ ...MEMO, days: { yesterday: DAY } }).success).toBe(false);
    expect(ingestMemoSchema.safeParse({ ...MEMO, texts: { nope: { readingEarnedDay: null, referenceWpm: null } } }).success).toBe(false);
  });
});

describe("ingestBatchPayloadSchema", () => {
  const empty = { ...emptyIngestPayload(), events: [], memo: null };

  it("takes the payload of planIngest with the ledger and the memo", () => {
    expect(ingestBatchPayloadSchema.safeParse(empty).success).toBe(true);
    expect(ingestBatchPayloadSchema.safeParse({ ...empty, memo: MEMO, events: [{ client_event_id: ID(5), kind: "reading_progress", fingerprint: "00112233445566778899aabbccddeeff" }] }).success).toBe(true);
  });

  it("refuses a fingerprint or a kind SQL would refuse, and more than 500 events", () => {
    const event = { client_event_id: ID(5), kind: "ui_event", fingerprint: "00112233445566778899aabbccddeeff" };
    expect(ingestBatchPayloadSchema.safeParse({ ...empty, events: [{ ...event, fingerprint: "XYZ" }] }).success).toBe(false);
    expect(ingestBatchPayloadSchema.safeParse({ ...empty, events: [{ ...event, kind: "Bad Kind" }] }).success).toBe(false);
    expect(ingestBatchPayloadSchema.safeParse({ ...empty, events: Array.from({ length: 501 }, () => event) }).success).toBe(false);
  });

  it("stays strict and needs the two new keys", () => {
    expect(ingestBatchPayloadSchema.safeParse({ ...empty, surprise: [] }).success).toBe(false);
    expect(ingestBatchPayloadSchema.safeParse({ ...emptyIngestPayload() }).success).toBe(false);
  });
});

describe("storedSessionPlanSchema", () => {
  const plan = {
    v: 1,
    steps: [
      { step: "wake", minutes: 3, required: true },
      { step: "workshop", minutes: 0, required: false },
    ],
    requiredSteps: ["wake"],
    wake: { cardIds: [ID(1)], newCardIds: [], budgetMinutes: 3, errorItemId: null },
    reading: { textId: null, itemIds: [] },
    workshop: { itemIds: [] },
    momentumWords: null,
    rewriteSentences: 0,
    servedCards: { [ID(1)]: "recognition" },
    resumption: false,
    newCardsSuspendedThrough: null,
  };

  it("accepts a plan and refuses an answer key or an unknown mode", () => {
    expect(storedSessionPlanSchema.safeParse(plan).success).toBe(true);
    expect(storedSessionPlanSchema.safeParse({ ...plan, key: { answer: "x" } }).success).toBe(false);
    expect(storedSessionPlanSchema.safeParse({ ...plan, servedCards: { [ID(1)]: "typing" } }).success).toBe(false);
    expect(storedSessionPlanSchema.safeParse({ ...plan, steps: [{ step: "review", minutes: 1, required: false }] }).success).toBe(false);
  });
});

describe("deliveryReportSchema", () => {
  it("knows the reasons, server_refused and too_many included", () => {
    expect(rejectionReasons).toContain("server_refused");
    expect(rejectionReasons).toContain("too_many");
    expect(deliveryReportSchema.safeParse({ rejected: [{ clientEventId: ID(1), reason: "server_refused" }] }).success).toBe(true);
    expect(deliveryReportSchema.safeParse({ rejected: [{ clientEventId: ID(1), reason: "whatever" }] }).success).toBe(false);
    expect(deliveryReportSchema.safeParse({ rejected: [] }).success).toBe(true);
  });
});
