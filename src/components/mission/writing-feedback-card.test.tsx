// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { WritingFeedback } from "@/lib/schemas/writing-feedback";
import { WritingFeedbackCard } from "./writing-feedback-card";

afterEach(cleanup);

const feedback: WritingFeedback = {
  scores: {
    grammar: { score: 4, comment: "Solide." },
    vocabulary: { score: 3, comment: "Correct." },
    register: { score: 5, comment: "Très bien." },
    coherence: { score: 2, comment: "À structurer." },
  },
  corrections: [{ original: "Шум мешают", corrected: "Шум мешает", explanation: "Accord du verbe." }],
  strength: "Phrases claires.",
};

describe("WritingFeedbackCard", () => {
  it("renders each criterion with an accessible score", () => {
    render(<WritingFeedbackCard language="ru" feedback={feedback} />);
    expect(screen.getByLabelText("Grammaire : 4 sur 5")).toBeTruthy();
    expect(screen.getByLabelText("Lexique : 3 sur 5")).toBeTruthy();
    expect(screen.getByLabelText("Registre : 5 sur 5")).toBeTruthy();
    expect(screen.getByLabelText("Cohérence : 2 sur 5")).toBeTruthy();
    expect(screen.getByText("À structurer.")).toBeTruthy();
  });

  it("shows corrections in the studied language, the strength and the AI mention", () => {
    render(<WritingFeedbackCard language="ru" feedback={feedback} />);
    expect(screen.getByText("Шум мешают").closest("[lang]")?.getAttribute("lang")).toBe("ru");
    expect(screen.getByText("Шум мешает")).toBeTruthy();
    expect(screen.getByText("Accord du verbe.")).toBeTruthy();
    expect(screen.getByText(/Phrases claires./)).toBeTruthy();
    expect(screen.getByText("Correction rédigée par une IA : elle peut contenir des erreurs.")).toBeTruthy();
  });
});
