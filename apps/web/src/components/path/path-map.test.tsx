// @vitest-environment jsdom
import { loadMessages } from "@dailylingua/i18n";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import type { PathModel, Station } from "@/lib/units/path";
import { PathMap } from "./path-map";

vi.mock("next/navigation", () => ({ usePathname: () => "/parcours/it", useRouter: () => ({ push: vi.fn() }) }));

window.scrollTo = vi.fn();
const messages = await loadMessages("fr");
const station = (patch: Partial<Station> & { id: string; number: number; status: Station["status"] }): Station => ({
  type: "station", title: `Unité ${patch.number}`, kind: "situation", minutes: 20, canDo: `Je peux ${patch.number}.`, goals: [`Je peux ${patch.number}.`], letters: [],
  testSize: 10, passedByTest: false, passedOn: null, step: null, started: false, warmup: 0, ...patch,
});
const model = (entries: PathModel["entries"], patch: Partial<PathModel> = {}): PathModel => {
  const stations = entries.filter((entry): entry is Station => entry.type === "station");
  return {
    entries, done: stations.filter((entry) => entry.status === "done").length, total: stations.length, level: "A1",
    currentId: stations.find((entry) => entry.status === "current")?.id ?? null, hasWriting: false, currentIsWriting: false, confirmed: false, ...patch,
  };
};
const show = (value: PathModel, language = "it") => render(
  <NextIntlClientProvider locale="fr" messages={messages}>
    <PathMap language={language} languageName="Italien" locale="fr" model={value} />
  </NextIntlClientProvider>,
);

const line = [
  station({ id: "it-a1-01-a", number: 1, status: "done", passedByTest: true, passedOn: "20 nov." }),
  station({ id: "it-a1-02-b", number: 2, status: "current", started: true, step: { position: 3, total: 6, key: "grammar" }, warmup: 2 }),
  station({ id: "it-a1-03-c", number: 3, status: "todo" }),
];

describe("path map", () => {
  it("shows the honest count, the three states, and « Continuer » only on the current station", () => {
    show(model(line));
    expect(screen.getByRole("heading", { level: 1, name: "Niveau A1" })).toBeTruthy();
    expect(screen.getByText("1 unité sur 3.")).toBeTruthy();
    const items = within(screen.getByRole("list", { name: "Unités du niveau A1" })).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[1]!.getAttribute("aria-current")).toBe("step");
    expect(screen.getByText("Unité 2 · étape 3 sur 6")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Continuer" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Continuer" }).getAttribute("href")).toBe("/parcours/it/it-a1-02-b");
    expect(screen.getByText("validée par le test")).toBeTruthy();
    expect(screen.getByRole("button", { name: "1 · Unité 1, validée. Je peux 1." })).toBeTruthy();
    expect(screen.getByRole("button", { name: "3 · Unité 3, pas commencée, environ 20 min" })).toBeTruthy();
  });

  it("starts the first unit on day one with « Commencer »", () => {
    show(model([station({ id: "it-a1-01-a", number: 1, status: "current" }), station({ id: "it-a1-02-b", number: 2, status: "todo" })]));
    expect(screen.getByRole("link", { name: "Commencer" }).getAttribute("href")).toBe("/parcours/it/it-a1-01-a");
    expect(screen.getByText("Unité 1", { selector: "p" })).toBeTruthy();
  });

  it("says so when the level is finished, with no current station", () => {
    show(model([station({ id: "it-a1-01-a", number: 1, status: "done" })]));
    expect(screen.queryByRole("link", { name: /Continuer|Commencer/ })).toBeNull();
    expect(screen.getByText("Toutes les unités de ce niveau sont validées.")).toBeTruthy();
  });

  it("ends the line with the bilan under « Bilan · A1 », and says « A1 confirmé » once it is passed", () => {
    const bilanLine = (status: Station["status"]): PathModel["entries"] => [
      station({ id: "it-a1-10-b", number: 1, status: "done" }),
      { type: "zone", zone: "assessment", level: "A1" },
      station({ id: "it-a1-11-bilan", number: 2, status: status, kind: "assessment", title: "Bilan A1" }),
    ];
    const { unmount } = show(model(bilanLine("current")));
    expect(screen.getByText("Bilan · A1")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Niveau A1" })).toBeTruthy();
    expect(screen.getByText("Bilan de fin de parcours")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Passer le bilan" }).getAttribute("href")).toBe("/parcours/it/it-a1-11-bilan");
    unmount();
    show(model(bilanLine("done"), { confirmed: true }));
    expect(screen.getByRole("heading", { level: 1, name: "A1 confirmé" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Niveau A1" })).toBeNull();
  });

  it("opens the sheet of the bilan with one action only: no « Je connais déjà »", async () => {
    const user = userEvent.setup();
    show(model([
      station({ id: "it-a1-10-b", number: 1, status: "done" }),
      { type: "zone", zone: "assessment", level: "A1" },
      station({ id: "it-a1-11-bilan", number: 2, status: "current", kind: "assessment", title: "Bilan A1" }),
    ]));
    await user.click(screen.getByRole("button", { name: /Bilan A1, à commencer/ }));
    const sheet = screen.getByRole("dialog", { name: "Bilan A1" });
    expect(within(sheet).getByText("10 questions, sans aide")).toBeTruthy();
    const links = within(sheet).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([["Passer le bilan", "/parcours/it/it-a1-11-bilan"]]);
    expect(within(sheet).queryByText(/Je connais déjà/)).toBeNull();
  });

  it("names the zones of a path with writing units", () => {
    show(model([
      { type: "zone", zone: "writing", level: "A0" },
      station({ id: "ru-a0-01-a", number: 1, status: "done", kind: "script", letters: ["А", "К"] }),
      { type: "zone", zone: "situations", level: "A1" },
      station({ id: "ru-a1-06-b", number: 2, status: "current" }),
    ], { hasWriting: true, level: "A1" }), "ru");
    expect(screen.getByText("Écriture · A0")).toBeTruthy();
    expect(screen.getByText("Situations · A1")).toBeTruthy();
  });

  it("opens the sheet of a station: goals, the way in and « Je connais déjà » to the test; focus is on its title", async () => {
    const user = userEvent.setup();
    show(model(line));
    await user.click(screen.getByRole("button", { name: /3 · Unité 3/ }));
    const sheet = screen.getByRole("dialog", { name: "Unité 3" });
    expect(document.activeElement).toBe(within(sheet).getByRole("heading", { name: "Unité 3" }));
    expect(within(sheet).getByText("À la fin, tu pourras dire")).toBeTruthy();
    expect(within(sheet).getByRole("link", { name: "Commencer l’unité" }).getAttribute("href")).toBe("/parcours/it/it-a1-03-c");
    const skip = within(sheet).getByRole("link", { name: /Je connais déjà/ });
    expect(skip.getAttribute("href")).toBe("/parcours/it/it-a1-03-c?start=test");
    expect(skip.textContent).toContain("passer le test, 10 questions");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("offers to resume the current unit and announces the warm-up in its sheet", async () => {
    const user = userEvent.setup();
    show(model(line));
    await user.click(screen.getByRole("button", { name: /Unité 2, en cours/ }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("link", { name: "Reprendre · étape 3 sur 6" })).toBeTruthy();
    expect(within(sheet).getByText("Revoir les 2 phrases d’hier")).toBeTruthy();
  });

  it("shows the date and « Revoir l’unité » for a unit done, and the test becomes « Repasser le test »", async () => {
    const user = userEvent.setup();
    show(model(line));
    await user.click(screen.getByRole("button", { name: /1 · Unité 1, validée/ }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText("Validée le 20 nov.")).toBeTruthy();
    expect(within(sheet).getByRole("link", { name: "Revoir l’unité" })).toBeTruthy();
    expect(within(sheet).getByRole("link", { name: /Repasser le test/ }).getAttribute("href")).toContain("?start=test");
  });
});
