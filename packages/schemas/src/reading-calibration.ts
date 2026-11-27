import { z } from "zod";
import { isoInstantSchema } from "./common";

export const readingCalibrationLanguageSchema = z.enum(["it", "ru"]);
const band = z.object({
  level: z.enum(["A2", "B1", "B2", "C1"]),
  meetsThreshold: z.boolean(),
});

export const readingCalibrationSampleSchema = z.array(z.object({
  participant: z.uuid(),
  observation: z.object({
    version: z.literal(1),
    language: readingCalibrationLanguageSchema,
    observedAt: isoInstantSchema,
    reading: z.object({ bands: z.array(band) }),
  }),
  assessment: z.object({
    language: readingCalibrationLanguageSchema,
    assessedAt: isoInstantSchema,
    readingValue: z.number().min(0).max(7),
  }),
})).superRefine((entries, ctx) => {
  const seen = new Set<string>();
  for (const [index, { participant, observation, assessment }] of entries.entries()) {
    const key = `${participant.toLowerCase()}:${observation.language}`;
    const issue = (message: string) => ctx.addIssue({ code: "custom", path: [index], message });
    if (seen.has(key)) issue("Volontaire en double pour cette langue");
    seen.add(key);
    if (observation.language !== assessment.language) issue("Les langues de l’observation et du bilan diffèrent");
    if (Date.parse(observation.observedAt) >= Date.parse(assessment.assessedAt)) {
      issue("L’observation doit précéder le bilan");
    }
    const levels = observation.reading.bands.map(({ level }) => level);
    if (new Set(levels).size !== levels.length) issue("Niveau d’observation en double");
  }
});

export type ReadingCalibrationSample = z.infer<typeof readingCalibrationSampleSchema>;
