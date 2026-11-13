import { loadMessages } from "@dailylingua/i18n";
import { describe, expect, it, vi } from "vitest";

let locale: "fr" | "en" = "fr";
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    const messages = (await loadMessages(locale)) as unknown as Record<string, Record<string, string>>;
    return (key: string) => messages[namespace]?.[key] ?? `${namespace}.${key}`;
  },
}));

const { default: manifest } = await import("./manifest");

describe("web app manifest", () => {
  it("makes the app installable as a standalone, portrait app", async () => {
    const value = await manifest();
    expect(value).toMatchObject({ start_url: "/", scope: "/", display: "standalone", orientation: "portrait" });
    expect(value.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(value.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("is named and described in the language of the request", async () => {
    locale = "fr";
    const fr = await manifest();
    locale = "en";
    const en = await manifest();
    expect(fr.name).toBe("Daily Lingua");
    expect(fr.description).toContain("séance");
    expect(en.description).toContain("session");
    expect(en.description).not.toBe(fr.description);
  });

  it("declares 192 and 512 px icons and a maskable one", async () => {
    const icons = (await manifest()).icons ?? [];
    expect(icons.map((icon) => `${icon.sizes}:${icon.purpose}`)).toEqual(["192x192:any", "512x512:any", "512x512:maskable"]);
    for (const icon of icons) expect(icon.src.startsWith("/icons/")).toBe(true);
  });
});
