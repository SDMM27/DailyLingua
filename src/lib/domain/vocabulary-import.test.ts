import { describe, expect, it } from "vitest";
import { markExisting, normalizeTermKey, parseVocabularyPaste } from "./vocabulary-import";

describe("normalizeTermKey", () => {
  it("ignores case, spacing and the Unicode form", () => {
    expect(normalizeTermKey("  Darsi   DA fare ")).toBe("darsi da fare");
    expect(normalizeTermKey("café")).toBe(normalizeTermKey("café"));
    expect(normalizeTermKey("ВДОБАВОК")).toBe("вдобавок");
  });
});

describe("parseVocabularyPaste", () => {
  it("reads term, translation and example with any of the separators", () => {
    const { entries, errors } = parseVocabularyPaste(
      ["sbrigarsi\tse dépêcher\tSbrigati!", "a malapena ; à peine", "darsi da fare = se démener", "vdobavok - en plus", "tuttavia – cependant", "ma — mais"].join("\n"),
    );
    expect(errors).toEqual([]);
    expect(entries).toEqual([
      { line: 1, term: "sbrigarsi", translation: "se dépêcher", example: "Sbrigati!" },
      { line: 2, term: "a malapena", translation: "à peine", example: undefined },
      { line: 3, term: "darsi da fare", translation: "se démener", example: undefined },
      { line: 4, term: "vdobavok", translation: "en plus", example: undefined },
      { line: 5, term: "tuttavia", translation: "cependant", example: undefined },
      { line: 6, term: "ma", translation: "mais", example: undefined },
    ]);
  });

  it("accepts a term alone and ignores blank lines, comments and Windows line endings", () => {
    const { entries, errors } = parseVocabularyPaste("# livre 1\r\n\r\nciao\r\n   \r\n  # note\r\ngrazie ;\r\n");
    expect(errors).toEqual([]);
    expect(entries).toEqual([
      { line: 3, term: "ciao", translation: undefined, example: undefined },
      { line: 6, term: "grazie", translation: undefined, example: undefined },
    ]);
  });

  it("splits on the first kind of separator found, tab first", () => {
    const [entry] = parseVocabularyPaste("un - deux\ttrois ; quatre").entries;
    expect(entry).toMatchObject({ term: "un - deux", translation: "trois ; quatre" });
  });

  it("keeps a hyphen inside a word and the extra separators of the example", () => {
    const { entries } = parseVocabularyPaste("arc-en-ciel; arc-en-ciel; il dit ; puis = part");
    expect(entries[0]).toMatchObject({ term: "arc-en-ciel", translation: "arc-en-ciel", example: "il dit ; puis = part" });
  });

  it("reports unusable lines with their number and keeps the others", () => {
    const long = "x".repeat(121);
    const { entries, errors } = parseVocabularyPaste(
      [`${long} ; trop long`, "ok ; bon", ` ; sans mot`, `mot ; ${"t".repeat(201)}`, `mot2 ; t ; ${"e".repeat(501)}`].join("\n"),
    );
    expect(entries.map((e) => e.term)).toEqual(["ok"]);
    expect(errors).toEqual([
      { line: 1, reason: "le mot dépasse 120 caractères" },
      { line: 3, reason: "le mot est vide" },
      { line: 4, reason: "la traduction dépasse 200 caractères" },
      { line: 5, reason: "l’exemple dépasse 500 caractères" },
    ]);
  });

  it("flags a duplicate on its later line, whatever the case", () => {
    const { entries, errors } = parseVocabularyPaste("Ciao ; salut\nautre\n  ciao  ; bonjour");
    expect(entries.map((e) => e.line)).toEqual([1, 2]);
    expect(errors).toEqual([{ line: 3, reason: "doublon de la ligne 1" }]);
  });

  it("keeps the first 200 words and reports the rest", () => {
    const text = Array.from({ length: 203 }, (_, i) => `mot${i}`).join("\n");
    const { entries, errors } = parseVocabularyPaste(text);
    expect(entries).toHaveLength(200);
    expect(errors.map((e) => e.line)).toEqual([201, 202, 203]);
    expect(errors[0].reason).toMatch(/200 mots/);
  });

  it("returns nothing for an empty paste", () => {
    expect(parseVocabularyPaste("")).toEqual({ entries: [], errors: [] });
  });
});

describe("markExisting", () => {
  it("flags the words the user already has in that language only", () => {
    const entries = [{ term: "Ciao" }, { term: "grazie" }, { term: "nuovo" }];
    const existing = [
      { language: "it" as const, term: " ciao " },
      { language: "ru" as const, term: "grazie" },
    ];
    expect(markExisting(entries, existing, "it").map((e) => e.existing)).toEqual([true, false, false]);
    expect(markExisting(entries, existing, "ru").map((e) => e.existing)).toEqual([false, true, false]);
  });
});
