// @vitest-environment jsdom
import { getUnit } from "@dailylingua/content";
import { loadMessages } from "@dailylingua/i18n";
import type { SituationUnit } from "@dailylingua/schemas";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import type { UnitEvent } from "@/lib/units/events";
import { lessonOfItem } from "@/lib/units/flow";
import { UnitExtrasProvider } from "./unit-extras";
import { UnitFlow } from "./unit-flow";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const messages = await loadMessages("fr");
const unit = getUnit("it-a1-01-saluer") as SituationUnit;
// Two single-choice items that belong to a lesson: the warm-up replays them.
const missed = unit.items.filter((item) => item.kind === "mcq" && lessonOfItem(unit, item.id)).slice(0, 2);

function flow(extras: { startAtTest?: boolean; warmupItemIds?: string[]; unitXp?: number } = {}, props: Partial<React.ComponentProps<typeof UnitFlow>> = {}) {
  const events: UnitEvent[] = [];
  const onLeave = vi.fn();
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <UnitExtrasProvider value={{ pathHref: "/parcours/it", number: 1, startAtTest: false, unitXp: 0, warmupItemIds: [], ...extras }}>
        <UnitFlow
          unit={unit} progress={null} locale="fr" tolerance="lenient" xpVisible animate={false} offline={false} nextUnit={null}
          onEvents={async (batch) => { events.push(...batch); }} onLeave={onLeave} onOpenUnit={vi.fn()} {...props}
        />
      </UnitExtrasProvider>
    </NextIntlClientProvider>,
  );
  return { events, onLeave };
}

describe("warm-up of the missed sentences", () => {
  it("is offered first, replays the items with their lesson of origin, then proposes the test", async () => {
    const user = userEvent.setup();
    const { events } = flow({ warmupItemIds: missed.map((item) => item.id) });
    expect(screen.getByText("Revoir les 2 phrases d’hier")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Commencer l’échauffement" }));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Étape 1 sur 1, Échauffement");

    for (const item of missed) {
      if (item.kind !== "mcq") throw new Error("mcq expected");
      await user.click(screen.getByRole("radio", { name: item.options.find((option) => option.id === item.answer)!.text }));
      await user.click(screen.getByRole("button", { name: "Vérifier" }));
      expect(screen.getByRole("heading", { name: "Juste" })).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "Continuer" }));
    }
    expect(events.map((event) => event.kind)).toEqual(["unit_item_attempt", "unit_item_attempt"]);
    expect(events.map((event) => (event.kind === "unit_item_attempt" ? event.payload.lesson : null))).toEqual(missed.map((item) => lessonOfItem(unit, item.id)));
    // No step is validated by a warm-up.
    expect(events.some((event) => event.kind === "unit_step_completed")).toBe(false);

    expect(screen.getByRole("heading", { name: "Échauffement terminé" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Repasser le test" }));
    expect(screen.getByText(/Question 1 sur 10/)).toBeTruthy();
  });

  it("can be skipped for the unit itself", async () => {
    const user = userEvent.setup();
    flow({ warmupItemIds: missed.map((item) => item.id) });
    await user.click(screen.getByRole("button", { name: "Commencer l’unité" }));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Étape 1 sur 6, Dialogue");
  });

  it("is not offered for a unit already passed", () => {
    const stamp = "2026-11-23T10:00:00Z";
    flow({ warmupItemIds: missed.map((item) => item.id) }, { progress: { steps: {}, bestScore: 9, testAttempts: 2, passedAt: stamp } });
    expect(screen.queryByText(/Revoir les 2 phrases/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Commencer l’échauffement" })).toBeNull();
  });
});

describe("« Je connais déjà » link and the way back", () => {
  it("opens straight on the test when the page asks for it (?start=test)", () => {
    flow({ startAtTest: true });
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("6");
    expect(screen.getByText(/Question 1 sur 10/)).toBeTruthy();
  });
});
