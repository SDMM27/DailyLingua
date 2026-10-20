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
  corrections: [
    { original: "Шум мешают", corrected: "Шум мешает", explanation: "Accord du verbe.", category: "agreement" },
  ],
  strength: "Phrases claires.",
  nativeVersion: "Шум мешает мне работать.",
};

describe("WritingFeedbackCard", () => {
  it("shows the native version in the studied language", () => {
    render(<WritingFeedbackCard language="ru" feedback={feedback} />);
    const text = screen.getByText("Шум мешает мне работать.");
    expect(text.getAttribute("lang")).toBe("ru");
    expect(screen.getByText("Ce qu’un natif écrirait")).toBeTruthy();
  });

  it("still renders a review stored before categories and native versions existed", () => {
    const old = { ...feedback, nativeVersion: undefined, corrections: [{ original: "a", corrected: "b", explanation: "c" }] };
    render(<WritingFeedbackCard language="ru" feedback={old} />);
    expect(screen.queryByText("Ce qu’un natif écrirait")).toBeNull();
    expect(screen.queryByText("Accords")).toBeNull();
    expect(screen.getByText("c")).toBeTruthy();
  });

  it("renders what the caller adds under each correction", () => {
    render(<WritingFeedbackCard language="ru" feedback={feedback} correctionAction={(i) => <button>Action {i}</button>} />);
    expect(screen.getByRole("button", { name: "Action 0" })).toBeTruthy();
  });

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
    expect(screen.getByText("Accords")).toBeTruthy();
    expect(screen.getByText("Correction rédigée par une IA : elle peut contenir des erreurs.")).toBeTruthy();
  });
});
