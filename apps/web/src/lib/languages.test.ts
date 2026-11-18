import { LANGUAGE_CODES, isValidNativeLanguage } from "@dailylingua/core";
import { describe, expect, it } from "vitest";
import { defaultNativeLanguage, filterLanguages, nativeLanguageOptions, targetLanguageOptions, timeZoneOptions } from "./languages";

describe("nativeLanguageOptions", () => {
  const options = nativeLanguageOptions("fr");

  it("offers many languages, every one accepted as a mother tongue", () => {
    expect(options.length).toBeGreaterThan(100);
    for (const option of options) expect(isValidNativeLanguage(option.code), option.code).toBe(true);
  });

  it("includes every study language and names languages in the interface language", () => {
    for (const code of LANGUAGE_CODES) expect(options.some((option) => option.code === code), code).toBe(true);
    expect(options.find((option) => option.code === "de")?.name).toBe("allemand");
    expect(nativeLanguageOptions("en").find((option) => option.code === "de")?.name).toBe("German");
  });

  it("has each code once and is sorted by name", () => {
    expect(new Set(options.map((option) => option.code)).size).toBe(options.length);
    const names = options.map((option) => option.name);
    expect(names).toEqual([...names].sort(new Intl.Collator("fr").compare));
  });
});

describe("targetLanguageOptions", () => {
  it("is the registry, with each language's own name", () => {
    const options = targetLanguageOptions("fr");
    expect(options.map((option) => option.code).sort()).toEqual([...LANGUAGE_CODES].sort());
    expect(options.find((option) => option.code === "ru")?.nativeName).toBe("Русский");
  });
});

describe("filterLanguages", () => {
  const options = nativeLanguageOptions("fr");

  it("returns everything for an empty query", () => {
    expect(filterLanguages(options, "  ")).toHaveLength(options.length);
  });

  it("ignores case and accents", () => {
    expect(filterLanguages(options, "ALLEMAND").map((option) => option.code)).toContain("de");
    expect(filterLanguages(options, "neerlandais").map((option) => option.code)).toContain("nl");
    expect(filterLanguages(options, "zzzzzz")).toEqual([]);
  });
});

describe("defaultNativeLanguage", () => {
  it("takes the first accepted language of the browser, by weight", () => {
    expect(defaultNativeLanguage("de-DE,de;q=0.9,en;q=0.8", "en")).toBe("de");
    expect(defaultNativeLanguage("en;q=0.5, pt-BR;q=0.9", "en")).toBe("pt");
  });

  it("falls back to the interface language", () => {
    expect(defaultNativeLanguage(null, "fr")).toBe("fr");
    expect(defaultNativeLanguage("*", "en")).toBe("en");
    expect(defaultNativeLanguage("zz-ZZ", "en")).toBe("en");
  });
});

describe("timeZoneOptions", () => {
  it("lists IANA zones", () => {
    expect(timeZoneOptions()).toContain("Europe/Paris");
  });
});
