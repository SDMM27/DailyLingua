import { describe, expect, it } from "vitest";
import { ASSESSMENT_LIMITS, type AssessmentDossier } from "@/lib/schemas/assessment";
import { audioPublicPath } from "./audio";
import { ASSESSMENT_DOSSIERS } from "./dossiers";
import { listeningMode } from "./policy";
import { toPublicDossier } from "./public-dossier";

const real = Object.values(ASSESSMENT_DOSSIERS).flat();
const questions = (d: AssessmentDossier) => [...d.reading.questions, ...d.listening.questions];

/** The text the learner is meant to see, to tell an expected point leaking from one that is in a prompt. */
const shown = (d: AssessmentDossier) =>
  [d.title, d.reading.text, d.writing.prompt, ...questions(d).map((q) => q.prompt)].join("\n");

/** A real dossier, recorded and reviewed. */
function recorded(dossier: AssessmentDossier): AssessmentDossier {
  return {
    ...dossier,
    audio: { file: audioPublicPath(dossier.language, dossier.id), speaker: "Test", licence: "granted-commercial", recordedOn: "2026-11-01" },
    reviewedOn: "2026-11-01",
  };
}

describe("toPublicDossier", () => {
  it("has real dossiers to check", () => {
    expect(real.length).toBeGreaterThan(0);
  });

  it("keeps the script, the reference answers and the expected points out of a recorded dossier", () => {
    for (const source of real) {
      const dossier = recorded(source);
      const mode = listeningMode(dossier, "hide");
      expect(mode).toBe("audio");
      const json = JSON.stringify(toPublicDossier(dossier, mode));
      expect(json, dossier.id).not.toContain(dossier.listening.script);
      for (const q of questions(dossier)) {
        expect(json, q.id).not.toContain(q.referenceAnswer);
        // A short point may legitimately occur in a prompt or the text; it must not occur anywhere else.
        for (const point of q.expectedPoints.filter((p) => !shown(dossier).includes(p))) {
          expect(json, `${q.id}: ${point}`).not.toContain(point);
        }
      }
      for (const key of ["referenceAnswer", "expectedPoints", "script", "reviewedOn", "speaker", "licence", "topic"]) {
        expect(json).not.toContain(`"${key}"`);
      }
    }
  });

  it("gives the audio URL in audio mode and nothing else about the recording", () => {
    const dossier = recorded(real[0]);
    const projection = toPublicDossier(dossier, "audio");
    expect(projection.listening).toEqual({
      questions: dossier.listening.questions.map(({ id, prompt }) => ({ id, prompt })),
      audioSrc: audioPublicPath(dossier.language, dossier.id),
      draftScript: null,
    });
  });

  it("gives the script only for a draft without recording under the show policy", () => {
    const draft = { ...real[0], audio: null };
    const mode = listeningMode(draft, "show");
    expect(mode).toBe("draft-script");
    const projection = toPublicDossier(draft, mode);
    expect(projection.listening.draftScript).toBe(draft.listening.script);
    expect(projection.listening.audioSrc).toBeNull();
    // Even then, no answer leaves.
    const json = JSON.stringify(projection);
    for (const q of questions(draft)) expect(json).not.toContain(q.referenceAnswer);
  });

  it("gives neither script nor audio when the listening is unavailable, whatever the dossier holds", () => {
    const projection = toPublicDossier(recorded(real[0]), "unavailable");
    expect(projection.listening.audioSrc).toBeNull();
    expect(projection.listening.draftScript).toBeNull();
    expect(JSON.stringify(projection)).not.toContain(real[0].listening.script);
  });

  it("carries the text, the prompts and the number of sentences of the writing task", () => {
    const dossier = real.find((d) => d.level === "B2") ?? real[0];
    const projection = toPublicDossier(dossier, "unavailable");
    expect(projection).toMatchObject({ id: dossier.id, language: dossier.language, level: dossier.level, title: dossier.title });
    expect(projection.reading.text).toBe(dossier.reading.text);
    expect(projection.reading.questions.map((q) => q.prompt)).toEqual(dossier.reading.questions.map((q) => q.prompt));
    expect(projection.writing).toEqual({ prompt: dossier.writing.prompt, sentences: ASSESSMENT_LIMITS[dossier.level].sentences });
  });
});
