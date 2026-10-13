// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { buildMockVocabulary } from "@/lib/data/mock/vocabulary";
import { VocabularyView } from "./vocabulary-view";

afterEach(cleanup);

const TODAY = "2026-10-13";

function setup() {
  const user = userEvent.setup();
  render(<VocabularyView initialItems={buildMockVocabulary(TODAY)} languages={["ru", "it"]} today={TODAY} />);
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
    expect(list().getByText("впрочем")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Italien" }));
    expect(list().queryByText("впрочем")).toBeNull();
    expect(list().getByText("darsi da fare")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Connus" }));
    expect(list().getByText("in bocca al lupo")).toBeTruthy();
    expect(list().queryByText("darsi da fare")).toBeNull();
  });
});
