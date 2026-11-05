import { describe, expect, it } from "vitest";
import type { AssessmentDossier } from "@/lib/schemas/assessment";
import { FIXTURE_DOSSIER, FIXTURE_YOUTUBE_DOSSIER } from "@/test/assessment-fixtures";
import { checkAssessmentDossier } from "./check-dossier";

const AUDIO = { file: "/assessment/it/it-a1-1.m4a", speaker: "Giulia", licence: "granted-commercial", recordedOn: "2026-11-01" } as const;

describe("checkAssessmentDossier", () => {
  it("accepts a valid dossier, with or without recording", () => {
    expect(checkAssessmentDossier("it", "A1", FIXTURE_DOSSIER)).toEqual([]);
    expect(checkAssessmentDossier("it", "A1", { ...FIXTURE_DOSSIER, audio: AUDIO })).toEqual([]);
  });

  it("accepts a dossier number of several digits", () => {
    const id = "it-a1-10";
    const withId = (questions: typeof FIXTURE_DOSSIER.reading.questions, kind: string) =>
      questions.map((q, i) => ({ ...q, id: `${id}-${kind}${i + 1}` }));
    const dossier = {
      ...FIXTURE_DOSSIER,
      id,
      reading: { ...FIXTURE_DOSSIER.reading, questions: withId(FIXTURE_DOSSIER.reading.questions, "r") },
      listening: { ...FIXTURE_DOSSIER.listening, questions: withId(FIXTURE_DOSSIER.listening.questions, "l") },
    };
    expect(checkAssessmentDossier("it", "A1", dossier)).toEqual([]);
  });

  it("reports schema problems", () => {
    const reading = { ...FIXTURE_DOSSIER.reading, questions: FIXTURE_DOSSIER.reading.questions.slice(0, 2) };
    expect(checkAssessmentDossier("it", "A1", { ...FIXTURE_DOSSIER, reading }).join("\n")).toMatch(/reading\.questions/);
  });

  it("checks language, level and id", () => {
    expect(checkAssessmentDossier("ru", "A1", FIXTURE_DOSSIER).join("\n")).toMatch(/language is it, expected ru/);
    expect(checkAssessmentDossier("it", "A2", FIXTURE_DOSSIER).join("\n")).toMatch(/level is A1, expected A2/);
    expect(checkAssessmentDossier("it", "A1", { ...FIXTURE_DOSSIER, id: "it-a1" }).join("\n")).toMatch(/must be it-a1-<n>/);
  });

  it("checks question ids", () => {
    const questions = [...FIXTURE_DOSSIER.listening.questions];
    questions[1] = { ...questions[1], id: "it-a1-1-r2" };
    const problems = checkAssessmentDossier("it", "A1", { ...FIXTURE_DOSSIER, listening: { ...FIXTURE_DOSSIER.listening, questions } });
    expect(problems.join("\n")).toMatch(/listening question 2: id it-a1-1-r2, expected it-a1-1-l2/);
  });

  it("checks the word counts", () => {
    const short = { ...FIXTURE_DOSSIER, reading: { ...FIXTURE_DOSSIER.reading, text: "Ciao a tutti." } };
    expect(checkAssessmentDossier("it", "A1", short).join("\n")).toMatch(/reading\.text has 3 words, expected 60-90/);
    const long = { ...FIXTURE_DOSSIER, listening: { ...FIXTURE_DOSSIER.listening, script: "Ciao. ".repeat(60).trim() } };
    expect(checkAssessmentDossier("it", "A1", long).join("\n")).toMatch(/listening\.script has 60 words, expected 25-45/);
  });

  it("rejects a script that repeats a sentence of the text", () => {
    const script = `${FIXTURE_DOSSIER.listening.script} Dopo pranzo andiamo al parco vicino a casa!`;
    const problems = checkAssessmentDossier("it", "A1", { ...FIXTURE_DOSSIER, listening: { ...FIXTURE_DOSSIER.listening, script } });
    expect(problems.join("\n")).toMatch(/repeats the reading text/);
  });

  it("checks the audio file path", () => {
    const problems = checkAssessmentDossier("it", "A1", { ...FIXTURE_DOSSIER, audio: { ...AUDIO, file: "/audio/x.m4a" } });
    expect(problems.join("\n")).toMatch(/audio\.file is \/audio\/x\.m4a/);
  });

  it("rejects surrounding whitespace in the texts", () => {
    const reading = { ...FIXTURE_DOSSIER.reading, text: ` ${FIXTURE_DOSSIER.reading.text}` };
    // The schema trims nothing on these fields, so the check reports it.
    expect(checkAssessmentDossier("it", "A1", { ...FIXTURE_DOSSIER, reading }).join("\n")).toMatch(/reading\.text: leading or trailing whitespace/);
  });
});

describe("checkAssessmentDossier, YouTube listening", () => {
  const withVideo = (video: Record<string, unknown>, rest: Partial<AssessmentDossier> = {}) => {
    const listening = FIXTURE_YOUTUBE_DOSSIER.listening;
    if (listening.source !== "youtube") throw new Error("fixture");
    return { ...FIXTURE_YOUTUBE_DOSSIER, ...rest, listening: { ...listening, video: { ...listening.video, ...video } } };
  };

  it("accepts a valid passage, with no word count nor comparison with the text", () => {
    expect(checkAssessmentDossier("it", "A1", FIXTURE_YOUTUBE_DOSSIER)).toEqual([]);
  });

  it("checks the length of the passage against the level", () => {
    expect(checkAssessmentDossier("it", "A1", withVideo({ start: 10, end: 20 })).join("\n")).toMatch(/lasts 10 s, expected 15-60/);
    expect(checkAssessmentDossier("it", "A1", withVideo({ start: 0, end: 61 })).join("\n")).toMatch(/lasts 61 s, expected 15-60/);
    expect(checkAssessmentDossier("it", "A1", withVideo({ start: 0, end: 60 }))).toEqual([]);
  });

  it("rejects bounds out of order and a malformed video id", () => {
    expect(checkAssessmentDossier("it", "A1", withVideo({ start: 50, end: 50 })).join("\n")).toMatch(/end must be after start/);
    expect(checkAssessmentDossier("it", "A1", withVideo({ youtubeId: "short" })).join("\n")).toMatch(/youtubeId/);
  });

  it("rejects a recording, which makes no sense without a script", () => {
    expect(checkAssessmentDossier("it", "A1", withVideo({}, { audio: AUDIO })).join("\n")).toMatch(/audio must be null/);
  });
});
