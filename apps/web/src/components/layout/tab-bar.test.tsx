// @vitest-environment jsdom
import { loadMessages } from "@dailylingua/i18n";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { TabBar } from "./tab-bar";

const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

const messages = await loadMessages("fr");
const show = (pathLanguage?: string | null, hasProgress = false) => render(
  <NextIntlClientProvider locale="fr" messages={messages}><TabBar pathLanguage={pathLanguage} hasProgress={hasProgress} /></NextIntlClientProvider>,
);
const names = () => within(screen.getByRole("navigation")).getAllByRole("link").map((link) => link.textContent);

describe("tab bar", () => {
  it("has three tabs without a path, and « Parcours » second with one", () => {
    const view = show(null);
    expect(names()).toEqual(["Aujourd’hui", "Lire", "Réglages"]);
    view.unmount();
    show("it");
    expect(names()).toEqual(["Aujourd’hui", "Parcours", "Lire", "Réglages"]);
    expect(screen.getByRole("link", { name: "Parcours" }).getAttribute("href")).toBe("/parcours/it");
  });

  it("marks « Parcours » as the current page on the map", () => {
    pathname.value = "/parcours/it";
    show("it");
    expect(screen.getByRole("link", { name: "Parcours" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Aujourd’hui" }).getAttribute("aria-current")).toBeNull();
  });
  it("links to Progress for pilot learners and marks the active tab", () => {
    pathname.value = "/progress";
    show("ru", true);
    expect(names()).toEqual(["Aujourd’hui", "Parcours", "Lire", "Progrès", "Réglages"]);
    const link = screen.getByRole("link", { name: "Progrès" });
    expect(link.getAttribute("href")).toBe("/progress");
    expect(link.getAttribute("aria-current")).toBe("page");
  });
});
