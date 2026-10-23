// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMockVocabulary, buildMockVocabularyLists } from "@/lib/data/mock/vocabulary";
import type { VocabularyItem, VocabularyList } from "@/lib/schemas/vocabulary";
import { VocabularyView } from "./vocabulary-view";

const actions = vi.hoisted(() => ({
  addWord: vi.fn(),
  reviewWord: vi.fn(),
  setWordStatus: vi.fn(),
  deleteWord: vi.fn(),
  createList: vi.fn(),
  updateList: vi.fn(),
  deleteList: vi.fn(),
  importWords: vi.fn(),
  translateWords: vi.fn(),
}));
vi.mock("@/app/actions/vocabulary", () => actions);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const TODAY = "2026-10-13";

interface SetupOptions {
  persist?: boolean;
  items?: VocabularyItem[];
  lists?: VocabularyList[];
  canTranslate?: boolean;
  isGuest?: boolean;
}

function setup({
  persist = false,
  items = buildMockVocabulary(TODAY),
  lists = buildMockVocabularyLists(),
  canTranslate = false,
  isGuest = false,
}: SetupOptions = {}) {
  const user = userEvent.setup();
  render(
    <VocabularyView
      initialItems={items}
      initialLists={lists}
      languages={["ru", "it"]}
      today={TODAY}
      persist={persist}
      canTranslate={canTranslate}
      isGuest={isGuest}
    />,
  );
  return user;
}

/** The words of the list "Mes mots" (the flashcard above also shows words). */
const wordList = () => within(screen.getByRole("list", { name: "Mes mots" }));

/** The default session mixes modes by box; these tests are about the flashcards. */
const useFlashcards = (user: ReturnType<typeof userEvent.setup>) =>
  user.selectOptions(screen.getByLabelText("Mode"), "flip");

describe("VocabularyView", () => {
  it("runs a review session through all due words", async () => {
    const user = setup();
    await useFlashcards(user);
    expect(screen.getByText("1 / 4")).toBeTruthy();
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole("button", { name: "Afficher la réponse" }));
      await user.click(screen.getByRole("button", { name: /^Bien/ }));
    }
    expect(screen.getByText("Terminé : 4 mots revus")).toBeTruthy();
  });

  it("shows the next interval on each grade button", async () => {
    const user = setup();
    await useFlashcards(user);
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
    expect(wordList().getByText("впро́чем")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Italien" }));
    expect(wordList().queryByText("впро́чем")).toBeNull();
    expect(wordList().getByText("darsi da fare")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Connus" }));
    expect(wordList().getByText("in bocca al lupo")).toBeTruthy();
    expect(wordList().queryByText("darsi da fare")).toBeNull();
  });

  describe("lists", () => {
    it("filters the words by list and marks them with their list", async () => {
      const user = setup();
      const filter = within(screen.getByRole("group", { name: "Liste" }));

      await user.click(filter.getByRole("button", { name: "Expressions du cours" }));
      expect(wordList().getAllByRole("listitem")).toHaveLength(2);
      expect(wordList().getByText("mettercela tutta")).toBeTruthy();
      expect(wordList().getAllByText("Liste : Expressions du cours")).toHaveLength(2);
      expect(wordList().queryByText("впро́чем")).toBeNull();

      await user.click(filter.getByRole("button", { name: "Sans liste" }));
      expect(wordList().queryByText("mettercela tutta")).toBeNull();
      expect(wordList().getByText("впро́чем")).toBeTruthy();
      expect(wordList().queryByText(/^Liste :/)).toBeNull();
    });

    it("takes the words of a paused list out of the review and the due count", async () => {
      const dueInList: VocabularyItem[] = ["a", "b"].map((id) => ({
        id: `due-${id}`,
        language: "it",
        term: `parola ${id}`,
        translation: id,
        status: "learning",
        review: { box: 0, dueOn: TODAY, lastReviewedOn: null, reviewCount: 0 },
        addedOn: TODAY,
        listId: "l1",
      }));
      const user = setup({ items: [...buildMockVocabulary(TODAY), ...dueInList] });
      expect(screen.getByText("1 / 6")).toBeTruthy();
      expect(screen.getByText("2 à revoir")).toBeTruthy();

      await user.click(screen.getByRole("button", { name: "Mettre en pause « Expressions du cours »" }));
      expect(screen.getByText("1 / 4")).toBeTruthy();
      expect(screen.getByText("En pause")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Réviser « Expressions du cours »" }).hasAttribute("disabled")).toBe(true);
      // The words stay visible.
      expect(wordList().getByText("parola a")).toBeTruthy();

      await user.click(screen.getByRole("button", { name: "Réactiver « Expressions du cours »" }));
      expect(screen.getByText("1 / 6")).toBeTruthy();
    });

    it("reviews only the due words of one list", async () => {
      const due: VocabularyItem = {
        id: "due-a",
        language: "it",
        term: "parola a",
        translation: "a",
        status: "learning",
        review: { box: 0, dueOn: TODAY, lastReviewedOn: null, reviewCount: 0 },
        addedOn: TODAY,
        listId: "l1",
      };
      const user = setup({ items: [...buildMockVocabulary(TODAY), due] });
      await user.click(screen.getByRole("button", { name: "Réviser « Expressions du cours »" }));
      expect(screen.getByText("1 / 1")).toBeTruthy();
      expect(screen.getAllByText("parola a").length).toBeGreaterThan(1); // the flashcard and the list
      expect(screen.getAllByText("Liste : Expressions du cours").length).toBeGreaterThan(1);

      await user.click(screen.getByRole("button", { name: "Réviser tous les mots du jour" }));
      expect(screen.getByText("1 / 5")).toBeTruthy();
    });

    it("creates a list and refuses a name that is taken", async () => {
      actions.createList.mockResolvedValueOnce({ ok: false, error: "Tu as déjà une liste de ce nom." });
      const user = setup({ persist: true });
      await user.click(screen.getByRole("button", { name: "Nouvelle liste" }));
      await user.type(screen.getByLabelText("Nom de la liste"), "Livre");
      await user.click(screen.getByRole("button", { name: "Créer la liste" }));
      expect(await screen.findByText("Tu as déjà une liste de ce nom.")).toBeTruthy();
      expect(actions.createList).toHaveBeenCalledWith({ language: "ru", name: "Livre" });

      actions.createList.mockResolvedValueOnce({ ok: true, data: { id: "l2", language: "ru", name: "Livre", active: true } });
      await user.click(screen.getByRole("button", { name: "Créer la liste" }));
      expect(await within(screen.getByRole("list", { name: "Mes listes" })).findByText("Livre")).toBeTruthy();
      expect(screen.queryByLabelText("Nom de la liste")).toBeNull();
    });

    it("deletes a list and its words after a confirmation that states how many", async () => {
      actions.deleteList.mockResolvedValue({ ok: true, data: undefined });
      const user = setup({ persist: true });
      await user.click(screen.getByRole("button", { name: "Supprimer la liste « Expressions du cours »" }));
      expect(screen.getByText("Supprimer « Expressions du cours » et ses 2 mots ?")).toBeTruthy();
      expect(actions.deleteList).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Confirmer la suppression de la liste" }));
      expect(actions.deleteList).toHaveBeenCalledWith({ id: "l1" });
      expect(screen.queryByText("Expressions du cours")).toBeNull();
      expect(screen.queryByText("mettercela tutta")).toBeNull();
    });

    it("offers the lists of the chosen language when adding a word", async () => {
      const user = setup();
      await user.click(screen.getByRole("button", { name: "Ajouter" }));
      expect(screen.queryByLabelText("Liste (facultatif)")).toBeNull(); // Russian: no list
      await user.click(within(screen.getByRole("radiogroup", { name: "Langue" })).getByText("Italien"));
      const select = screen.getByLabelText("Liste (facultatif)");
      expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual([
        "Aucune liste",
        "Expressions du cours",
      ]);
    });
  });

  describe("import", () => {
    async function paste(user: ReturnType<typeof userEvent.setup>, text: string) {
      await user.click(screen.getByRole("button", { name: "Importer" }));
      await user.click(screen.getByLabelText("Mots à importer"));
      await user.paste(text);
      await user.click(screen.getByRole("button", { name: "Analyser" }));
    }

    it("asks for something to analyse", async () => {
      const user = setup();
      await user.click(screen.getByRole("button", { name: "Importer" }));
      await user.click(screen.getByRole("button", { name: "Analyser" }));
      expect((await screen.findByRole("alert")).textContent).toBe("Colle au moins un mot.");
    });

    it("previews the paste with the lines it could not read", async () => {
      const user = setup();
      await paste(user, "# mon cours\nпривет ; salut\n ; sans mot\nпока ; au revoir ; Пока!\nПРИВЕТ ; encore\n");

      const errors = within(screen.getByRole("list", { name: "Lignes ignorées" }));
      expect(errors.getByText("Ligne 3 : le mot est vide")).toBeTruthy();
      expect(errors.getByText("Ligne 5 : doublon de la ligne 2")).toBeTruthy();

      const rows = within(screen.getByRole("list", { name: "Mots à importer" }));
      expect(rows.getAllByRole("listitem")).toHaveLength(2);
      expect((screen.getByLabelText("Traduction de привет") as HTMLInputElement).value).toBe("salut");
      expect((screen.getByLabelText("Exemple de пока") as HTMLInputElement).value).toBe("Пока!");
    });

    it("cannot save a kept word without translation, and saves in memory in the demo", async () => {
      const user = setup();
      await paste(user, "привет ; salut\nпока\nдо свидания");

      const save = () => screen.getByRole("button", { name: /^Enregistrer/ }) as HTMLButtonElement;
      expect(save().textContent).toBe("Enregistrer 3 mots");
      expect(save().disabled).toBe(true);
      expect(screen.getByText("Il manque la traduction de 2 mots : complète-la ou décoche le mot.")).toBeTruthy();

      await user.type(screen.getByLabelText("Traduction de пока"), "au revoir");
      expect(save().disabled).toBe(true);
      await user.click(screen.getByRole("checkbox", { name: /до свидания/ })); // leave it out
      expect(save().textContent).toBe("Enregistrer 2 mots");
      expect(save().disabled).toBe(false);

      await user.click(save());
      expect((await screen.findByRole("status")).textContent).toBe("2 mots ajoutés, 0 déjà présent");
      expect(actions.importWords).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Fermer" }));
      expect(wordList().getByText("привет")).toBeTruthy();
      expect(wordList().getByText("пока")).toBeTruthy();
      expect(wordList().queryByText("до свидания")).toBeNull();
    });

    it("leaves out the words the user already has", async () => {
      const user = setup();
      await paste(user, "ВПРО́ЧЕМ ; cependant\nпривет ; salut");

      const rows = within(screen.getByRole("list", { name: "Mots à importer" }));
      expect(rows.getByText("déjà dans tes mots")).toBeTruthy();
      expect((rows.getByRole("checkbox", { name: /ВПРО́ЧЕМ/ }) as HTMLInputElement).checked).toBe(false);
      expect(screen.queryByLabelText("Traduction de ВПРО́ЧЕМ")).toBeNull();

      await user.click(screen.getByRole("button", { name: "Enregistrer 1 mot" }));
      expect((await screen.findByRole("status")).textContent).toBe("1 mot ajouté, 1 déjà présent");
    });

    it("sends the words to a new list through the server and reports what it skipped", async () => {
      actions.importWords.mockResolvedValue({
        ok: true,
        data: {
          added: [],
          skipped: ["привет"],
          list: { id: "l9", language: "ru", name: "Cours", active: true },
        },
      });
      const user = setup({ persist: true });
      await user.click(screen.getByRole("button", { name: "Importer" }));
      await user.selectOptions(screen.getByRole("combobox", { name: "Liste" }), "Nouvelle liste…");
      await user.type(screen.getByLabelText("Nom de la nouvelle liste"), "Cours");
      await user.click(screen.getByLabelText("Mots à importer"));
      await user.paste("привет ; salut");
      await user.click(screen.getByRole("button", { name: "Analyser" }));
      await user.click(screen.getByRole("button", { name: "Enregistrer 1 mot" }));

      expect(actions.importWords).toHaveBeenCalledWith({
        language: "ru",
        newListName: "Cours",
        entries: [{ term: "привет", translation: "salut", example: undefined }],
      });
      expect((await screen.findByRole("status")).textContent).toBe("0 mot ajouté, 1 déjà présent · liste « Cours »");
      await user.click(screen.getByRole("button", { name: "Fermer" }));
      expect(within(screen.getByRole("list", { name: "Mes listes" })).getByText("Cours")).toBeTruthy(); // the new list shows up
    });

    it("refuses a new list name the user already has, before analysing", async () => {
      const user = setup();
      await user.click(screen.getByRole("button", { name: "Importer" }));
      await user.selectOptions(screen.getByRole("combobox", { name: "Liste" }), "Nouvelle liste…");
      await user.type(screen.getByLabelText("Nom de la nouvelle liste"), "Expressions du cours");
      await user.click(screen.getByLabelText("Mots à importer"));
      await user.paste("привет");
      await user.click(screen.getByRole("button", { name: "Analyser" }));
      expect((await screen.findByRole("alert")).textContent).toBe("Tu as déjà une liste de ce nom.");
    });

    describe("automatic translation", () => {
      it("is hidden when it is off", async () => {
        const user = setup({ persist: true, canTranslate: false });
        await paste(user, "привет");
        expect(screen.queryByRole("button", { name: /Traduire automatiquement/ })).toBeNull();
      });

      it("sends guests to create an account", async () => {
        const user = setup({ persist: true, canTranslate: true, isGuest: true });
        await paste(user, "привет");
        expect(screen.queryByRole("button", { name: /Traduire automatiquement/ })).toBeNull();
        const link = screen.getByRole("link", { name: "Crée ton compte" });
        expect(link.getAttribute("href")).toBe("/creer-mon-compte");
      });

      it("fills the missing translations, marked to be checked until edited", async () => {
        actions.translateWords.mockResolvedValue({
          ok: true,
          data: {
            status: "ready",
            translations: [
              { term: "привет", translation: "salut", uncertain: false },
              { term: "пака", translation: "au revoir", uncertain: true },
            ],
          },
        });
        const user = setup({ persist: true, canTranslate: true });
        await paste(user, "привет\nпака\nспасибо ; merci\nтуман");

        await user.click(screen.getByRole("button", { name: "Traduire automatiquement (3)" }));
        expect(actions.translateWords).toHaveBeenCalledWith({ language: "ru", terms: ["привет", "пака", "туман"] });

        expect((screen.getByLabelText("Traduction de привет") as HTMLInputElement).value).toBe("salut");
        expect(screen.getByText("à vérifier")).toBeTruthy();
        expect(screen.getByText("à vérifier · incertain")).toBeTruthy();
        expect(screen.getByText("1 mot sans suggestion : tape la traduction toi-même.")).toBeTruthy();
        // The user typed it: not marked, and not overwritten by the model.
        expect((screen.getByLabelText("Traduction de спасибо") as HTMLInputElement).value).toBe("merci");

        await user.type(screen.getByLabelText("Traduction de привет"), "!");
        expect(screen.queryByText("à vérifier")).toBeNull();
        expect(screen.getByText("à vérifier · incertain")).toBeTruthy();
      });

      it("explains when the day's quota is used up or the model is unavailable", async () => {
        const user = setup({ persist: true, canTranslate: true });
        await paste(user, "привет");

        actions.translateWords.mockResolvedValueOnce({ ok: true, data: { status: "limit" } });
        await user.click(screen.getByRole("button", { name: "Traduire automatiquement (1)" }));
        expect((await screen.findByRole("status")).textContent).toMatch(/limite de 200 traductions/);

        actions.translateWords.mockResolvedValueOnce({ ok: true, data: { status: "unavailable" } });
        await user.click(screen.getByRole("button", { name: "Traduire automatiquement (1)" }));
        expect((await screen.findByRole("status")).textContent).toMatch(/indisponible/);
        expect((screen.getByLabelText("Traduction de привет") as HTMLInputElement).value).toBe("");
      });
    });
  });

  describe("review modes", () => {
    const chooseMode = (user: ReturnType<typeof userEvent.setup>, mode: string) =>
      user.selectOptions(screen.getByLabelText("Mode"), mode);

    it("offers a mixed session and each mode", () => {
      setup();
      const select = screen.getByLabelText("Mode") as HTMLSelectElement;
      expect([...select.options].map((o) => o.textContent)).toEqual([
        "Mélangé",
        "Cartes",
        "Traduire",
        "Écrire le mot",
        "Écouter",
        "Phrase à trou",
      ]);
      expect(select.value).toBe("mixed");
    });

    it("grades a right typed translation as good and sends the mode", async () => {
      actions.reviewWord.mockResolvedValue({ ok: false, error: "x" });
      const user = setup({ persist: true });
      await chooseMode(user, "translate");
      await user.type(screen.getByLabelText("Traduction en français"), "Du reste{Enter}");
      expect(screen.getByText("Juste.")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Trop facile" })).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "Continuer" }));
      expect(actions.reviewWord).toHaveBeenCalledWith(
        expect.objectContaining({ id: "v1", grade: "good", mode: "translate" }),
      );
    });

    it("lets the learner overrule a wrong answer", async () => {
      actions.reviewWord.mockResolvedValue({ ok: false, error: "x" });
      const user = setup({ persist: true });
      await chooseMode(user, "translate");
      await user.type(screen.getByLabelText("Traduction en français"), "maison");
      await user.click(screen.getByRole("button", { name: "Vérifier" }));
      expect(screen.getByText("Ce n’est pas ça.")).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "J’avais bon" }));
      expect(actions.reviewWord).toHaveBeenCalledWith(
        expect.objectContaining({ id: "v1", grade: "good", mode: "translate" }),
      );
    });

    it("grades a wrong answer as again when the learner continues", async () => {
      actions.reviewWord.mockResolvedValue({ ok: false, error: "x" });
      const user = setup({ persist: true });
      await chooseMode(user, "produce");
      await user.type(screen.getByLabelText("Ta réponse"), "autre");
      await user.click(screen.getByRole("button", { name: "Vérifier" }));
      await user.click(screen.getByRole("button", { name: "Continuer" }));
      expect(actions.reviewWord).toHaveBeenCalledWith(
        expect.objectContaining({ id: "v1", grade: "again", mode: "produce" }),
      );
    });

    it("shows the sentence with a blank for the cloze mode", async () => {
      const user = setup();
      await chooseMode(user, "cloze");
      expect(screen.getByText(/＿＿＿, это уже совсем другая история\./)).toBeTruthy();
      expect(screen.getByText(/Indice : d.ailleurs/)).toBeTruthy();
    });

    it("falls back to translating when the device cannot read the word", async () => {
      const user = setup();
      await chooseMode(user, "listen");
      expect(screen.getByLabelText("Traduction en français")).toBeTruthy();
    });
  });

  describe("with persistence", () => {
    it("saves each review with the review count the user saw", async () => {
      actions.reviewWord.mockImplementation(async ({ id }) => ({ ok: false, error: `x${id}` }));
      const user = setup({ persist: true });
      await useFlashcards(user);
      await user.click(screen.getByRole("button", { name: "Afficher la réponse" }));
      await user.click(screen.getByRole("button", { name: /^Bien/ }));
      expect(actions.reviewWord).toHaveBeenCalledWith(
        expect.objectContaining({ grade: "good", expectedReviewCount: expect.any(Number) }),
      );
    });

    it("reports a review the server refused", async () => {
      actions.reviewWord.mockResolvedValue({ ok: false, error: "déjà révisé" });
      const user = setup({ persist: true });
      await useFlashcards(user);
      await user.click(screen.getByRole("button", { name: "Afficher la réponse" }));
      await user.click(screen.getByRole("button", { name: /^Bien/ }));
      expect((await screen.findByRole("alert")).textContent).toMatch(/déjà révisé/);
    });

    it("keeps the form open with the server message when a word already exists", async () => {
      actions.addWord.mockResolvedValue({ ok: false, error: "Ce mot est déjà dans ta liste." });
      const user = setup({ persist: true });
      await user.click(screen.getByRole("button", { name: "Ajouter" }));
      await user.type(screen.getByLabelText("Mot ou expression"), "впрочем");
      await user.type(screen.getByLabelText("Traduction"), "cependant");
      await user.click(screen.getAllByRole("button", { name: "Ajouter" }).at(-1)!);
      expect(await screen.findByText("Ce mot est déjà dans ta liste.")).toBeTruthy();
      expect(screen.getByLabelText("Mot ou expression")).toBeTruthy();
    });

    it("rolls back 'known' when saving fails", async () => {
      actions.setWordStatus.mockResolvedValue({ ok: false, error: "Ce mot n’existe plus." });
      const user = setup({ persist: true });
      const first = wordList().getAllByRole("button", { name: "Marquer connu" })[0];
      await user.click(first);
      expect(await screen.findByText("Ce mot n’existe plus.")).toBeTruthy();
      expect(wordList().getAllByRole("button", { name: "Marquer connu" })).toHaveLength(
        wordList().getAllByRole("listitem").length,
      );
    });

    it("rolls back a pause the server refused", async () => {
      actions.updateList.mockResolvedValue({ ok: false, error: "Cette liste n’existe plus." });
      const user = setup({ persist: true });
      await user.click(screen.getByRole("button", { name: "Mettre en pause « Expressions du cours »" }));
      expect(actions.updateList).toHaveBeenCalledWith({ id: "l1", active: false });
      expect(await screen.findByText("Cette liste n’existe plus.")).toBeTruthy();
      expect(screen.queryByText("En pause")).toBeNull();
    });

    it("deletes a word after confirmation", async () => {
      actions.deleteWord.mockResolvedValue({ ok: true, data: undefined });
      const user = setup({ persist: true });
      const before = wordList().getAllByRole("listitem").length;
      await user.click(wordList().getAllByRole("button", { name: /^Supprimer/ })[0]);
      await user.click(screen.getByRole("button", { name: "Confirmer la suppression" }));
      expect(actions.deleteWord).toHaveBeenCalledTimes(1);
      expect(wordList().getAllByRole("listitem")).toHaveLength(before - 1);
    });
  });
});
