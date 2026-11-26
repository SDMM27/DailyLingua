import { describe, expect, it } from "vitest";
import { buildWritingFeedbackMessage, WRITING_FEEDBACK_PROMPT_VERSION, WRITING_FEEDBACK_SYSTEM_PROMPT } from "./prompts/writing-feedback";

const input = {
  studiedLanguage: { code: "it", name: "italiano" },
  firstLanguage: { code: "fr", name: "français" },
  level: "A2", targetLevel: "B1", purpose: null, task: "Racconta.", text: "Io vado al mercato",
};

describe("writing feedback prompt", () => {
  it("carries the input mode in the JSON message, never in the instructions", () => {
    expect(JSON.parse(buildWritingFeedbackMessage({ ...input, inputMode: "typed" })).inputMode).toBe("typed");
    expect(JSON.parse(buildWritingFeedbackMessage({ ...input, inputMode: "speech_transcript" }))).toMatchObject({ inputMode: "speech_transcript", text: input.text });
    expect(WRITING_FEEDBACK_SYSTEM_PROMPT).not.toContain(input.text);
  });

  it("holds the constant paragraph about speech transcripts, so the prompt cache stays valid for both modes", () => {
    expect(WRITING_FEEDBACK_SYSTEM_PROMPT).toContain(
      "When inputMode is speech_transcript, the text is an automatic transcript of the learner's speech. Ignore punctuation and capitalisation (do not score or correct them). Do not list a spelling correction when the two forms sound the same. Judge grammar, vocabulary, register and coherence as usual; never assume a form the transcript does not show.",
    );
  });

  it("has a version newer than the one before the spoken mode", () => {
    expect(WRITING_FEEDBACK_PROMPT_VERSION > "2026-11-19.1").toBe(true);
  });
});
