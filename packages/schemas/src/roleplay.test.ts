import { describe, expect, it } from "vitest";
import {
  MAX_ROLEPLAY_TURN_CHARS, objectivesMetSchema, roleplayResponseSchema, roleplayReviewSchema, roleplayStartRequestSchema, roleplayTurnRequestSchema, roleplayTurnSchema,
} from "./roleplay";

const AT = "2026-11-26T10:00:00.000Z";
const game = {
  id: "10000000-0000-4000-8000-000000000003", scenarioId: "cafe-order", language: "it", level: "A2", status: "active",
  turns: [{ role: "ai", text: "Buongiorno", translation: "Bonjour", at: AT }], objectivesMet: [false, false, false],
  learnerTurns: 0, turnsLeft: 8, review: null, createdAt: AT, finishedAt: null,
};

describe("role play schemas", () => {
  it("accepts a turn request of 300 characters at most, trimmed, from a known input", () => {
    expect(roleplayTurnRequestSchema.safeParse({ text: "a".repeat(MAX_ROLEPLAY_TURN_CHARS), via: "speech" }).success).toBe(true);
    expect(roleplayTurnRequestSchema.safeParse({ text: "a".repeat(MAX_ROLEPLAY_TURN_CHARS + 1), via: "typed" }).success).toBe(false);
    expect(roleplayTurnRequestSchema.safeParse({ text: "  ", via: "typed" }).success).toBe(false);
    expect(roleplayTurnRequestSchema.safeParse({ text: "ciao", via: "audio" }).success).toBe(false);
    expect(roleplayTurnRequestSchema.safeParse({ text: "ciao", via: "typed", game: "x" }).success).toBe(false);
  });

  it("accepts a start request with a scenario id and a language code only", () => {
    expect(roleplayStartRequestSchema.safeParse({ scenarioId: "cafe-order", language: "it" }).success).toBe(true);
    expect(roleplayStartRequestSchema.safeParse({ scenarioId: "Cafe Order", language: "it" }).success).toBe(false);
    expect(roleplayStartRequestSchema.safeParse({ scenarioId: "cafe-order", language: "Italian" }).success).toBe(false);
  });

  it("stores learner and AI turns with their own fields", () => {
    expect(roleplayTurnSchema.safeParse({ role: "learner", text: "Ciao", via: "typed", at: AT }).success).toBe(true);
    expect(roleplayTurnSchema.safeParse({ role: "learner", text: "Ciao", at: AT }).success).toBe(false);
    expect(roleplayTurnSchema.safeParse({ role: "ai", text: "Ciao", translation: "Salut", at: AT }).success).toBe(true);
    expect(roleplayTurnSchema.safeParse({ role: "ai", text: "Ciao", via: "typed", translation: "Salut", at: AT }).success).toBe(false);
  });

  it("has exactly three objectives, and a review of at most 3 errors and 3 phrasings", () => {
    expect(objectivesMetSchema.safeParse([true, false]).success).toBe(false);
    const note = { met: true, comment: "ok" };
    const review = { objectives: [note, note, note], errors: [], betterPhrasings: [], detectedLanguage: "it" };
    expect(roleplayReviewSchema.safeParse(review).success).toBe(true);
    expect(roleplayReviewSchema.safeParse({ ...review, objectives: [note, note] }).success).toBe(false);
    const error = { original: "a", corrected: "b", explanation: "c" };
    expect(roleplayReviewSchema.safeParse({ ...review, errors: [error, error, error, error] }).success).toBe(false);
    expect(roleplayReviewSchema.safeParse({ ...review, detectedLanguage: null }).success).toBe(true);
  });

  it("validates every answer of the routes, and refuses a field it does not know", () => {
    expect(roleplayResponseSchema.safeParse({ status: "ready", game, reply: { text: "Buongiorno", translation: "Bonjour" } }).success).toBe(true);
    expect(roleplayResponseSchema.safeParse({ status: "state", active: null, today: game, latestFinished: game, xp: 15, level: "A2", offered: ["cafe-order"], canStart: false }).success).toBe(true);
    expect(roleplayResponseSchema.safeParse({ status: "limit", reason: "budget" }).success).toBe(true);
    expect(roleplayResponseSchema.safeParse({ status: "limit", reason: "other" }).success).toBe(false);
    expect(roleplayResponseSchema.safeParse({ status: "failed", detail: "model text" }).success).toBe(false);
    expect(roleplayResponseSchema.safeParse({ status: "ready", game: { ...game, userId: "x" }, reply: null }).success).toBe(false);
  });
});
