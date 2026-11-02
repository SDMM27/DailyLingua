// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toPublicDossier } from "@/lib/assessment/public-dossier";
import { SKILL_DESCRIPTIONS } from "@/lib/assessment/skill-descriptions";
import type { AssessmentResults } from "@/lib/schemas/assessment";
import { FIXTURE_DOSSIER } from "@/test/assessment-fixtures";
import { AssessmentProfile } from "./assessment-profile";

const { refresh, apply, start } = vi.hoisted(() => ({ refresh: vi.fn(), apply: vi.fn(), start: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("@/app/actions/assessment", () => ({ applyAssessmentLevel: apply, startAssessment: start }));

const dossier = toPublicDossier(FIXTURE_DOSSIER, "unavailable");
const r = FIXTURE_DOSSIER.reading.questions.map((q) => q.id);
const l = FIXTURE_DOSSIER.listening.questions.map((q) => q.id);

const RESULTS: AssessmentResults = {
  reading: { level: "B2", confidence: "high", offerHigher: true },
  listening: { level: "B1", confidence: "low", offerHigher: false },
  writing: { level: "B1", confidence: "medium", offerHigher: false },
  speaking: { level: "A2", confidence: "low", declared: true },
  review: {
    questions: {
      [r[0]]: { verdict: "correct", comment: "Tu as bien situé la ville." },
      [r[1]]: { verdict: "partial", comment: "Il manque le café." },
      [r[2]]: { verdict: "wrong", comment: "Ce n’est pas la bonne personne." },
      [l[0]]: { verdict: "correct", comment: "Bien vu." },
    },
    writing: { scores: { grammar: 4, vocabulary: 3, syntax: 3, adequacy: 5 }, comment: "Des phrases claires, quelques accords à revoir." },
  },
};

beforeEach(() => {
  apply.mockResolvedValue({ ok: true, data: { level: "B1" } });
  start.mockResolvedValue({ ok: true, data: { assessmentId: "as-2" } });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function setup(props: Partial<Parameters<typeof AssessmentProfile>[0]> = {}) {
  const user = userEvent.setup();
  render(
    <AssessmentProfile
      assessmentId="as-1"
      language="it"
      results={RESULTS}
      dossier={dossier}
      currentLevel="B2"
      latest
      higherLevel={null}
      canRedo
      {...props}
    />,
  );
  return user;
}

/** The four lines of the profile (the detail has lists of its own). */
const skillLines = () => within(screen.getAllByRole("list")[0]).getAllByRole("listitem");

describe("AssessmentProfile", () => {
  it("shows one line per skill with the sentence of its level and the CEFR level in small", () => {
    setup();
    const lines = skillLines();
    expect(lines).toHaveLength(4);
    expect(within(lines[0]).getByText("Comprendre un texte")).toBeTruthy();
    expect(within(lines[0]).getByText(SKILL_DESCRIPTIONS.reading.B2)).toBeTruthy();
    expect(within(lines[1]).getByText(SKILL_DESCRIPTIONS.listening.B1)).toBeTruthy();
    expect(within(lines[2]).getByText(SKILL_DESCRIPTIONS.writing.B1)).toBeTruthy();
    expect(screen.getByTestId("level-reading").textContent).toBe("B2");
    expect(screen.getByTestId("level-reading").className).toBe("");
    expect(lines[0].textContent).toContain("confiance élevée");
    expect(lines[1].textContent).toContain("confiance faible");
    expect(lines[2].textContent).toContain("confiance moyenne");
  });

  it("gives no average and no overall level", () => {
    setup();
    expect(screen.queryByText(/niveau global|niveau moyen|moyenne de|au total/i)).toBeNull();
    // Exactly one CEFR badge per skill, no fifth one.
    expect(document.querySelectorAll("[data-testid^='level-']")).toHaveLength(4);
  });

  it("marks the speaking line as declared", () => {
    setup();
    const speaking = skillLines()[3];
    expect(within(speaking).getByText("Déclaré")).toBeTruthy();
    expect(within(speaking).getByText(SKILL_DESCRIPTIONS.speaking.A2)).toBeTruthy();
    expect(speaking.textContent).toContain("non vérifié");
  });

  it("says a skill that was not assessed is not assessed", () => {
    setup({ results: { ...RESULTS, listening: null, speaking: null } });
    const lines = skillLines();
    expect(within(lines[1]).getByText("Non évaluée")).toBeTruthy();
    expect(within(lines[3]).getByText("Non évaluée")).toBeTruthy();
    expect(within(lines[3]).queryByText("Déclaré")).toBeNull();
    expect(screen.queryByTestId("level-listening")).toBeNull();
  });

  it("warns that the result is indicative, with 3 questions per test", () => {
    setup();
    expect(screen.getByText(/indicatif.*3 questions par épreuve/)).toBeTruthy();
  });

  it("tells that the writing level was updated", () => {
    setup();
    expect(screen.getByText(/niveau d’écriture a été mis à jour/).textContent).toContain("B1");
    cleanup();
    setup({ results: { ...RESULTS, writing: null, review: { ...RESULTS.review, writing: null } } });
    expect(screen.queryByText(/niveau d’écriture a été mis à jour/)).toBeNull();
  });

  it("folds the detail: verdict and comment of each question, scores and comment of the text", async () => {
    const user = setup();
    const details = document.querySelector("details")!;
    expect(details.open).toBe(false);
    await user.click(screen.getByText("Voir le détail des corrections"));
    expect(details.open).toBe(true);
    expect(within(details).getByText("Où habite Marta ?")).toBeTruthy();
    expect(within(details).getByText("Tu as bien situé la ville.")).toBeTruthy();
    expect(within(details).getByText("En partie juste")).toBeTruthy();
    expect(within(details).getByText("Faux")).toBeTruthy();
    expect(within(details).getByText("Des phrases claires, quelques accords à revoir.")).toBeTruthy();
    expect(within(details).getByText("4/5")).toBeTruthy();
  });

  it("shows no script and no reference answer", () => {
    setup();
    const html = document.body.textContent ?? "";
    expect(html).not.toContain(FIXTURE_DOSSIER.listening.script.slice(0, 40));
    for (const q of [...FIXTURE_DOSSIER.reading.questions, ...FIXTURE_DOSSIER.listening.questions]) {
      expect(html).not.toContain(q.referenceAnswer);
    }
  });

  describe("reception level", () => {
    it("proposes to apply it when it differs from the current level, and applies it", async () => {
      const user = setup(); // reception B1, current B2
      expect(screen.getByText("Régler tes contenus sur B1 ? (actuellement B2)")).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "Appliquer" }));
      // The browser sends the assessment only: the level is the server's.
      expect(apply).toHaveBeenCalledWith({ assessmentId: "as-1" });
      expect(await screen.findByText(/tes contenus sont réglés sur B1/)).toBeTruthy();
      expect(refresh).toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "Appliquer" })).toBeNull();
    });

    it("keeps the level without calling the server, and only hides the proposal", async () => {
      const user = setup();
      await user.click(screen.getByRole("button", { name: "Garder mon niveau" }));
      expect(apply).not.toHaveBeenCalled();
      expect(screen.queryByText(/Régler tes contenus/)).toBeNull();
    });

    it("shows a failure and keeps the proposal", async () => {
      apply.mockResolvedValue({ ok: false, error: "Un bilan plus récent existe pour cette langue." });
      const user = setup();
      await user.click(screen.getByRole("button", { name: "Appliquer" }));
      expect((await screen.findByRole("alert")).textContent).toContain("plus récent");
      expect(screen.getByRole("button", { name: "Appliquer" })).toBeTruthy();
    });

    it("proposes nothing when the levels are the same, when it is not the latest, or when nothing was assessed", () => {
      setup({ currentLevel: "B1" });
      expect(screen.queryByText(/Régler tes contenus/)).toBeNull();
      cleanup();
      setup({ latest: false });
      expect(screen.queryByText(/Régler tes contenus/)).toBeNull();
      cleanup();
      setup({ results: { ...RESULTS, reading: null, listening: null } });
      expect(screen.queryByText(/Régler tes contenus/)).toBeNull();
    });
  });

  describe("next steps", () => {
    it("offers to redo the assessment, which starts a new one", async () => {
      const user = setup();
      await user.click(screen.getByRole("button", { name: /Refaire mon bilan/ }));
      expect(start).toHaveBeenCalledWith({ language: "it", higher: false });
      await waitFor(() => expect(refresh).toHaveBeenCalled());
    });

    it("offers a dossier of the level above, as optional, when the server found one", async () => {
      const user = setup({ higherLevel: "C1" });
      expect(screen.getByText(/Facultatif/)).toBeTruthy();
      await user.click(screen.getByRole("button", { name: /Essayer un dossier de niveau C1/ }));
      expect(start).toHaveBeenCalledWith({ language: "it", higher: true });
    });

    it("offers neither when no dossier is visible", () => {
      setup({ canRedo: false, higherLevel: null });
      expect(screen.queryByRole("button", { name: /Refaire/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /Essayer/ })).toBeNull();
    });

    it("shows the failure of the start", async () => {
      start.mockResolvedValue({ ok: false, error: "Le bilan n’est pas encore disponible à ce niveau." });
      const user = setup();
      await user.click(screen.getByRole("button", { name: /Refaire mon bilan/ }));
      expect((await screen.findByRole("alert")).textContent).toContain("pas encore disponible");
      expect(refresh).not.toHaveBeenCalled();
    });
  });
});
