import { describe, expect, it } from "vitest";
import { readerCardLemma, readerWords } from "./words";

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

  it("resolves forms to their editorial lemma and withholds ambiguous or edited source spans", () => {
    const text = "I mercati sono aperti.";
    const inflected = { ...entry, sentence: 0, forms: ["mercati"] };
    const card = { from: 2, front: "mercato", context: text };
    expect(readerCardLemma(text, [inflected], "it", card)).toEqual({ lemma: "mercato", definition: entry.definition });
    expect(readerCardLemma(text, [inflected], "it", { ...card, context: body })).toBeNull();
    expect(readerCardLemma(text, [inflected, { ...inflected, definition: "Insieme delle vendite." }], "it", card)).toBeNull();
    const russian = "Я покупаю продукты.";
    expect(readerCardLemma(russian, [{
      lemma: "проду́кт", dictionaryForm: "проду́кт", forms: ["продукты"], definition: "Пища.", sentence: 0,
    }], "ru", { from: 10, front: "проду́кт", context: russian })).toMatchObject({ lemma: "продукт" });
  });

  it("uses a comparison only for its editorial sense and a language the learner knows", () => {
    const text = "C'è ancora burro.";
    const butter = {
      lemma: "burro", dictionaryForm: "burro", definition: "Alimento a base di latte.",
      sentence: 0, comparisonId: "es-it-burro-butter",
    };
    expect(readerWords(text, [butter], "it", "fr")[0]?.comparison).toBeUndefined();
    expect(readerWords(text, [butter], "it", "fr", ["es"])[0]?.comparison).toMatchObject({
      kind: "falseFriend", sourceLanguage: "es", sourceMeaning: { text: "âne", language: "fr" },
    });
    expect(readerWords(text, [butter], "it", "es")[0]?.comparison).toMatchObject({
      sourceMeaning: { text: "asno", language: "es" },
    });
    const wrongSense = { ...butter, comparisonId: "es-it-importante-significant" };
    expect(readerWords(text, [wrongSense], "it", "fr", ["es"])[0]?.comparison).toBeUndefined();
  });
});
