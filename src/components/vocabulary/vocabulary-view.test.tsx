// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMockVocabulary } from "@/lib/data/mock/vocabulary";
import { VocabularyView } from "./vocabulary-view";

const actions = vi.hoisted(() => ({
  addWord: vi.fn(),
  reviewWord: vi.fn(),
  setWordStatus: vi.fn(),
  deleteWord: vi.fn(),
}));
vi.mock("@/app/actions/vocabulary", () => actions);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const TODAY = "2026-10-13";

function setup(persist = false) {
  const user = userEvent.setup();
  render(
    <VocabularyView initialItems={buildMockVocabulary(TODAY)} languages={["ru", "it"]} today={TODAY} persist={persist} />,
  );
  return user;
}

describe("VocabularyView", () => {
  it("runs a review session through all due words", async () => {
    const user = setup();
    expect(screen.getByText("1 / 4")).toBeTruthy();
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole("button", { name: "Afficher la réponse" }));
      await user.click(screen.getByRole("button", { name: /^Bien/ }));
    }
    expect(screen.getByText("Terminé : 4 mots revus")).toBeTruthy();
  });

  it("shows the next interval on each grade button", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Afficher la réponse" }));
    // First due word is in box 2 (interval 4); "again" → tomorrow, "good" → box 3 = 8 days.
    expect(screen.getByRole("button", { name: /À revoir.*demain/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Bien.*dans 8 j/ })).toBeTruthy();
  });

  it("validates and adds a new word", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Ajouter" }));
    await user.click(screen.getAllByRole("button", { name: "Ajouter" }).at(-1)!);
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([
      "Le mot est obligatoire",
      "La traduction est obligatoire",
    ]);

    await user.type(screen.getByLabelText("Mot ou expression"), "вдобавок");
    await user.type(screen.getByLabelText("Traduction"), "en plus");
    await user.click(screen.getAllByRole("button", { name: "Ajouter" }).at(-1)!);
    expect(screen.getByText("вдобавок")).toBeTruthy();
    expect(screen.queryByLabelText("Mot ou expression")).toBeNull();
  });

  it("filters by language and status", async () => {
    const user = setup();
    // The flashcard above also shows words, so look inside the word list only.
    const list = () => within(screen.getByRole("list"));
    expect(list().getByText("впро́чем")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Italien" }));
    expect(list().queryByText("впро́чем")).toBeNull();
    expect(list().getByText("darsi da fare")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Connus" }));
    expect(list().getByText("in bocca al lupo")).toBeTruthy();
    expect(list().queryByText("darsi da fare")).toBeNull();
  });

  describe("with persistence", () => {
    it("saves each review with the review count the user saw", async () => {
      actions.reviewWord.mockImplementation(async ({ id }) => ({ ok: false, error: `x${id}` }));
      const user = setup(true);
      await user.click(screen.getByRole("button", { name: "Afficher la réponse" }));
      await user.click(screen.getByRole("button", { name: /^Bien/ }));
      expect(actions.reviewWord).toHaveBeenCalledWith(
        expect.objectContaining({ grade: "good", expectedReviewCount: expect.any(Number) }),
      );
    });

    it("reports a review the server refused", async () => {
      actions.reviewWord.mockResolvedValue({ ok: false, error: "déjà révisé" });
      const user = setup(true);
      await user.click(screen.getByRole("button", { name: "Afficher la réponse" }));
      await user.click(screen.getByRole("button", { name: /^Bien/ }));
      expect((await screen.findByRole("alert")).textContent).toMatch(/déjà révisé/);
    });

    it("keeps the form open with the server message when a word already exists", async () => {
      actions.addWord.mockResolvedValue({ ok: false, error: "Ce mot est déjà dans ta liste." });
      const user = setup(true);
      await user.click(screen.getByRole("button", { name: "Ajouter" }));
      await user.type(screen.getByLabelText("Mot ou expression"), "впрочем");
      await user.type(screen.getByLabelText("Traduction"), "cependant");
      await user.click(screen.getAllByRole("button", { name: "Ajouter" }).at(-1)!);
      expect(await screen.findByText("Ce mot est déjà dans ta liste.")).toBeTruthy();
      expect(screen.getByLabelText("Mot ou expression")).toBeTruthy();
    });

    it("rolls back 'known' when saving fails", async () => {
      actions.setWordStatus.mockResolvedValue({ ok: false, error: "Ce mot n’existe plus." });
      const user = setup(true);
      const first = within(screen.getByRole("list")).getAllByRole("button", { name: "Marquer connu" })[0];
      await user.click(first);
      expect(await screen.findByText("Ce mot n’existe plus.")).toBeTruthy();
      expect(within(screen.getByRole("list")).getAllByRole("button", { name: "Marquer connu" })).toHaveLength(
        within(screen.getByRole("list")).getAllByRole("listitem").length,
      );
    });

    it("deletes a word after confirmation", async () => {
      actions.deleteWord.mockResolvedValue({ ok: true, data: undefined });
      const user = setup(true);
      const list = within(screen.getByRole("list"));
      const before = list.getAllByRole("listitem").length;
      await user.click(list.getAllByRole("button", { name: /^Supprimer/ })[0]);
      await user.click(screen.getByRole("button", { name: "Confirmer la suppression" }));
      expect(actions.deleteWord).toHaveBeenCalledTimes(1);
      expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(before - 1);
    });
  });
});
