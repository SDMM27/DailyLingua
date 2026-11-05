import { describe, expect, it } from "vitest";
import { ASSESSMENT_DOSSIERS } from "@/lib/assessment/dossiers";
import { EVAL_CASES, WRITING_BANDS, buildEvalRequest } from "./assessment-eval-set";
import { buildAssessmentGradingMessage } from "./assessment-grading-prompt";

const DOSSIERS = Object.values(ASSESSMENT_DOSSIERS).flat();

describe("assessment eval set", () => {
  it("has about a dozen unique cases", () => {
    expect(EVAL_CASES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(EVAL_CASES.map((c) => c.id)).size).toBe(EVAL_CASES.length);
  });

  it("points to existing dossiers and questions, with a verdict for each answer", () => {
    for (const evalCase of EVAL_CASES) {
      const dossier = DOSSIERS.find((d) => d?.id === evalCase.dossierId);
      expect(dossier, evalCase.id).toBeDefined();
      const ids = new Set([...dossier!.reading.questions, ...dossier!.listening.questions].map((q) => q.id));
      expect(Object.keys(evalCase.answers).sort(), evalCase.id).toEqual(Object.keys(evalCase.expected).sort());
      for (const [id, answer] of Object.entries(evalCase.answers)) {
        expect(ids.has(id), `${evalCase.id}: ${id}`).toBe(true);
        expect(answer.trim(), `${evalCase.id}: ${id}`).not.toBe("");
      }
      if (evalCase.writing) {
        expect(evalCase.writing.text.trim(), evalCase.id).not.toBe("");
        expect(WRITING_BANDS[evalCase.writing.expected]).toBeDefined();
      }
    }
  });

  it("covers every kind of answer and of text", () => {
    const verdicts = new Set(EVAL_CASES.flatMap((c) => Object.values(c.expected)));
    expect([...verdicts].sort()).toEqual(["correct", "partial", "wrong"]);
    expect(new Set(EVAL_CASES.flatMap((c) => (c.writing ? [c.writing.expected] : []))).size).toBe(4);
    expect(EVAL_CASES.some((c) => /ignore les consignes/i.test(Object.values(c.answers).join(" ")))).toBe(true);
  });

  it("builds requests that never carry the text or the script of the dossier", () => {
    for (const evalCase of EVAL_CASES) {
      const request = buildEvalRequest(evalCase);
      const dossier = DOSSIERS.find((d) => d?.id === evalCase.dossierId)!;
      const message = buildAssessmentGradingMessage(request);
      expect(request.questions.map((q) => q.id), evalCase.id).toEqual(Object.keys(evalCase.answers));
      expect(message).not.toContain(dossier.reading.text.slice(0, 80));
      if (dossier.listening.source === "script") expect(message).not.toContain(dossier.listening.script.slice(0, 80));
    }
  });
});
