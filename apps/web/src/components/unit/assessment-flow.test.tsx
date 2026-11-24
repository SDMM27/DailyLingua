// @vitest-environment jsdom
import { loadMessages } from "@dailylingua/i18n";
import type { AssessmentUnit } from "@dailylingua/schemas";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import type { UnitEvent } from "@/lib/units/events";
import { bilanSourceId, testBilan } from "@/lib/units/test-bilan";
import { UnitExtrasProvider } from "./unit-extras";
import { UnitFlow } from "./unit-flow";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const messages = await loadMessages("fr");
const { bilan } = testBilan();
const sources = Object.fromEntries(["06", "07", "08", "09", "10"].map((nn, index) => [bilanSourceId(nn), { number: index + 1, title: `Source ${nn}` }]));

function flow(unit: AssessmentUnit = bilan, extras: { warmupItemIds?: string[] } = {}) {
  const events: UnitEvent[] = [];
  const onLeave = vi.fn();
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <UnitExtrasProvider value={{ pathHref: "/parcours/it", number: 6, startAtTest: false, unitXp: 0, warmupItemIds: [], sources, ...extras }}>
        <UnitFlow
          unit={unit} progress={null} locale="fr" tolerance="lenient" xpVisible animate={false} offline={false} nextUnit={null}
          onEvents={async (batch) => { events.push(...batch); }} onLeave={onLeave} onOpenUnit={vi.fn()}
        />
      </UnitExtrasProvider>
    </NextIntlClientProvider>,
  );
  return { events, onLeave };
}

/** Answers the ten single-choice questions: the right option, or the first wrong one for the first `wrong` of them. */
async function takeTest(user: ReturnType<typeof userEvent.setup>, wrong: number) {
  for (let question = 0; question < 10; question++) {
    const item = bilan.items.find((entry) => entry.id === bilan.test.itemIds[question]);
    if (!item || item.kind !== "mcq") throw new Error("the test bilan has single-choice items only");
    const right = item.options.find((option) => option.id === item.answer)!;
    const chosen = question < wrong ? item.options.find((option) => option.id !== item.answer)! : right;
    await user.click(screen.getByRole("radio", { name: chosen.text }));
    await user.click(screen.getByRole("button", { name: question === 9 ? "Voir mon résultat" : "Question suivante" }));
  }
}

describe("the bilan in the player", () => {
  it("opens straight on the test (no introduction, no lessons) and submits one event", async () => {
    const user = userEvent.setup();
    const { events } = flow();
    expect(screen.getByText(/Question 1 sur 10/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Je connais déjà/ })).toBeNull();
    expect(screen.queryByText(/Commencer l’unité/)).toBeNull();
    await takeTest(user, 0);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "unit_test_submitted", payload: { unitId: bilan.id, unitVersion: bilan.version } });
    expect(events[0]?.kind === "unit_test_submitted" && events[0].payload.answers.map((answer) => answer.itemId)).toEqual(bilan.test.itemIds);
  });

  it("confirms the level with the score when passed (8 of 10 is enough)", async () => {
    const user = userEvent.setup();
    flow();
    await takeTest(user, 2);
    expect(screen.getByRole("heading", { name: "A1 confirmé" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /8 réponses justes sur 10, seuil à 8/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retour au parcours" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Repasser le bilan" })).toBeNull();
  });

  it("when not passed, gives the score, the pass mark and the units to review, with no warm-up sentence", async () => {
    const user = userEvent.setup();
    // The first three questions are missed: they are drawn from the first two source units (two each, in draw order).
    flow(bilan, { warmupItemIds: bilan.test.itemIds });
    await takeTest(user, 3);
    expect(screen.getByRole("heading", { name: "Pas encore" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /7 réponses justes sur 10, seuil à 8/ })).toBeTruthy();
    expect(screen.getByText("Il faut 8 sur 10.")).toBeTruthy();
    expect(screen.getByText("Unités à revoir avant de repasser le bilan")).toBeTruthy();
    const listed = screen.getAllByRole("listitem").map((entry) => entry.textContent);
    expect(listed).toEqual(["1 · Source 06", "2 · Source 07"]);
    expect(screen.getByRole("button", { name: "Retour au parcours" })).toBeTruthy();
    expect(screen.queryByText(/demain/)).toBeNull();
    expect(screen.queryByText(/phrases? manquées?/)).toBeNull();
    expect(screen.queryByRole("heading", { name: "A1 confirmé" })).toBeNull();

    // « Repasser le bilan » starts the test again on its first question.
    await user.click(screen.getByRole("button", { name: "Repasser le bilan" }));
    expect(screen.getByText(/Question 1 sur 10/)).toBeTruthy();
  });

  it("shows no warm-up even when warm-up items are handed over", () => {
    flow(bilan, { warmupItemIds: bilan.test.itemIds });
    expect(screen.queryByText(/chauffement/)).toBeNull();
    expect(screen.getByText(/Question 1 sur 10/)).toBeTruthy();
  });
});
