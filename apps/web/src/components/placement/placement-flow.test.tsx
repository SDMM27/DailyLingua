// @vitest-environment jsdom
import { loadMessages } from "@dailylingua/i18n";
import { cefrLevels, type CefrLevel, type PlacementItem } from "@dailylingua/schemas";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlacementFlow } from "./placement-flow";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const messages = await loadMessages("fr");
const USER = "11111111-1111-4111-8111-111111111111";

const SKILLS = ["grammar", "grammar", "grammar", "grammar", "vocabulary", "vocabulary", "vocabulary", "reading", "reading", "reading"] as const;
/** A bank of 60 questions whose prompt carries its id, the right answer rotating over the four options. */
const items: PlacementItem[] = cefrLevels.flatMap((level, l) =>
  SKILLS.map((skill, i) => {
    const id = `it-${level.toLowerCase()}-${i + 1}`;
    return {
      id, level, skill,
      ...(skill === "reading" ? { context: `Testo ${id}` } : {}),
      prompt: skill === "reading" ? `Domanda ${id}` : `Frase ${id} ___`,
      options: ["uno", "due", "tre", "quattro"] as [string, string, string, string],
      answer: (l * 10 + i) % 4,
    };
  }));

function flow(startLevel: CefrLevel = "A2") {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <PlacementFlow userId={USER} language="it" languageName="italien" startLevel={startLevel} items={items} />
    </NextIntlClientProvider>,
  );
}

/** The question on screen, found by the id in its prompt. */
function shown(): PlacementItem {
  const id = /it-[a-c][12]-\d+/.exec(screen.getByRole("heading", { level: 2 }).textContent ?? "")?.[0];
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error("no question on screen");
  return item;
}

/** Answers the questions until the result shows: the right option, or "I don't know" when `right` is false. */
async function takeTest(user: ReturnType<typeof userEvent.setup>, right = true) {
  while (screen.queryByRole("heading", { level: 2 })) {
    if (right) {
      await user.click(screen.getAllByRole("radio")[shown().answer]!);
      await user.click(screen.getByRole("button", { name: /^(Valider|Voir mon résultat)$/ }));
    } else {
      await user.click(screen.getByRole("button", { name: "Je ne sais pas" }));
    }
  }
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("the placement test, entry and questions", () => {
  it("opens on the entry screen with the introduction over it, then on the first question", async () => {
    const user = userEvent.setup();
    flow();
    expect(screen.getByRole("heading", { name: "Où en es-tu en italien ?" })).toBeTruthy();
    const intro = screen.getByRole("dialog", { name: "Test de niveau" });
    expect(within(intro).getByText("30 questions au plus, souvent moins")).toBeTruthy();
    await user.click(within(intro).getByRole("button", { name: "Commencer" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Question 1 · Grammaire")).toBeTruthy();
    expect(screen.getByRole("radiogroup")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Valider" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("leaves for the progress page with Pas maintenant, without a request", async () => {
    const user = userEvent.setup();
    flow();
    await user.click(screen.getByRole("button", { name: "Pas maintenant" }));
    expect(push).toHaveBeenCalledWith("/progress?lang=it");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("enables Valider once an option is picked, with no verdict shown, and moves on to the next question", async () => {
    const user = userEvent.setup();
    flow();
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    const first = shown();
    await user.click(screen.getAllByRole("radio")[first.answer]!);
    expect(screen.getAllByRole("radio")[first.answer]!.getAttribute("aria-checked")).toBe("true");
    expect((screen.getByRole("button", { name: "Valider" }) as HTMLButtonElement).disabled).toBe(false);
    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(screen.getByText(/^Question 2 · /)).toBeTruthy();
    expect(screen.getAllByRole("radio").every((radio) => radio.getAttribute("aria-checked") === "false")).toBe(true);
    expect(screen.queryByText(/juste|faux|correct/i)).toBeNull();
  });

  it("moves and selects with the arrow keys", async () => {
    const user = userEvent.setup();
    flow();
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    const radios = screen.getAllByRole("radio");
    radios[0]!.focus();
    await user.keyboard("{ArrowDown}");
    expect(radios[1]!.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(radios[1]);
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(radios[3]!.getAttribute("aria-checked")).toBe("true");
  });

  it("shows a reading question with its passage, language and one column", async () => {
    const user = userEvent.setup();
    flow();
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    // The third question of a block is the reading one: grammar, vocabulary, reading.
    for (let n = 0; n < 2; n++) {
      await user.click(screen.getAllByRole("radio")[0]!);
      await user.click(screen.getByRole("button", { name: "Valider" }));
    }
    expect(screen.getByText("Question 3 · Lecture")).toBeTruthy();
    const passage = screen.getByText(/^Testo /);
    expect(passage.getAttribute("lang")).toBe("it");
    expect(screen.getByRole("heading", { level: 2 }).getAttribute("lang")).toBe("it");
  });

  it("asks for confirmation to stop, keeps going on Continuer and saves nothing on Arrêter", async () => {
    const user = userEvent.setup();
    flow();
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    await user.click(screen.getByRole("button", { name: "Arrêter le test" }));
    expect(screen.getByRole("dialog", { name: "Arrêter le test ?" })).toBeTruthy();
    expect(screen.getByText("Tes réponses ne seront pas gardées.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Arrêter le test" }));
    await user.click(screen.getByRole("button", { name: "Arrêter" }));
    expect(push).toHaveBeenCalledWith("/progress?lang=it");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps Valider's label until the test ends whatever the answer, so it never tells a right answer", async () => {
    const user = userEvent.setup();
    flow("A2");
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    // Fourth question of the first block: the outcome depends on the answer, whatever was answered before.
    for (let n = 0; n < 4; n++) {
      await user.click(screen.getAllByRole("radio")[shown().answer]!);
      await user.click(screen.getByRole("button", { name: "Valider" }));
    }
    await user.click(screen.getAllByRole("radio")[shown().answer]!);
    expect(screen.getByRole("button", { name: "Valider" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Voir mon résultat" })).toBeNull();
  });
});

describe("the placement test, result", () => {
  it("ends on the last question of the last block with Voir mon résultat, then keeps the estimate and goes to the path", async () => {
    const user = userEvent.setup();
    flow("A2");
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    // All right from A2: blocks A2, B1, B2, C1 and C2, 25 questions. Only the last one ends the test for sure.
    for (let n = 0; n < 24; n++) {
      await user.click(screen.getAllByRole("radio")[shown().answer]!);
      expect(screen.queryByRole("button", { name: "Voir mon résultat" })).toBeNull();
      await user.click(screen.getByRole("button", { name: "Valider" }));
    }
    await user.click(screen.getAllByRole("radio")[shown().answer]!);
    await user.click(screen.getByRole("button", { name: "Voir mon résultat" }));

    expect(screen.getByText("Résultat · italien")).toBeTruthy();
    expect(screen.getByText("Niveau estimé")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Confiance élevée" })).toBeTruthy();
    expect(screen.getByText("Confiance élevée, sur 25 questions.")).toBeTruthy();
    // Reading is measured, the other skills are not.
    expect(screen.getByText("C2 · mesuré")).toBeTruthy();
    expect(screen.getAllByText("Non mesuré")).toHaveLength(3);
    expect(screen.getByText("Ce test mesure la lecture.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Garder C2" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/placement");
    expect(new Headers(init.headers).get("x-dailylingua-user")).toBe(USER);
    const sent = JSON.parse(init.body as string) as { language: string; startLevel: string; chosenLevel: string; answers: { itemId: string; choice: number | null }[] };
    expect(sent).toMatchObject({ language: "it", startLevel: "A2", chosenLevel: "C2" });
    expect(sent.answers).toHaveLength(25);
    expect(push).toHaveBeenCalledWith("/parcours/it");
  });

  it("lets the learner pick another level on the scale: the button and the line follow, the choice is sent", async () => {
    const user = userEvent.setup();
    flow("A2");
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    await takeTest(user, true);
    const scale = screen.getByRole("group", { name: "Choisir un autre niveau" });
    expect(within(scale).getAllByRole("button")).toHaveLength(6);
    expect(within(scale).getByRole("button", { name: "C2" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText(/^Estimation du test/)).toBeNull();

    await user.click(within(scale).getByRole("button", { name: "B1" }));
    expect(within(scale).getByRole("button", { name: "B1" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(scale).getByRole("button", { name: "C2" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Estimation du test : C2")).toBeTruthy();
    expect(screen.getByText("B1 · mesuré")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Choisir B1" }));
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string)).toMatchObject({ chosenLevel: "B1" });
    expect(push).toHaveBeenCalledWith("/parcours/it");
  });

  it("counts Je ne sais pas as an answer: an all-skipped test ends at A1 and sends null choices", async () => {
    const user = userEvent.setup();
    flow("A2");
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    await takeTest(user, false);
    expect(screen.getByText("Garder A1")).toBeTruthy();
    // A2 then A1, five questions each.
    expect(screen.getByText(/sur 10 questions/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Garder A1" }));
    const sent = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as { answers: { choice: number | null }[] };
    expect(sent.answers.every(({ choice }) => choice === null)).toBe(true);
  });

  it("shows an error and stays on the result when the save fails, then retries", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    flow("A2");
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    await takeTest(user, false);
    await user.click(screen.getByRole("button", { name: "Garder A1" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Impossible d’enregistrer");
    expect(push).not.toHaveBeenCalled();
    const retry = screen.getByRole("button", { name: "Garder A1" }) as HTMLButtonElement;
    expect(retry.disabled).toBe(false);
    await user.click(retry);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenCalledWith("/parcours/it");
  });

  it("shows the weaker wording of a low confidence with the number of questions", async () => {
    const user = userEvent.setup();
    flow("A2");
    await user.click(screen.getByRole("button", { name: "Commencer" }));
    // A2 passed with 3 right answers, B1 failed with 2: the two blocks of the boundary are borderline.
    let asked = 0;
    while (screen.queryByRole("heading", { level: 2 })) {
      const right = asked % 5 < (asked < 5 ? 3 : 2);
      const item = shown();
      await user.click(screen.getAllByRole("radio")[right ? item.answer : (item.answer + 1) % 4]!);
      await user.click(screen.getByRole("button", { name: /^(Valider|Voir mon résultat)$/ }));
      asked += 1;
    }
    expect(screen.getByRole("img", { name: "Confiance faible" })).toBeTruthy();
    expect(screen.getByText("Confiance faible : 10 questions seulement, ton niveau reste à confirmer.")).toBeTruthy();
  });
});
