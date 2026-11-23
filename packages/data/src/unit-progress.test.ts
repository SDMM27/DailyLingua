import { describe, expect, it } from "vitest";
import { toUnitProgressRow } from "./unit-progress";

describe("toUnitProgressRow", () => {
  it("maps the columns to camelCase and keeps only the string instants of the steps", () => {
    expect(toUnitProgressRow({
      unit_id: "it-a1-01-saluer", language: "it", version: "0123456789ab",
      steps: { "l1:dialogue": "2026-11-20T09:00:00+00:00", "l1:key_phrases": 3 },
      best_score: 8, test_attempts: 2, passed_at: "2026-11-20T10:00:00+00:00", passed_version: "0123456789ab", updated_at: "2026-11-20T10:00:00+00:00",
    })).toEqual({
      unitId: "it-a1-01-saluer", language: "it", version: "0123456789ab", steps: { "l1:dialogue": "2026-11-20T09:00:00+00:00" },
      bestScore: 8, testAttempts: 2, passedAt: "2026-11-20T10:00:00+00:00", passedVersion: "0123456789ab", updatedAt: "2026-11-20T10:00:00+00:00",
    });
    expect(toUnitProgressRow({ unit_id: "x", language: "it", version: "v", steps: null, best_score: null, test_attempts: 0, passed_at: null, passed_version: null, updated_at: "t" }).steps).toEqual({});
  });
});
