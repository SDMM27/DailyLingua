import { readingCalibrationLanguageSchema, type ReadingCalibrationSample } from "@dailylingua/schemas";
import { levelToValue } from "./levels";

/** Compare a pilot candidate against an independent assessment on the shared 0–7 scale. */
export function calibrateReading(sample: ReadingCalibrationSample) {
  return readingCalibrationLanguageSchema.options.map((code) => {
    const pairs = sample.filter(({ observation }) => observation.language === code);
    const differences = pairs.flatMap(({ observation, assessment }) => {
      const qualifying = observation.reading.bands.filter(({ meetsThreshold }) => meetsThreshold);
      if (qualifying.length === 0) return [];
      const candidate = Math.max(...qualifying.map(({ level }) => levelToValue(level)));
      return [Math.abs(assessment.readingValue - candidate)];
    });
    const compared = differences.length;
    return {
      language: code,
      pairs: pairs.length,
      compared,
      withoutCandidate: pairs.length - compared,
      withinHalfLevel: differences.filter((value) => value <= 0.5).length,
      meanAbsoluteError: compared === 0 ? null : differences.reduce((sum, value) => sum + value, 0) / compared,
    };
  });
}
