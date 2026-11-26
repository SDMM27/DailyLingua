import { describe, expect, it } from "vitest";
import { readingCalibrationSampleSchema } from "@dailylingua/schemas";
import { calibrateReading } from "./reading-calibration";

const sample = {
  participant: "00000000-0000-4000-8000-000000000001",
  observation: {
    version: 1, language: "it", observedAt: "2026-11-20T10:00:00.100Z",
    reading: { bands: [{ level: "B1", meetsThreshold: true }, { level: "A2", meetsThreshold: true }] },
  },
  assessment: { language: "it", assessedAt: "2026-11-20T10:00:00.200Z", readingValue: 4 },
};

describe("reading calibration", () => {
  it("compares the highest qualifying band and counts the half-level boundary", () => {
    const missing = {
      ...sample, participant: "00000000-0000-4000-8000-000000000002",
      observation: { ...sample.observation, reading: { bands: [{ level: "B1", meetsThreshold: false }] } },
    };
    const russian = {
      ...sample, observation: { ...sample.observation, language: "ru" },
      assessment: { ...sample.assessment, language: "ru", readingValue: 2 },
    };
    const result = calibrateReading(readingCalibrationSampleSchema.parse([sample, missing, russian]));
    expect(result).toEqual([
      { language: "it", pairs: 2, compared: 1, withoutCandidate: 1, withinHalfLevel: 1, meanAbsoluteError: 0.5 },
      { language: "ru", pairs: 1, compared: 1, withoutCandidate: 0, withinHalfLevel: 0, meanAbsoluteError: 1.5 },
    ]);
  });

  it("leaves the error unknown for an empty cohort", () => {
    expect(calibrateReading([])).toEqual(["it", "ru"].map((language) => ({
      language, pairs: 0, compared: 0, withoutCandidate: 0, withinHalfLevel: 0, meanAbsoluteError: null,
    })));
  });

  it("rejects duplicates, language mismatches, invalid scores and observations from after the assessment", () => {
    expect(readingCalibrationSampleSchema.safeParse([sample, sample]).success).toBe(false);
    for (const change of [
      { language: "ru" }, { readingValue: 8 }, { assessedAt: sample.observation.observedAt },
      { assessedAt: "2026-11-20T10:00:00.050Z" },
    ]) {
      expect(readingCalibrationSampleSchema.safeParse([{ ...sample, assessment: { ...sample.assessment, ...change } }]).success).toBe(false);
    }
  });
});
