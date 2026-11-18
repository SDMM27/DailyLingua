import { languageCodeSchema } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import {
  LANGUAGE_CODES,
  LANGUAGE_REGISTRY,
  canLearn,
  isTargetLanguage,
  isValidNativeLanguage,
  languageDisplayName,
  languageInfo,
  textDirection,
} from "./languages";

describe("registry", () => {
  it("holds the 19 former languages and French", () => {
    expect(LANGUAGE_CODES).toHaveLength(20);
    expect(LANGUAGE_CODES).toContain("fr");
    expect(languageInfo("fr")).toMatchObject({ code: "fr", dir: "ltr", nativeName: "Français" });
  });

  it("keys match codes, codes are valid, and no field is named after a language", () => {
    for (const [key, info] of Object.entries(LANGUAGE_REGISTRY)) {
      expect(info.code).toBe(key);
      expect(languageCodeSchema.safeParse(key).success).toBe(true);
      expect(Object.keys(info).filter((field) => /^name[A-Z][a-z]$/.test(field) || /_[a-z]{2}$/.test(field))).toEqual([]);
    }
  });

  it("flags right-to-left and dense scripts", () => {
    expect(languageInfo("ar").dir).toBe("rtl");
    expect(languageInfo("zh")).toMatchObject({ denseScript: true, unspaced: true });
  });

  it("recognises study languages", () => {
    expect(isTargetLanguage("fr")).toBe(true);
    expect(isTargetLanguage("yo")).toBe(false);
    expect(isTargetLanguage("toString")).toBe(false);
  });
});

describe("languageDisplayName", () => {
  it("names a language in the interface locale", () => {
    expect(languageDisplayName("fr", "en")).toBe("French");
    expect(languageDisplayName("es", "fr")).toBe("espagnol");
    expect(languageDisplayName("ja", "de")).toBe("Japanisch");
  });

  it("names a language that is not a study language", () => {
    expect(languageDisplayName("yo", "en")).toBe("Yoruba");
  });

  it("falls back to the native name, then to the code", () => {
    expect(languageDisplayName("ja", "not a locale!")).toBe("日本語");
    expect(languageDisplayName("zz9", "en")).toBe("zz9");
    expect(languageDisplayName("", "en")).toBe("");
  });
});

describe("isValidNativeLanguage", () => {
  it("accepts any language the runtime can name, not only study languages", () => {
    for (const code of ["fr", "en", "yo", "sw", "tl", "fil", "ar", "hi"]) {
      expect(isValidNativeLanguage(code), code).toBe(true);
    }
  });

  it("refuses wrong shapes and unknown languages", () => {
    for (const code of ["", "f", "FR", "fr-FR", "french", "f1", "zz9"]) {
      expect(isValidNativeLanguage(code), code).toBe(false);
    }
    expect(isValidNativeLanguage("qqq")).toBe(false);
  });
});

describe("canLearn", () => {
  it("refuses the mother tongue as target", () => {
    expect(canLearn("fr", "fr")).toBe(false);
    expect(canLearn("fr", "es")).toBe(true);
    expect(canLearn("en", "fr")).toBe(true);
  });
});

describe("textDirection", () => {
  it("is right-to-left for Arabic, Hebrew, Persian and Urdu", () => {
    for (const code of ["ar", "he", "fa", "ur"]) expect(textDirection(code)).toBe("rtl");
  });

  it("is left-to-right otherwise", () => {
    for (const code of ["fr", "en", "zh", "ja", "xx"]) expect(textDirection(code)).toBe("ltr");
  });
});
