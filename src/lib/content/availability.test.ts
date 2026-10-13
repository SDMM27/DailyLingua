import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES } from "@/lib/domain/languages";
import { availableLanguages } from "./availability";
import { SOURCE_CATALOG } from "./catalog";

describe("availableLanguages", () => {
  it("offers every language of the registry under the 'all' policy", () => {
    expect(availableLanguages(SOURCE_CATALOG, "all")).toEqual(LANGUAGE_CODES);
  });

  it("under the 'commercial' policy, only offers languages with an open-licence source", () => {
    const languages = availableLanguages(SOURCE_CATALOG, "commercial");
    const withOpenSource = new Set(SOURCE_CATALOG.filter((s) => s.license.commercialUse).map((s) => s.language));
    expect(languages.length).toBeGreaterThan(0);
    expect(languages.every((l) => withOpenSource.has(l))).toBe(true);
    expect(LANGUAGE_CODES.filter((l) => !languages.includes(l)).every((l) => !withOpenSource.has(l))).toBe(true);
    // Today: Swedish, Polish, Czech, Turkish, Chinese and Korean have no open-licence source.
    expect(languages).not.toContain("ko");
    expect(languages).toContain("ru");
  });

  it("keeps the registry order and has no duplicates", () => {
    const languages = availableLanguages(SOURCE_CATALOG, "all");
    expect(new Set(languages).size).toBe(languages.length);
  });
});
