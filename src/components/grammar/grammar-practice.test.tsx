// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GrammarCard } from "@/lib/schemas/grammar";
import { FIXTURE_POINT } from "@/test/grammar-fixtures";
import { GrammarPractice } from "./grammar-practice";

const actions = vi.hoisted(() => ({
  recordGrammarPractice: vi.fn(),
  deleteGrammarCard: vi.fn(),
}));
vi.mock("@/app/actions/grammar", () => actions);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const TODAY = "2026-10-21";

const CARD: GrammarCard = {
  id: "g1",
  pointId: FIXTURE_POINT.id,
  language: "it",
  status: "learning",
  review: { box: 1, dueOn: TODAY, lastReviewedOn: "2026-10-19", reviewCount: 2 },
  addedOn: "2026-10-10",
};

function setup(props: Partial<Parameters<typeof GrammarPractice>[0]> = {}) {
  const user = userEvent.setup();
  render(<GrammarPractice point={FIXTURE_POINT} language="it" today={TODAY} persist {...props} />);
  return user;
}

/** Answers the three fixture exercises; `right` tells which ones get the right answer. */
async function run(user: ReturnType<typeof userEvent.setup>, right: [boolean, boolean, boolean]) {
  const next = async () => user.click(screen.getByRole("button", { name: /Suivant|Voir mon score/ }));
  // 1. choose
  await user.click(screen.getByRole("button", { name: right[0] ? "abitiamo" : "abito" }));
  await user.click(screen.getByRole("button", { name: "Vérifier" }));
  await next();
  // 2. fill
  await user.type(screen.getByRole("textbox"), right[1] ? "Parli." : "parlo");
  await user.click(screen.getByRole("button", { name: "Vérifier" }));
  await next();
  // 3. transform
  await user.type(screen.getByRole("textbox"), right[2] ? "loro parlano" : "parlano loro");
  await user.click(screen.getByRole("button", { name: "Vérifier" }));
  await next();
}

describe("GrammarPractice", () => {
  it("shows right and wrong answers with the correction and the explanation", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "abito" }));
    await user.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(screen.getByText(/Pas tout à fait/)).toBeTruthy();
    expect(screen.getByText("abitiamo", { selector: "span" })).toBeTruthy();
    expect(screen.getByText(/la terminaison est -iamo/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Suivant" }));

    expect(screen.getByText("(parlare)")).toBeTruthy();
    await user.type(screen.getByRole("textbox"), "  PARLI ");
    await user.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(screen.getByText(/Juste/)).toBeTruthy();
  });

  it("keeps the inputs at 16px with no autocorrection", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "abitiamo" }));
    await user.click(screen.getByRole("button", { name: "Vérifier" }));
    await user.click(screen.getByRole("button", { name: "Suivant" }));
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("text-base");
    expect(input.getAttribute("lang")).toBe("it");
    expect(input.getAttribute("autocapitalize")).toBe("off");
    expect(input.getAttribute("autocorrect")).toBe("off");
    expect(input.getAttribute("spellcheck")).toBe("false");
  });

  it("sends the score, creates the card and says when it comes back", async () => {
    actions.recordGrammarPractice.mockResolvedValue({
      ok: true,
      data: {
        outcome: "created",
        card: { ...CARD, review: { box: 1, dueOn: "2026-10-23", lastReviewedOn: TODAY, reviewCount: 1 } },
      },
    });
    const user = setup();
    await run(user, [true, true, true]);
    expect(actions.recordGrammarPractice).toHaveBeenCalledWith({
      pointId: FIXTURE_POINT.id,
      correct: 3,
      total: 3,
      expectedReviewCount: null,
    });
    expect(await screen.findByText(/Fiche ajoutée à tes révisions.*prochaine révision dans 2 j\./)).toBeTruthy();
    expect(screen.getByText("3 / 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retirer de mes révisions" })).toBeTruthy();
  });

  it("sends the review count of the card it knows and reports a review", async () => {
    actions.recordGrammarPractice.mockResolvedValue({
      ok: true,
      data: { outcome: "reviewed", card: { ...CARD, review: { ...CARD.review, dueOn: "2026-10-22", reviewCount: 3 } } },
    });
    const user = setup({ card: CARD });
    await run(user, [true, false, true]);
    expect(actions.recordGrammarPractice).toHaveBeenCalledWith(
      expect.objectContaining({ correct: 2, total: 3, expectedReviewCount: 2 }),
    );
    expect(await screen.findByText("Prochaine révision demain.")).toBeTruthy();
  });

  it("says when the score is too low", async () => {
    actions.recordGrammarPractice.mockResolvedValue({ ok: true, data: { outcome: "not-passed", card: null } });
    const user = setup();
    await run(user, [false, false, true]);
    expect(await screen.findByText(/Il faut au moins 60.%/)).toBeTruthy();
  });

  it("shows the message of the server when the save is refused, and can start again", async () => {
    actions.recordGrammarPractice.mockResolvedValue({
      ok: false,
      error: "Cette fiche a changé entre-temps : recharge la page.",
    });
    const user = setup();
    await run(user, [true, true, true]);
    expect((await screen.findByRole("alert")).textContent).toContain("Cette fiche a changé");
    await user.click(screen.getByRole("button", { name: "Recommencer" }));
    expect(screen.getByRole("button", { name: "Vérifier" })).toBeTruthy();
  });

  it("saves nothing in the demo", async () => {
    const user = setup({ persist: false });
    await run(user, [true, true, true]);
    expect(actions.recordGrammarPractice).not.toHaveBeenCalled();
    expect(screen.getByText(/Mode démonstration.*rien n’est enregistré\./)).toBeTruthy();
  });

  it("removes the card from the reviews", async () => {
    actions.deleteGrammarCard.mockResolvedValue({ ok: true, data: undefined });
    const user = setup({ card: CARD });
    await user.click(screen.getByRole("button", { name: "Retirer de mes révisions" }));
    expect(actions.deleteGrammarCard).toHaveBeenCalledWith({ id: "g1" });
    expect(screen.queryByRole("button", { name: "Retirer de mes révisions" })).toBeNull();
  });
});
