// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMockMission } from "@/lib/data/mock/mission";
import { EMPTY_MISSION_PROGRESS } from "@/lib/schemas/mission";
import type { WritingFeedback } from "@/lib/schemas/writing-feedback";
import { MissionView } from "./mission-view";

const actions = vi.hoisted(() => ({
  setActivityDone: vi.fn(),
  answerQuestion: vi.fn(),
  saveExpression: vi.fn(),
  saveProduction: vi.fn(),
  requestWritingFeedback: vi.fn(),
  reportNoAccess: vi.fn(),
}));
vi.mock("@/app/actions/mission", () => actions);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const FEEDBACK: WritingFeedback = {
  scores: {
    grammar: { score: 4, comment: "Solide." },
    vocabulary: { score: 3, comment: "Correct." },
    register: { score: 5, comment: "Très bien." },
    coherence: { score: 2, comment: "À structurer." },
  },
  corrections: [{ original: "Шум мешают", corrected: "Шум мешает", explanation: "Accord du verbe." }],
  strength: "Phrases claires.",
};
const LONG_TEXT = "Шум в городе мешает мне спать по ночам";

const progress = () => screen.getByRole("progressbar", { name: "Progression de la mission" });

describe("MissionView", () => {
  it("updates progress as activities are checked", async () => {
    const user = userEvent.setup();
    render(<MissionView mission={buildMockMission("2026-10-13")} progress={EMPTY_MISSION_PROGRESS} persist={false} />);
    expect(progress()).toHaveProperty("ariaValueNow", "0");

    await user.click(screen.getByRole("checkbox", { name: /Lire l'article/ }));
    // Reading is 8 of 30 minutes.
    expect(progress().getAttribute("aria-valuenow")).toBe("27");
    expect(screen.getByText("8 / 30 min")).toBeTruthy();

    for (const box of screen.getAllByRole("checkbox", { checked: false })) await user.click(box);
    expect(progress().getAttribute("aria-valuenow")).toBe("100");
    expect(screen.getByText("Mission accomplie")).toBeTruthy();
  });

  it("gives feedback and a score on the quiz", async () => {
    const user = userEvent.setup();
    render(<MissionView mission={buildMockMission("2026-10-13")} progress={EMPTY_MISSION_PROGRESS} persist={false} />);
    const groups = screen.getAllByRole("group");
    const quiz = groups.filter((g) => g.tagName === "FIELDSET");
    expect(quiz).toHaveLength(3);

    await user.click(within(quiz[0]).getAllByRole("button")[1]); // wrong
    expect(within(quiz[0]).getByText(/Pas tout à fait/)).toBeTruthy();
    // Options lock once answered.
    expect(within(quiz[0]).getAllByRole("button").every((b) => (b as HTMLButtonElement).disabled)).toBe(true);

    await user.click(within(quiz[1]).getAllByRole("button")[1]); // right
    expect(within(quiz[1]).getByText(/Exact/)).toBeTruthy();
    await user.click(within(quiz[2]).getAllByRole("button")[1]); // right
    expect(screen.getByText("Score : 2 / 3")).toBeTruthy();
  });

  it("shows the no-transcript fallback and no quiz for the podcast", () => {
    render(<MissionView mission={buildMockMission("2026-10-13")} progress={EMPTY_MISSION_PROGRESS} persist={false} />);
    const italian = screen.getByRole("region", { name: "Italien" });
    expect(within(italian).getByText(/Pas de transcription accessible/)).toBeTruthy();
    expect(within(italian).queryByText("Compréhension")).toBeNull();
  });

  it("counts words in the writing task, including Cyrillic", async () => {
    const user = userEvent.setup();
    render(<MissionView mission={buildMockMission("2026-10-13")} progress={EMPTY_MISSION_PROGRESS} persist={false} />);
    await user.type(screen.getAllByLabelText("Ton texte")[0], "Шум в моём городе мешает спать");
    expect(screen.getByText("6 mots")).toBeTruthy();
  });

  it("saves an expression once, and shows it as already in the words", async () => {
    const user = userEvent.setup();
    render(<MissionView mission={buildMockMission("2026-10-13")} progress={EMPTY_MISSION_PROGRESS} persist={false} />);
    await user.click(screen.getByRole("button", { name: "Ajouter « в ра́зы » aux mots" }));
    const saved = screen.getByRole("button", { name: "« в ра́зы » est dans tes mots" });
    expect((saved as HTMLButtonElement).disabled).toBe(true);
  });

  it("starts from the saved progress", () => {
    const mission = buildMockMission("2026-10-13");
    const progress = {
      completedActivityIds: ["ru-read"],
      answers: { "ru-session": { "ru-q1": 0 } },
      savedExpressionIds: ["ru-e1"],
      drafts: { "ru-session": "Bonjour" },
      writingReviews: {},
    };
    render(<MissionView mission={mission} progress={progress} persist={false} />);
    expect(screen.getByText("8 / 30 min")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Lire l'article/ }).getAttribute("aria-checked")).toBe("true");
    expect((screen.getAllByLabelText("Ton texte")[0] as HTMLTextAreaElement).value).toBe("Bonjour");
  });

  describe("with persistence", () => {
    const mission = buildMockMission("2026-10-13");
    const mount = () => render(<MissionView mission={mission} progress={EMPTY_MISSION_PROGRESS} persist />);

    it("saves ticks, answers and expressions", async () => {
      actions.setActivityDone.mockResolvedValue({ ok: true, data: undefined });
      actions.answerQuestion.mockResolvedValue({ ok: true, data: undefined });
      actions.saveExpression.mockResolvedValue({ ok: true, data: undefined });
      const user = userEvent.setup();
      mount();
      await user.click(screen.getByRole("checkbox", { name: /Lire l'article/ }));
      expect(actions.setActivityDone).toHaveBeenCalledWith({ activityId: "ru-read", done: true });

      const quiz = screen.getAllByRole("group").filter((g) => g.tagName === "FIELDSET");
      await user.click(within(quiz[0]).getAllByRole("button")[1]);
      expect(actions.answerQuestion).toHaveBeenCalledWith({
        sessionId: "ru-session",
        questionId: "ru-q1",
        selectedIndex: 1,
      });

      await user.click(screen.getByRole("button", { name: "Ajouter « в ра́зы » aux mots" }));
      expect(actions.saveExpression).toHaveBeenCalledWith({ sessionId: "ru-session", expressionId: "ru-e2" });
    });

    it("rolls back a tick the server refused and says so", async () => {
      actions.setActivityDone.mockResolvedValue({ ok: false, error: "Hors ligne" });
      const user = userEvent.setup();
      mount();
      await user.click(screen.getByRole("checkbox", { name: /Lire l'article/ }));
      expect((await screen.findByRole("alert")).textContent).toMatch(/Hors ligne/);
      expect(screen.getByRole("checkbox", { name: /Lire l'article/ }).getAttribute("aria-checked")).toBe("false");
      expect(screen.getByText("0 / 30 min")).toBeTruthy();
    });
  
    it("saves the written text shortly after the user stops typing", async () => {
      actions.saveProduction.mockResolvedValue({ ok: true, data: undefined });
      const user = userEvent.setup();
      mount();
      await user.type(screen.getAllByLabelText("Ton texte")[0], "Шум мешает");
      expect(await screen.findByText("Enregistré")).toBeTruthy();
      // One request for the whole burst of typing, with the full text.
      expect(actions.saveProduction).toHaveBeenCalledTimes(1);
      expect(actions.saveProduction).toHaveBeenCalledWith({ sessionId: "ru-session", body: "Шум мешает" });
    });

    it("says when the text could not be saved", async () => {
      actions.saveProduction.mockResolvedValue({ ok: false, error: "Hors ligne" });
      const user = userEvent.setup();
      mount();
      await user.type(screen.getAllByLabelText("Ton texte")[0], "abc");
      expect(await screen.findByText("Non enregistré")).toBeTruthy();
      expect((await screen.findByRole("alert")).textContent).toMatch(/Hors ligne/);
    });
  });

  describe("writing feedback", () => {
    const mission = buildMockMission("2026-10-13");
    const mount = (props: { canReviewWriting?: boolean; text?: string } = {}) =>
      render(
        <MissionView
          mission={mission}
          progress={{ ...EMPTY_MISSION_PROGRESS, drafts: { "ru-session": props.text ?? "" } }}
          persist
          canReviewWriting={props.canReviewWriting ?? true}
        />,
      );
    // The Russian written task comes first; the Italian one is spoken and has its own button.
    const button = () => screen.getAllByRole("button", { name: /Terminer et obtenir une correction/ })[0] as HTMLButtonElement;

    it("has no review button when reviews are unavailable", () => {
      mount({ canReviewWriting: false });
      expect(screen.queryByRole("button", { name: /Terminer et obtenir une correction/ })).toBeNull();
    });

    it("disables the button below the minimum", () => {
      mount({ text: "Шум" });
      expect(button().disabled).toBe(true);
      expect(screen.getAllByText(/Écris au moins quelques phrases/).length).toBeGreaterThan(0);
    });

    it("asks for the review and shows it", async () => {
      actions.requestWritingFeedback.mockResolvedValue({
        ok: true,
        data: { status: "ready", feedback: FEEDBACK, reviewedText: LONG_TEXT, attemptsLeft: 2 },
      });
      const user = userEvent.setup();
      mount({ text: LONG_TEXT });
      expect(button().disabled).toBe(false);
      await user.click(button());
      expect(actions.requestWritingFeedback).toHaveBeenCalledWith({ sessionId: "ru-session", body: LONG_TEXT });
      expect(await screen.findByLabelText("Grammaire : 4 sur 5")).toBeTruthy();
      expect(screen.getByRole("checkbox", { name: /Écrire un court paragraphe/ }).getAttribute("aria-checked")).toBe("true");
      // Already reviewed: nothing more to ask until the text changes.
      expect(button().disabled).toBe(true);
      expect(screen.queryByText(/version précédente/)).toBeNull();
    });

    it("says the review is about an older version once the text changed", async () => {
      actions.requestWritingFeedback.mockResolvedValue({
        ok: true,
        data: { status: "ready", feedback: FEEDBACK, reviewedText: LONG_TEXT, attemptsLeft: 2 },
      });
      const user = userEvent.setup();
      mount({ text: LONG_TEXT });
      await user.click(button());
      await screen.findByLabelText("Grammaire : 4 sur 5");
      await user.type(screen.getAllByLabelText("Ton texte")[0], " !");
      expect(screen.getByText("Cette correction porte sur une version précédente de ton texte.")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Corriger à nouveau (2 restantes)" })).toBeTruthy();
    });

    it("keeps the step ticked and stays neutral when the review is unavailable", async () => {
      actions.requestWritingFeedback.mockResolvedValue({ ok: true, data: { status: "unavailable", attemptsLeft: 2 } });
      const user = userEvent.setup();
      mount({ text: LONG_TEXT });
      await user.click(button());
      expect(await screen.findByText(/La correction n’est pas disponible pour l’instant/)).toBeTruthy();
      expect(screen.getByRole("checkbox", { name: /Écrire un court paragraphe/ }).getAttribute("aria-checked")).toBe("true");
      expect(button().disabled).toBe(false);
    });

    it("reports the attempts limit and blocks further requests", async () => {
      actions.requestWritingFeedback.mockResolvedValue({ ok: true, data: { status: "limit" } });
      const user = userEvent.setup();
      mount({ text: LONG_TEXT });
      await user.click(button());
      expect(await screen.findByText("Tu as utilisé les 3 corrections de ce texte.")).toBeTruthy();
      expect(button().disabled).toBe(true);
    });

    it("shows the error when the action fails", async () => {
      actions.requestWritingFeedback.mockResolvedValue({ ok: false, error: "Hors ligne" });
      const user = userEvent.setup();
      mount({ text: LONG_TEXT });
      await user.click(button());
      expect((await screen.findByRole("alert")).textContent).toMatch(/Hors ligne/);
    });
  });
});
