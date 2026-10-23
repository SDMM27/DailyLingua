// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMockCorrectionCards, buildMockProductions } from "@/lib/data/mock/productions";
import { FIXTURE_POINT } from "@/test/grammar-fixtures";
import { ProductionsView } from "./productions-view";

const actions = vi.hoisted(() => ({
  addCorrectionCard: vi.fn(),
  reviewCorrection: vi.fn(),
  deleteCorrectionCard: vi.fn(),
}));
vi.mock("@/app/actions/correction-cards", () => actions);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const TODAY = "2026-10-20";

function setup(props: Partial<Parameters<typeof ProductionsView>[0]> = {}) {
  const user = userEvent.setup();
  render(
    <ProductionsView
      entries={buildMockProductions(TODAY)}
      cards={buildMockCorrectionCards(TODAY)}
      userLanguages={["ru", "it"]}
      today={TODAY}
      persist={false}
      {...props}
    />,
  );
  return user;
}

describe("ProductionsView", () => {
  it("says so when nothing was written", () => {
    setup({ entries: [], cards: [] });
    expect(screen.getByText("Aucune production écrite pour l’instant.")).toBeTruthy();
    expect(screen.queryByText("Évolution")).toBeNull();
    expect(screen.queryByText("Mes erreurs à revoir")).toBeNull();
  });

  it("shows a production with its corrections, their category and the native version", () => {
    setup();
    const link = screen.getByRole("link", { name: /Как читать Платонова/ });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getAllByText("он использует").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mots outils").length).toBeGreaterThan(0);
    const native = screen.getAllByText("Ce qu’un natif écrirait")[0].nextElementSibling!;
    expect(native.getAttribute("lang")).toBe("ru");
    expect(native.textContent).toContain("необычным языком");
  });

  it("shows the evolution of the last 30 days against the 30 before", () => {
    setup();
    const section = within(screen.getByRole("region", { name: "Évolution" }));
    expect(section.getByText("Russe")).toBeTruthy();
    expect(section.getByText("Italien")).toBeTruthy();
    // Grammar mean of the one recent Russian review.
    expect(section.getAllByText("3,0").length).toBeGreaterThan(0);
  });

  it("links the grammar points suggested by the errors under that language's categories", () => {
    const point = { ...FIXTURE_POINT, id: "ru-a1-present-first", title: "Le présent, 1re conjugaison" };
    setup({ grammarSuggestions: { ru: [{ point, reasons: [{ category: "verb", count: 4 }] }] } });
    const section = within(screen.getByRole("region", { name: "Évolution" }));
    expect(section.getAllByText("À travailler en grammaire")).toHaveLength(1);
    const link = section.getByRole("link", { name: "Le présent, 1re conjugaison" });
    expect(link.getAttribute("href")).toBe("/grammaire/ru/ru-a1-present-first");
  });

  it("shows no grammar line without suggestions", () => {
    setup({ grammarSuggestions: { ru: [] } });
    expect(screen.queryByText("À travailler en grammaire")).toBeNull();
  });

  it("hides the evolution without any review", () => {
    setup({ entries: buildMockProductions(TODAY).map((e) => ({ ...e, feedback: undefined })) });
    expect(screen.queryByRole("region", { name: "Évolution" })).toBeNull();
  });

  it("filters by language and links the chips", () => {
    setup({ selected: "it" });
    expect(screen.queryByRole("link", { name: /Как читать Платонова/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Il lavoro da remoto/ })).toBeTruthy();
    const nav = within(screen.getByRole("navigation", { name: "Filtrer par langue" }));
    expect(nav.getByRole("link", { name: "Toutes" }).getAttribute("href")).toBe("/productions");
    const italian = nav.getByRole("link", { name: "Italien" });
    expect(italian.getAttribute("href")).toBe("/productions?langue=it");
    expect(italian.getAttribute("aria-current")).toBe("page");
    // Only the cards of that language are offered: the Italian one is not due yet.
    expect(screen.getByText("Aucune erreur à revoir aujourd’hui.")).toBeTruthy();
  });

  it("only offers the languages that have productions", () => {
    setup({ userLanguages: ["ru", "it", "es"] });
    const nav = within(screen.getByRole("navigation", { name: "Filtrer par langue" }));
    expect(nav.queryByRole("link", { name: "Espagnol" })).toBeNull();
  });

  it("offers « À réviser » only on corrections not yet kept, and when saving is possible", async () => {
    const user = setup({ persist: true });
    actions.addCorrectionCard.mockResolvedValue({ ok: true, data: undefined });
    const buttons = screen.getAllByRole("button", { name: "À réviser" });
    expect(buttons).toHaveLength(5); // the second correction of the first Russian text and the three of the other
    await user.click(buttons[0]);
    expect(actions.addCorrectionCard).toHaveBeenCalledWith({ sessionId: "mock-session-1", correctionIndex: 1 });
    expect(screen.getAllByRole("button", { name: "À réviser" })).toHaveLength(4);
  });

  it("shows no « À réviser » in the demo", () => {
    setup({ persist: false });
    expect(screen.queryByRole("button", { name: "À réviser" })).toBeNull();
  });
});

describe("error review session", () => {
  it("runs the due cards: reveal the correction, grade, finish", async () => {
    const user = setup({ persist: false });
    const section = within(screen.getByRole("region", { name: "Mes erreurs à revoir" }));
    expect(section.getByText("1 / 2")).toBeTruthy();
    expect(section.getByText("Passage à corriger")).toBeTruthy();

    // A first card: write an own version, then reveal.
    const textarea = section.getByLabelText(/Ta version/);
    expect(textarea.className).toContain("text-base"); // 16px, no zoom on iOS
    await user.type(textarea, "он использует");
    await user.click(section.getByRole("button", { name: "Voir la correction" }));
    expect(section.getByText("Correction")).toBeTruthy();
    expect(section.getByText("Ta version")).toBeTruthy();
    expect(section.getByRole("button", { name: /À revoir.*demain/ })).toBeTruthy();
    await user.click(section.getByRole("button", { name: /^Bien/ }));

    expect(section.getByText("2 / 2")).toBeTruthy();
    await user.click(section.getByRole("button", { name: "Voir la correction" }));
    await user.click(section.getByRole("button", { name: /^Facile/ }));
    expect(section.getByText("Terminé : 2 erreurs revues")).toBeTruthy();
  });

  it("saves each grade and rolls back a refused one", async () => {
    const user = setup({ persist: true });
    actions.reviewCorrection.mockResolvedValue({ ok: false, error: "Cette erreur a déjà été révisée ailleurs." });
    await user.click(screen.getByRole("button", { name: "Voir la correction" }));
    await user.click(screen.getByRole("button", { name: /^Bien/ }));
    expect(actions.reviewCorrection).toHaveBeenCalledWith({ id: "c1", grade: "good", expectedReviewCount: 0 });
    expect((await screen.findByRole("alert")).textContent).toContain("déjà été révisée");
  });
});
