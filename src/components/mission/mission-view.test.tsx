// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMockMission } from "@/lib/data/mock/mission";
import { EMPTY_MISSION_PROGRESS } from "@/lib/schemas/mission";
import { MissionView } from "./mission-view";

const actions = vi.hoisted(() => ({
  setActivityDone: vi.fn(),
  answerQuestion: vi.fn(),
  saveExpression: vi.fn(),
  saveProduction: vi.fn(),
}));
vi.mock("@/app/actions/mission", () => actions);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

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
    await user.type(screen.getByLabelText("Ton texte"), "Шум в моём городе мешает спать");
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
    };
    render(<MissionView mission={mission} progress={progress} persist={false} />);
    expect(screen.getByText("8 / 30 min")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Lire l'article/ }).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByLabelText("Ton texte") as HTMLTextAreaElement).value).toBe("Bonjour");
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
      await user.type(screen.getByLabelText("Ton texte"), "Шум мешает");
      expect(await screen.findByText("Enregistré")).toBeTruthy();
      // One request for the whole burst of typing, with the full text.
      expect(actions.saveProduction).toHaveBeenCalledTimes(1);
      expect(actions.saveProduction).toHaveBeenCalledWith({ sessionId: "ru-session", body: "Шум мешает" });
    });

    it("says when the text could not be saved", async () => {
      actions.saveProduction.mockResolvedValue({ ok: false, error: "Hors ligne" });
      const user = userEvent.setup();
      mount();
      await user.type(screen.getByLabelText("Ton texte"), "abc");
      expect(await screen.findByText("Non enregistré")).toBeTruthy();
      expect((await screen.findByRole("alert")).textContent).toMatch(/Hors ligne/);
    });
  });
});
