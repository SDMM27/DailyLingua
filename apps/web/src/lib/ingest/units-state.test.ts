import { getUnit } from "@dailylingua/content";
import { describe, expect, it } from "vitest";
import { USER, rows, uuid } from "@/test/ingest-rows";
import { buildIngestState, explanationLanguageOf } from "./build-state";
import { unitDraftsAllowed } from "./ingest-events";
import { extractRefs } from "./refs";

const UNIT = "it-a1-01-saluer";

describe("units in the ingestion", () => {
  it("collects the unit ids in the unit id format only, and the test attempt ids", () => {
    const refs = extractRefs([
      { clientEventId: uuid(1), kind: "unit_test_submitted", payload: { unitId: UNIT, attemptId: uuid(2), deviceId: uuid(3) } },
      { clientEventId: uuid(4), kind: "unit_item_attempt", payload: { unitId: "it-a1-01-saluer'),(x", attemptId: uuid(5) } },
      { clientEventId: uuid(6), kind: "unit_item_attempt", payload: { unitId: 7 } },
    ]);
    expect(refs.unitIds).toEqual([UNIT]);
    expect(refs.unitTestIds).toEqual([uuid(2)]);
    expect(extractRefs([{ clientEventId: uuid(1), kind: "session_started", payload: {} }])).not.toHaveProperty("unitIds");
  });

  it("injects only the units the events name, with their progress and attempts; an unknown unit is left out", () => {
    const { state } = buildIngestState({
      userId: USER,
      unitIds: [UNIT, "it-a1-99-inconnue"],
      memo: null,
      rows: rows({
        profile: { timeZone: "Europe/Paris", createdAt: "2026-10-01T00:00:00+00:00", gameSettings: {}, nativeLanguage: "fr" },
        unitProgress: [
          { unitId: UNIT, language: "it", version: "0123456789ab", steps: { "l1:dialogue": "2026-11-18T08:00:00+00:00" }, bestScore: 7, testAttempts: 1, passedAt: null, passedVersion: null, updatedAt: "2026-11-18T08:00:00+00:00" },
          { unitId: "ru-a1-01-saluer", language: "ru", version: "0123456789ab", steps: {}, bestScore: null, testAttempts: 0, passedAt: null, passedVersion: null, updatedAt: "2026-11-18T08:00:00+00:00" },
        ],
        unitAttempts: [
          { unitId: UNIT, unitVersion: "0123456789ab", lesson: "l1", itemId: "x", try: 1, correct: true, occurredAt: "2026-11-18T08:00:00+00:00" },
          { unitId: UNIT, unitVersion: "0123456789ab", lesson: "l7", itemId: "x", try: 1, correct: true, occurredAt: "2026-11-18T08:00:00+00:00" },
        ],
        unitTestIds: [uuid(9)],
      }),
    });
    expect(Object.keys(state.units)).toEqual([UNIT]);
    expect(state.units[UNIT]).toBe(getUnit(UNIT));
    expect(state.unitProgress).toEqual({ [UNIT]: { version: "0123456789ab", steps: { "l1:dialogue": "2026-11-18T08:00:00+00:00" }, bestScore: 7, testAttempts: 1, passedAt: null, passedVersion: null } });
    expect(state.unitAttempts[UNIT]).toHaveLength(1);
    expect(state.unitTestIds).toEqual([uuid(9)]);
    expect(state.profile.explanationLanguage).toBe("fr");
  });

  it("writes the backs of unit cards in French or English, English for any other native language", () => {
    expect(explanationLanguageOf("fr")).toBe("fr");
    expect(explanationLanguageOf("en")).toBe("en");
    expect(explanationLanguageOf("ar")).toBe("en");
    expect(explanationLanguageOf(undefined)).toBe("en");
  });

  it("allows unpublished units only with UNIT_DRAFTS=show, never on the Vercel production deployment", () => {
    expect(unitDraftsAllowed({})).toBe(false);
    expect(unitDraftsAllowed({ UNIT_DRAFTS: "show" })).toBe(true);
    expect(unitDraftsAllowed({ UNIT_DRAFTS: "yes" })).toBe(false);
    expect(unitDraftsAllowed({ UNIT_DRAFTS: "show", VERCEL_ENV: "preview" })).toBe(true);
    expect(unitDraftsAllowed({ UNIT_DRAFTS: "show", VERCEL_ENV: "production" })).toBe(false);
  });
});
