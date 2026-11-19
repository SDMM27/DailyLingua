import type { AiGateway } from "@dailylingua/ai";
import type { GradedTextStore } from "@dailylingua/data";
import { describe, expect, it, vi } from "vitest";
import { checkGradedText, textBody, type TextCell } from "./checks";
import { generateGradedText } from "./generate";
import { gradedTextDraftSchema, type GradedTextDraft } from "./schema";

const cell: TextCell = { language: "it", level: "A2", theme: "home" };
const ranks = new Map([["le", 10], ["case", 50]]);
const rare = ["viottolo", "scodella", "tovaglia", "soffitta", "sottoscala"];
const sentence = ["Le", ...rare, ...Array.from({ length: 14 }, () => "case")].join(" ") + ".";
const question = { question: "Quale parola?", options: ["Uno", "Due", "Tre", "Quattro"], answerIndex: 2 };
const gap = (index: number, removed = rare[0]!) => {
  const [before, after] = sentence.split(removed);
  return { sentence: index, before: before!, removed, after: after!, accept: [removed] };
};

const draft = (): GradedTextDraft => gradedTextDraftSchema.parse({
  title: "Una casa",
  paragraphs: Array.from({ length: 3 }, () => [sentence, sentence, sentence]),
  listening: { from: 0, to: 1 },
  words: rare.map((lemma) => ({ lemma, dictionaryForm: lemma, forms: [lemma], definition: "Una cosa.", sentence: 0, exercise: question })),
  reading: [0, 1, 2, 3, 4].map((index) => ({ ...question, skill: index === 0 ? "gist" : "detail", evidence: [index], listeningOnly: index === 1 })),
  grammar: { id: "it-a1-articles", evidence: [0, 2, 3], gaps: [0, 2, 3].map((index) => gap(index)),
    transformations: [{ question: "Trasforma.", accept: ["Sì."] }, { question: "Cambia.", accept: ["No."] }] },
  wordGaps: [0, 1, 2, 3].map((index) => gap(index, rare[index])),
  writingTask: "Descrivi la tua casa.",
});

const id = "00000000-0000-4000-8000-000000000001";

function harness(responses: unknown[]) {
  const mock = vi.fn<(purpose: string) => unknown>(() => responses.shift());
  const ai: AiGateway = {
    async call(input) {
      return { output: input.schema.parse(mock(input.purpose)), model: "test-model", promptVersion: input.promptVersion,
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0, budgetWarning: false };
    },
  };
  const store = {
    claim: vi.fn<GradedTextStore["claim"]>(async () => ({ status: "claimed", id })),
    previousBodies: vi.fn<GradedTextStore["previousBodies"]>(async () => []),
    publish: vi.fn<GradedTextStore["publish"]>(async () => id),
    fail: vi.fn<GradedTextStore["fail"]>(async () => undefined),
  };
  return { mock, ai, store, ranks, stockAvailable: async () => false };
}

describe("graded text publication", () => {
  it("publishes one shared passage with separately stored keys only after an independent approval", async () => {
    const options = harness([draft(), { approved: true, issues: [] }]);
    expect(checkGradedText(cell, draft(), ranks, [])).toEqual([]);
    await expect(generateGradedText(cell, options)).resolves.toBe("published");
    expect(options.mock.mock.calls).toEqual([["graded_text"], ["graded_text_review"]]);
    const publication = options.store.publish.mock.calls[0]!;
    expect(publication[1]).toMatchObject({ word_count: 180, listening_segment: { from: 0, to: 1 }, checks: { review: "approved" } });
    expect(publication[2]).toHaveLength(19);
    expect(publication[2][0]).toMatchObject({ answer: "2", prompt: { question: question.question } });
    expect(publication[2][0]?.prompt).not.toHaveProperty("answer");
    expect(publication[2].find((item) => item.prompt.group === "word-choice")?.prompt).toMatchObject({ card: { backLanguage: "it" } });
  });

  it("rejects a near duplicate and reconsidered texts never enter the reading stock", async () => {
    const content = draft();
    const options = harness([content, content]);
    options.store.previousBodies.mockResolvedValue([textBody(content.paragraphs)]);
    await expect(generateGradedText(cell, options)).resolves.toBe("unavailable");
    expect(options.store.claim).toHaveBeenCalledTimes(2);
    expect(options.store.fail).toHaveBeenCalledWith(id, "similarity");
    expect(options.mock.mock.calls).toEqual([["graded_text"], ["graded_text"]]);
    expect(options.store.publish).not.toHaveBeenCalled();
  });

  it("spends nothing if the shared cap is exhausted or another worker owns the cell", async () => {
    const options = harness([]);
    options.store.claim.mockResolvedValueOnce({ status: "quota" }).mockResolvedValueOnce({ status: "busy" });
    await expect(generateGradedText(cell, options)).resolves.toBe("unavailable");
    await expect(generateGradedText(cell, options)).resolves.toBe("busy");
    expect(options.mock).not.toHaveBeenCalled();
  });

  it("retries once after the reviewer rejects the first draft", async () => {
    const options = harness([draft(), { approved: false, issues: ["ambiguous"] }, draft(), { approved: true, issues: [] }]);
    await expect(generateGradedText(cell, options)).resolves.toBe("published");
    expect(options.store.fail).toHaveBeenCalledWith(id, "independent_review_rejected");
    expect(options.store.publish).toHaveBeenCalledTimes(1);
  });
});
