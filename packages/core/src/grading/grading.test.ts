import { describe, expect, it } from "vitest";
import {
  cardRecallVariant,
  characterSimilarity,
  countWords,
  gradeCardRecall,
  gradeChoice,
  gradeTyped,
  normalizeAnswer,
  normalizeTypedText,
  ratingFor,
  stripDiacritics,
  trigramSimilarity,
} from "./index";

describe("normalizeTypedText", () => {
  it("makes the case, spaces, apostrophe and final punctuation irrelevant", () => {
    expect(normalizeTypedText("  L’Amico   è qui… ")).toBe("l'amico è qui");
    expect(normalizeTypedText("¿Cómo estás?")).toBe("cómo estás");
    expect(normalizeTypedText("Τι κάνεις;")).toBe("τι κάνεις");
    expect(normalizeTypedText("你好。")).toBe("你好");
  });

  it("composes decomposed letters", () => {
    expect(normalizeTypedText("é")).toBe("é");
  });
});

describe("normalizeAnswer", () => {
  it("lower-cases with the language's own rules", () => {
    expect(normalizeAnswer("tr", "IŞIK")).toBe("ışık");
  });

  it("drops the stress mark and ё in Russian and Ukrainian", () => {
    expect(normalizeAnswer("ru", "сло́во")).toBe("слово");
    expect(normalizeAnswer("ru", "Всё")).toBe("все");
    expect(normalizeAnswer("fr", "é")).toBe("é");
  });

  it("drops the spaces of Chinese and Japanese and the harakat of Arabic", () => {
    expect(normalizeAnswer("zh", "你 好")).toBe("你好");
    expect(normalizeAnswer("ja", "こん にちは")).toBe("こんにちは");
    expect(normalizeAnswer("ar", "كَتَبَ")).toBe("كتب");
  });

  it("falls back to the common part for a language outside the registry", () => {
    expect(normalizeAnswer("xx", "  HELLO. ")).toBe("hello");
  });
});

describe("stripDiacritics", () => {
  it("removes the combining marks", () => {
    expect(stripDiacritics("été ñandú")).toBe("ete nandu");
  });
});

describe("gradeTyped", () => {
  const grade = (answer: string, accept: string[], extra: Partial<Parameters<typeof gradeTyped>[0]> = {}) =>
    gradeTyped({ language: "it", kind: "short_answer", answer, accept, ...extra });

  it("accepts any listed form after normalisation, case and spaces apart", () => {
    expect(grade(" CASA. ", ["casa"])).toEqual({ verdict: "correct", correct: true, shown: null });
    expect(grade("la casa", ["casa", "la casa"]).verdict).toBe("correct");
  });

  it("calls a diacritics-only slip 'almost', counted right, and shows the good spelling", () => {
    expect(grade("perche", ["perché"])).toEqual({ verdict: "almost", correct: true, shown: "perché" });
    expect(gradeTyped({ language: "fr", kind: "cloze", answer: "ete", accept: ["été"] }).verdict).toBe("almost");
  });

  it("counts the same slip wrong under the strict accent setting", () => {
    expect(grade("perche", ["perché"], { tolerance: "strict" })).toEqual({ verdict: "almost", correct: false, shown: "perché" });
  });

  it("treats a typo as wrong and shows the first accepted form", () => {
    expect(grade("cazza", ["casa", "la casa"])).toEqual({ verdict: "wrong", correct: false, shown: "casa" });
  });

  it("refuses an empty answer", () => {
    expect(grade("  ", ["casa"]).verdict).toBe("wrong");
    expect(grade("...", ["casa"]).verdict).toBe("wrong");
  });

  it("folds the German digraphs (ä/ae, ö/oe, ü/ue, ß/ss) and plain diacritics", () => {
    const de = (answer: string, accept: string[]) => gradeTyped({ language: "de", kind: "short_answer", answer, accept });
    expect(de("Maedchen", ["Mädchen"]).verdict).toBe("almost");
    expect(de("Madchen", ["Mädchen"]).verdict).toBe("almost");
    expect(de("Strasse", ["Straße"]).verdict).toBe("almost");
    expect(de("schoen", ["schön"]).verdict).toBe("almost");
    expect(de("Mädchen", ["mädchen"]).verdict).toBe("correct");
    expect(de("Madchen", ["Mädel"]).verdict).toBe("wrong");
  });

  it("does not fold the digraphs outside German", () => {
    expect(gradeTyped({ language: "fr", kind: "short_answer", answer: "ae", accept: ["ä"] }).verdict).toBe("wrong");
  });

  it("ignores inner punctuation for cloze and short_answer, hyphens and contractions' apostrophes aside", () => {
    expect(gradeTyped({ language: "fr", kind: "short_answer", answer: "peut être", accept: ["peut-être"] }).verdict).toBe("correct");
    expect(gradeTyped({ language: "fr", kind: "cloze", answer: "bonjour, monsieur", accept: ["bonjour monsieur"] }).verdict).toBe("correct");
    expect(gradeTyped({ language: "fr", kind: "cloze", answer: "l’homme", accept: ["l'homme"] }).verdict).toBe("correct");
    expect(gradeTyped({ language: "fr", kind: "cloze", answer: "l homme", accept: ["l'homme"] }).verdict).toBe("wrong");
  });

  it("ignores commas and dashes but not word order for transform", () => {
    const t = (answer: string, accept: string[]) => gradeTyped({ language: "fr", kind: "transform", answer, accept });
    expect(t("Hier, il est parti.", ["Hier il est parti"]).verdict).toBe("correct");
    expect(t("Mets-le ici", ["mets le ici"]).verdict).toBe("correct");
    expect(t("Il est hier parti", ["Hier il est parti"]).verdict).toBe("wrong");
    expect(t("Hier: il est parti", ["Hier il est parti"]).verdict).toBe("wrong");
  });

  it("compares Chinese without spaces and Russian without stress", () => {
    expect(gradeTyped({ language: "zh", kind: "cloze", answer: "你好，世界", accept: ["你好世界"] }).verdict).toBe("correct");
    expect(gradeTyped({ language: "ru", kind: "short_answer", answer: "слово", accept: ["сло́во"] }).verdict).toBe("correct");
  });
});

describe("gradeChoice", () => {
  it("compares the id of the option with the key", () => {
    expect(gradeChoice("o2", "o2").correct).toBe(true);
    expect(gradeChoice("o1", "o2")).toEqual({ verdict: "wrong", correct: false, shown: null });
    expect(gradeChoice("o1", null).correct).toBe(false);
  });
});

describe("ratingFor", () => {
  const correct = { verdict: "correct", correct: true, shown: null } as const;
  it("rates a right answer Good, or Easy when under 40 % of the median time", () => {
    expect(ratingFor(correct, { elapsedMs: 3000 })).toBe(3);
    expect(ratingFor(correct, { elapsedMs: 3000, medianMs: 6000 })).toBe(3);
    expect(ratingFor(correct, { elapsedMs: 2399, medianMs: 6000 })).toBe(4);
    expect(ratingFor(correct, { elapsedMs: 2400, medianMs: 6000 })).toBe(3);
  });

  it("rates 'almost' Hard under the lenient tolerance and Again under the strict one, wrong Again", () => {
    expect(ratingFor({ verdict: "almost", correct: true, shown: "x" }, { elapsedMs: 100, medianMs: 6000 })).toBe(2);
    expect(ratingFor({ verdict: "almost", correct: false, shown: "x" }, { elapsedMs: 100 })).toBe(1);
    expect(ratingFor({ verdict: "wrong", correct: false, shown: null }, { elapsedMs: 100 })).toBe(1);
  });
});

describe("gradeCardRecall", () => {
  it("grades a recognition by the option id and a production by the accepted forms", () => {
    expect(gradeCardRecall({ language: "it", mode: "recognition", answer: "o3", key: { optionId: "o3", accept: [] } }).correct).toBe(true);
    expect(gradeCardRecall({ language: "it", mode: "recognition", answer: "o1", key: { optionId: "o3", accept: [] } }).correct).toBe(false);
    expect(gradeCardRecall({ language: "it", mode: "production", answer: "Casa", key: { optionId: null, accept: ["casa"] } }).correct).toBe(true);
    expect(gradeCardRecall({ language: "it", mode: "listening", answer: "case", key: { optionId: null, accept: ["casa"] } }).correct).toBe(false);
  });

  it("never counts a recognition without a key", () => {
    expect(gradeCardRecall({ language: "it", mode: "recognition", answer: "", key: { optionId: null, accept: ["casa"] } }).correct).toBe(false);
  });
});

describe("cardRecallVariant", () => {
  it("climbs from recognition to translation to cloze with stability", () => {
    expect(cardRecallVariant({ stability: null, hasContext: true })).toEqual({ mode: "recognition", variant: "recognize" });
    expect(cardRecallVariant({ stability: 2.9, hasContext: true }).variant).toBe("recognize");
    expect(cardRecallVariant({ stability: 3, hasContext: true }).variant).toBe("translate");
    expect(cardRecallVariant({ stability: 10, hasContext: true }).variant).toBe("translate");
    expect(cardRecallVariant({ stability: 10.1, hasContext: true })).toEqual({ mode: "production", variant: "cloze" });
    expect(cardRecallVariant({ stability: 30, hasContext: false }).variant).toBe("translate");
  });
});

describe("countWords", () => {
  it("counts tokens, and characters over the factor where words are not separated", () => {
    expect(countWords("it", "Ciao, come stai? Bene!")).toBe(4);
    expect(countWords("fr", "aujourd'hui, c'est lundi")).toBe(5);
    expect(countWords("zh", "你好，我是学生。")).toBe(Math.floor(6 / 1.7));
    expect(countWords("ja", "ありがとうございます")).toBe(Math.floor(10 / 2.5));
    expect(countWords("it", "")).toBe(0);
  });
});

describe("trigramSimilarity", () => {
  const text = "Ieri sono andata al mercato con mia sorella e abbiamo comprato frutta e verdura fresca";
  it("is 1 for the same text whatever the case and punctuation, 0 for unrelated texts", () => {
    expect(trigramSimilarity("it", text, text.toUpperCase() + "!")).toBe(1);
    expect(trigramSimilarity("it", text, "Oggi piove molto e resto a casa a leggere un libro interessante")).toBe(0);
  });

  it("falls with the part of the text that is changed", () => {
    const half = "Ieri sono andata al mercato con mia sorella ma poi abbiamo deciso di tornare a casa subito";
    const value = trigramSimilarity("it", text, half);
    expect(value).toBeGreaterThan(0.1);
    expect(value).toBeLessThan(0.5);
  });

  it("copes with empty and very short texts", () => {
    expect(trigramSimilarity("it", "", "")).toBe(0);
    expect(trigramSimilarity("it", "ciao", "ciao")).toBe(1);
  });

  it("compares characters for unspaced scripts", () => {
    expect(trigramSimilarity("zh", "我今天去了市场买水果", "我今天去了市场买水果")).toBe(1);
  });
});

describe("characterSimilarity", () => {
  it("is 1 for the same sentence and falls with edits", () => {
    expect(characterSimilarity("it", "Ho mangiato la mela.", "ho mangiato la mela")).toBe(1);
    expect(characterSimilarity("it", "Ho mangiato la mela", "Ho mangiata la mela")).toBeGreaterThan(0.9);
    expect(characterSimilarity("it", "Ho mangiato la mela", "Domani vado al mare")).toBeLessThan(0.5);
    expect(characterSimilarity("it", "", "")).toBe(1);
  });
});
