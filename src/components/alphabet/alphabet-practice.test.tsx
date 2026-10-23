// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AlphabetCard, AlphabetExercise } from "@/lib/schemas/alphabet";
import { AlphabetPractice } from "./alphabet-practice";

const actions = vi.hoisted(() => ({ recordAlphabetPractice: vi.fn() }));
vi.mock("@/app/actions/alphabet", () => actions);

// Whether the device has a voice is a browser matter: the test decides.
const voice = vi.hoisted(() => ({ available: false }));
vi.mock("@/components/ui/listen-button", () => ({
  useHasLocalVoice: () => voice.available,
  ListenButton: ({ text }: { text: string }) => <button type="button">Écouter {text}</button>,
}));

beforeEach(() => {
  voice.available = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const TODAY = "2026-10-21";

const CARD: AlphabetCard = {
  id: "a1",
  groupId: "ru-alphabet-1",
  language: "ru",
  status: "learning",
  review: { box: 1, dueOn: TODAY, lastReviewedOn: "2026-10-19", reviewCount: 2 },
  addedOn: "2026-10-10",
};

const EXERCISES: AlphabetExercise[] = [
  { type: "letter-to-latin", upper: "Р", lower: "р", options: ["p", "r", "s", "t"], answer: 1 },
  { type: "latin-to-letter", latin: "m", soundFr: "comme « m » dans « mère »", options: ["К к", "М м", "Т т", "А а"], answer: 1 },
  { type: "read-word", word: "кот", options: ["kot", "kto", "tok", "mot"], answer: 0 },
  { type: "listen-word", word: "там", options: ["там", "мак", "кот", "кто"], answer: 0 },
];

function setup(props: Partial<Parameters<typeof AlphabetPractice>[0]> = {}) {
  const user = userEvent.setup();
  render(
    <AlphabetPractice groupId="ru-alphabet-1" exercises={EXERCISES} language="ru" today={TODAY} persist {...props} />,
  );
  return user;
}

/** Answers every question shown; `right` tells which ones get the right answer (by position). */
async function run(user: ReturnType<typeof userEvent.setup>, right: boolean[]) {
  for (const [i, ok] of right.entries()) {
    const buttons = screen.getByRole("group", { name: "Choisis la bonne réponse" }).querySelectorAll("button");
    const exercise = EXERCISES.filter((e) => voice.available || e.type !== "listen-word")[i];
    const target = ok ? exercise.answer : (exercise.answer + 1) % 4;
    await user.click(buttons[target]);
    await user.click(screen.getByRole("button", { name: /Suivant|Voir mon score/ }));
  }
}

describe("AlphabetPractice", () => {
  it("shows a letter without case once", () => {
    setup({
      exercises: [{ type: "letter-to-latin", upper: "ㄱ", lower: "ㄱ", options: ["g", "n", "d", "m"], answer: 0 }],
      language: "ko",
    });
    expect(screen.getByText("ㄱ")).toBeTruthy();
    expect(screen.queryByText("ㄱ ㄱ")).toBeNull();
  });

  it("writes Arabic right to left, and a letter shown as its display", () => {
    setup({
      exercises: [
        { type: "read-word", word: "بَاب", options: ["bāb", "bab", "bub", "bib"], answer: 0 },
        { type: "letter-to-latin", upper: "َ", lower: "َ", display: "ـَ", options: ["a", "i", "u", "—"], answer: 0 },
      ],
      language: "ar",
    });
    const word = screen.getByText("بَاب");
    expect(word.getAttribute("dir")).toBe("rtl");
    expect(word.getAttribute("lang")).toBe("ar");
    // The Latin answers stay left to right.
    expect(screen.getByRole("button", { name: "bāb" }).getAttribute("dir")).toBeNull();
  });

  it("shows the verdict and the right answer at once, with big tap targets", async () => {
    const user = setup();
    const options = screen.getByRole("group", { name: "Choisis la bonne réponse" }).querySelectorAll("button");
    expect([...options].every((b) => b.className.includes("min-h-14"))).toBe(true);

    await user.click(screen.getByRole("button", { name: "p" }));
    expect(screen.getByText(/Pas tout à fait/)).toBeTruthy();
    expect(screen.getByText("r", { selector: "span" })).toBeTruthy();
    // Answered: the options are locked.
    expect((screen.getByRole("button", { name: "r" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Suivant" }));

    expect(screen.getByText("2 / 3")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "М м" }));
    expect(screen.getByText(/Juste/)).toBeTruthy();
  });

  it("drops the listening questions when the device has no voice", async () => {
    setup();
    expect(screen.getByText("1 / 3")).toBeTruthy();
    cleanup();
    voice.available = true;
    setup();
    expect(screen.getByText("1 / 4")).toBeTruthy();
  });

  it("sends the score with the questions actually asked", async () => {
    actions.recordAlphabetPractice.mockResolvedValue({
      ok: true,
      data: {
        outcome: "created",
        card: { ...CARD, review: { box: 1, dueOn: "2026-10-23", lastReviewedOn: TODAY, reviewCount: 1 } },
      },
    });
    const user = setup();
    await run(user, [true, true, false]);
    expect(actions.recordAlphabetPractice).toHaveBeenCalledWith({
      groupId: "ru-alphabet-1",
      correct: 2,
      total: 3,
      expectedReviewCount: null,
    });
    expect(await screen.findByText(/Groupe ajouté à tes révisions.*prochaine révision dans 2 j\./)).toBeTruthy();
    expect(screen.getByText("2 / 3")).toBeTruthy();
  });

  it("counts the listening questions when there is a voice", async () => {
    voice.available = true;
    actions.recordAlphabetPractice.mockResolvedValue({ ok: true, data: { outcome: "not-passed", card: null } });
    const user = setup();
    await run(user, [true, true, true, true]);
    expect(actions.recordAlphabetPractice).toHaveBeenCalledWith(expect.objectContaining({ correct: 4, total: 4 }));
  });

  it("sends the review count of the card it knows and reports a review", async () => {
    actions.recordAlphabetPractice.mockResolvedValue({
      ok: true,
      data: { outcome: "reviewed", card: { ...CARD, review: { ...CARD.review, dueOn: "2026-10-22", reviewCount: 3 } } },
    });
    const user = setup({ card: CARD });
    await run(user, [true, true, true]);
    expect(actions.recordAlphabetPractice).toHaveBeenCalledWith(expect.objectContaining({ expectedReviewCount: 2 }));
    expect(await screen.findByText("Prochaine révision demain.")).toBeTruthy();
  });

  it("says when the score is too low", async () => {
    actions.recordAlphabetPractice.mockResolvedValue({ ok: true, data: { outcome: "not-passed", card: null } });
    const user = setup();
    await run(user, [false, false, true]);
    expect(await screen.findByText(/Il faut au moins 60.%/)).toBeTruthy();
  });

  it("shows the message of the server when the save is refused, and can start again", async () => {
    actions.recordAlphabetPractice.mockResolvedValue({
      ok: false,
      error: "Cette fiche a changé entre-temps : recharge la page.",
    });
    const user = setup();
    await run(user, [true, true, true]);
    expect((await screen.findByRole("alert")).textContent).toContain("Cette fiche a changé");
    await user.click(screen.getByRole("button", { name: "Recommencer" }));
    expect(screen.getByText("1 / 3")).toBeTruthy();
  });

  it("saves nothing in the demo", async () => {
    const user = setup({ persist: false });
    await run(user, [true, true, true]);
    expect(actions.recordAlphabetPractice).not.toHaveBeenCalled();
    expect(screen.getByText(/Mode démonstration.*rien n’est enregistré\./)).toBeTruthy();
  });
});
