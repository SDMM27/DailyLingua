import { describe, expect, it } from "vitest";
import { EVAL_CASES, transcriptProblems } from "./writing-feedback-eval-set";

describe("speech transcripts of the eval set", () => {
  const transcripts = EVAL_CASES.filter((evalCase) => evalCase.inputMode === "speech_transcript");

  it("holds two Italian and two Russian ones, every error to find being in the text", () => {
    expect(transcripts.map(({ request }) => request.language).sort()).toEqual(["it", "it", "ru", "ru"]);
    for (const evalCase of transcripts) {
      expect(evalCase.mustCorrect?.length, evalCase.id).toBeGreaterThanOrEqual(2);
      for (const { original } of evalCase.mustCorrect ?? []) expect(evalCase.request.text, evalCase.id).toContain(original);
      // What the recognition gives: nothing but lowercase letters and spaces.
      expect(evalCase.request.text, evalCase.id).not.toMatch(/[.,;:!?]/);
      expect(evalCase.request.text, evalCase.id).toBe(evalCase.request.text.toLocaleLowerCase());
    }
  });

  it("flags a lost error and a correction of punctuation or capitals only", () => {
    const evalCase = transcripts.find(({ id }) => id === "it-A2-transcript-auxiliary")!;
    expect(transcriptProblems(evalCase, [{ original: "ho andato", corrected: "sono andato" }, { original: "ho arrivato tardi", corrected: "sono arrivato tardi" }])).toEqual([]);
    expect(transcriptProblems(evalCase, [{ original: "ho andato", corrected: "sono andato" }])).toEqual(["faute perdue : « ho arrivato »"]);
    expect(transcriptProblems(evalCase, [{ original: "ho andato", corrected: "sono andato" }, { original: "ho arrivato", corrected: "sono arrivato" }, { original: "ieri ho", corrected: "Ieri, ho" }]))
      .toEqual(["correction de ponctuation ou de majuscule : « ieri ho »"]);
  });

  it("checks nothing on a written text", () => {
    expect(transcriptProblems(EVAL_CASES[0]!, [{ original: "a", corrected: "A" }])).toEqual([]);
  });

  it("requires a verbatim source and the expected changed form", () => {
    const evalCase = transcripts.find(({ id }) => id === "it-A2-transcript-auxiliary")!;
    const problems = transcriptProblems(evalCase, [
      { original: "ho andato al lavoro", corrected: "ho andato in ufficio" },
      { original: "ho arrivato in ritardo", corrected: "sono arrivato in ritardo" },
    ]);
    expect(problems).toEqual([
      "faute perdue : « ho andato »", "faute perdue : « ho arrivato »",
      "passage absent de la transcription : « ho arrivato in ritardo »",
    ]);
  });
});
