import { describe, expect, it } from "vitest";
import { readerWords } from "./words";

describe("readerWords", () => {
  const entry = { lemma: "mercato", dictionaryForm: "mercato", definition: "Luogo di vendita.", sentence: 1 };
  const body = "Il mercato è chiuso.\n\nDomani torno al mercato.";

  it("uses the saved sentence index and preserves the original offsets and context", () => {
    const [word] = readerWords(body, [{ ...entry, glosses: { fr: "marché" } }], "it", "fr");
    expect(word).toMatchObject({ from: body.lastIndexOf("mercato"), meaning: "marché", meaningLanguage: "fr", context: "Domani torno al mercato." });
    expect(body.slice(word!.from, word!.to)).toBe("mercato");
  });

  it("uses the original definition for an existing entry without a translation", () => {
    expect(readerWords(body, [entry], "it", "en")).toMatchObject([{ meaning: "Luogo di vendita.", meaningLanguage: "it" }]);
  });

  it("uses the attested inflected form and ignores entries outside the published sentence", () => {
    const text = "I mercati sono aperti.";
    expect(readerWords(text, [
      { ...entry, sentence: 0, forms: ["mercati"] },
      { ...entry, lemma: "aperti", dictionaryForm: "aperti" },
    ], "it", "fr")).toMatchObject([{ front: "mercato", from: 2, to: 9 }]);
  });
});
