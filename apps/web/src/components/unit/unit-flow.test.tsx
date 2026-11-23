// @vitest-environment jsdom
import { getUnit } from "@dailylingua/content";
import { loadMessages } from "@dailylingua/i18n";
import type { UnitItem } from "@dailylingua/schemas";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import type { UnitEvent } from "@/lib/units/events";
import { ExerciseRunner, type ItemAttempt } from "./exercise-runner";
import { UnitFlow } from "./unit-flow";

const messages = await loadMessages("fr");
const unit = getUnit("it-a1-01-saluer")!;
const item = (id: string): UnitItem => unit.items.find((entry) => entry.id === id)!;

function wrap(node: React.ReactNode) {
  return <NextIntlClientProvider locale="fr" messages={messages}>{node}</NextIntlClientProvider>;
}

function runner(items: UnitItem[], handlers: { onAttempt?(attempt: ItemAttempt): void; onDone?(): void; onXp?(xp: number): void } = {}) {
  return render(wrap(
    <ExerciseRunner items={items} language="it" locale="fr" tolerance="lenient" onAttempt={handlers.onAttempt ?? vi.fn()} onXp={handlers.onXp ?? vi.fn()} onDone={handlers.onDone ?? vi.fn()} />,
  ));
}

const check = () => screen.getByRole("button", { name: "Vérifier" });

describe("order exercise (tiles)", () => {
  it("places and removes tiles, announces them, and accepts the right sentence first try (+2 XP)", async () => {
    const user = userEvent.setup();
    const attempts: ItemAttempt[] = [];
    const onXp = vi.fn();
    runner([item("i08")], { onAttempt: (attempt) => attempts.push(attempt), onXp });
    const bank = () => within(screen.getByRole("list", { name: "Mots à placer" }));
    const answer = () => within(screen.getByRole("list", { name: "Ta phrase" }));

    await user.click(bank().getByRole("button", { name: "Leo" }));
    expect(answer().getByRole("button", { name: "Leo" })).toBeTruthy();
    expect(screen.getByText("Leo placé en position 1")).toBeTruthy();
    // A placed tile leaves a dashed slot in the bank (hidden from assistive technology).
    expect(bank().queryByRole("button", { name: "Leo" })).toBeNull();
    await user.click(answer().getByRole("button", { name: "Leo" }));
    expect(screen.getByText("Leo retiré de la phrase")).toBeTruthy();
    expect(answer().queryByRole("button")).toBeNull();

    for (const word of ["Mi", "chiamo", "Leo"]) await user.click(bank().getByRole("button", { name: word }));
    await user.click(check());
    expect(screen.getByRole("heading", { name: "Juste" })).toBeTruthy();
    expect(screen.getByText("+2 XP")).toBeTruthy();
    expect(attempts).toMatchObject([{ tryNumber: 1, answer: "Mi chiamo Leo", correct: true }]);
    expect(onXp).toHaveBeenCalledWith(2);
  });

  it("offers a retry without the answer, then shows the answer on the second miss and brings the item back", async () => {
    const user = userEvent.setup();
    const attempts: ItemAttempt[] = [];
    const onDone = vi.fn();
    runner([item("i08")], { onAttempt: (attempt) => attempts.push(attempt), onDone });
    const bank = () => within(screen.getByRole("list", { name: "Mots à placer" }));
    const place = async (words: string[]) => { for (const word of words) await user.click(bank().getByRole("button", { name: word })); };

    await place(["chiamo", "Mi", "Leo"]);
    await user.click(check());
    expect(screen.getByRole("heading", { name: "À revoir" })).toBeTruthy();
    // No answer is given on the first miss.
    expect(screen.queryByText("Mi chiamo Leo.")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(screen.queryByRole("heading", { name: "À revoir" })).toBeNull();

    await user.click(check());
    expect(screen.getByRole("heading", { name: "À revoir" })).toBeTruthy();
    expect(screen.getByText("Mi chiamo Leo.")).toBeTruthy();
    expect(screen.getByText("Elle revient en fin d’étape.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    // The item comes back once, as the third and last try.
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByText(/2 sur 2/)).toBeTruthy();
    await user.click(screen.getByRole("list", { name: "Mots à placer" }).querySelector("button")!);
    expect(attempts.map((attempt) => attempt.tryNumber)).toEqual([1, 2]);
  });
});

describe("match exercise", () => {
  it("pairs a phrase with its translation, undoes a pairing, and grades the whole pairing", async () => {
    const user = userEvent.setup();
    const attempts: ItemAttempt[] = [];
    runner([item("i03")], { onAttempt: (attempt) => attempts.push(attempt) });
    const match = item("i03");
    if (match.kind !== "match") throw new Error("match expected");
    const left = () => within(screen.getByRole("list", { name: "Phrases" }));
    const right = () => within(screen.getByRole("list", { name: "Traductions" }));

    // Verify stays unusable until every phrase is paired.
    await user.click(check());
    expect(attempts).toHaveLength(0);

    // Pair the first two wrongly, then undo one.
    await user.click(left().getByRole("button", { name: match.pairs[0]!.left }));
    await user.click(right().getByRole("button", { name: match.pairs[1]!.right.fr }));
    await user.click(left().getByRole("button", { name: new RegExp(match.pairs[0]!.left) }));
    expect(right().getByRole("button", { name: match.pairs[1]!.right.fr })).toBeTruthy();

    for (const pair of match.pairs) {
      await user.click(left().getByRole("button", { name: pair.left }));
      await user.click(right().getByRole("button", { name: pair.right.fr }));
    }
    await user.click(check());
    expect(attempts).toMatchObject([{ tryNumber: 1, answer: "0:0,1:1,2:2,3:3", correct: true }]);
    expect(screen.getByRole("heading", { name: "Juste" })).toBeTruthy();
  });
});

describe("unit flow", () => {
  const flow = (props: Partial<React.ComponentProps<typeof UnitFlow>> = {}) => {
    const events: UnitEvent[] = [];
    const view = render(wrap(
      <UnitFlow
        unit={unit}
        progress={null}
        locale="fr"
        tolerance="lenient"
        xpVisible
        animate={false}
        offline={false}
        nextUnit={null}
        onEvents={async (batch) => { events.push(...batch); }}
        onLeave={vi.fn()}
        onOpenUnit={vi.fn()}
        {...props}
      />,
    ));
    return { events, ...view };
  };

  it("resumes at the first step the server has not validated", async () => {
    const user = userEvent.setup();
    const stamp = "2026-11-23T10:00:00Z";
    flow({ progress: { steps: { "l1:dialogue": stamp, "l1:key_phrases": stamp }, bestScore: null, testAttempts: 0, passedAt: null } });
    await user.click(screen.getByRole("button", { name: "Reprendre · étape 3 sur 6" }));
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("3");
    expect(bar.getAttribute("aria-valuetext")).toBe("Étape 3 sur 6, Grammaire");
  });

  it("starts at the dialogue, one line at a time, with the audio marked as being prepared", async () => {
    const user = userEvent.setup();
    // A unit whose audio is not generated yet.
    const silent = { ...unit, dialogue: { ...unit.dialogue, audio: null, lines: unit.dialogue.lines.map((line) => ({ ...line, audio: null })) } };
    flow({ unit: silent });
    await user.click(screen.getByRole("button", { name: "Commencer l’unité" }));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
    expect(screen.getByText(/réplique 1 sur 9/)).toBeTruthy();
    expect(screen.getByText("Audio en préparation.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Écouter la réplique 1" }).getAttribute("aria-disabled")).toBe("true");
    // The translation is behind a tap.
    expect(screen.queryByText(/Moi, c.est Giulia/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Voir la traduction" }));
    expect(screen.getByText(/Moi, c.est Giulia/)).toBeTruthy();
    // « Continuer » only appears once the last line has been shown.
    expect(screen.queryByRole("button", { name: "Continuer" })).toBeNull();
    for (let line = 1; line < 9; line++) await user.click(screen.getByRole("button", { name: "Réplique suivante" }));
    expect(screen.getByRole("button", { name: "Continuer" })).toBeTruthy();
  });

  it("opens the word panel from a touched word, with its gloss", async () => {
    const user = userEvent.setup();
    flow();
    await user.click(screen.getByRole("button", { name: "Commencer l’unité" }));
    await user.click(screen.getByRole("button", { name: "Ciao, mot nouveau" }));
    const panel = screen.getByRole("region", { name: "Mot touché" });
    expect(within(panel).getByText("salut (pour arriver ou partir)")).toBeTruthy();
  });

  it("« Je connais déjà » opens the test directly, with no feedback per question, and submits one event at the end", async () => {
    const user = userEvent.setup();
    const { events } = flow();
    await user.click(screen.getByRole("button", { name: /Je connais déjà/ }));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("6");
    expect(screen.getByText(/Question 1 sur 10/)).toBeTruthy();
    for (let question = 0; question < 10; question++) {
      const radio = screen.queryAllByRole("radio")[0];
      if (radio) await user.click(radio);
      else {
        // order, cloze, type, match: answer with whatever the widget needs.
        const input = screen.queryByRole("textbox");
        if (input) await user.type(input, "x");
        else {
          const bank = screen.queryByRole("list", { name: "Mots à placer" });
          if (bank) await user.click(within(bank).getAllByRole("button")[0]!);
          else {
            const lefts = within(screen.getByRole("list", { name: "Phrases" })).getAllByRole("button");
            const rights = within(screen.getByRole("list", { name: "Traductions" })).getAllByRole("button");
            for (let i = 0; i < lefts.length; i++) {
              await user.click(lefts[i]!);
              await user.click(rights[i]!);
            }
          }
        }
      }
      expect(screen.queryByRole("heading", { name: "Juste" })).toBeNull();
      await user.click(screen.getByRole("button", { name: question === 9 ? "Voir mon résultat" : "Question suivante" }));
    }
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "unit_test_submitted", payload: { unitId: unit.id, unitVersion: unit.version } });
    // The result: a score and a way back; the pass mark is shown.
    expect(screen.getByRole("img", { name: /réponses justes sur 10, seuil à 8/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retour au parcours" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Repasser le test maintenant" })).toBeTruthy();
  });
});
