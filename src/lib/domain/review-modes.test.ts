import { describe, expect, it } from "vitest";
import {
  checkTypedAnswer,
  chooseReviewMode,
  clozeSentence,
  gradeForCheck,
  retentionByMode,
} from "./review-modes";
import type { Language } from "@/lib/schemas/common";

const TODAY = "2026-10-23";

function word(overrides: Partial<{ id: string; language: Language; term: string; translation: string; example: string; box: number }> = {}) {
  const { box = 0, ...rest } = overrides;
  return {
    id: "w1",
    language: "it" as Language,
    term: "il giardino",
    translation: "le jardin",
    example: undefined as string | undefined,
    review: { box },
    ...rest,
  };
}

describe("clozeSentence", () => {
  it("cuts the example around the first occurrence, whatever the case", () => {
    const item = word({ term: "giardino", example: "Il Giardino è grande, il giardino è bello." });
    expect(clozeSentence(item)).toEqual({ before: "Il ", after: " è grande, il giardino è bello." });
  });

  it("works without spaces", () => {
    expect(clozeSentence(word({ language: "ja", term: "猫", example: "私は猫が好きです。" }))).toEqual({
      before: "私は",
      after: "が好きです。",
    });
  });

  it("ignores stress marks in Russian", () => {
    const item = word({ language: "ru", term: "впро́чем", example: "Впрочем, это уже друго́е." });
    expect(clozeSentence(item)).toEqual({ before: "", after: ", это уже друго́е." });
    expect(clozeSentence(word({ language: "ru", term: "друго́е", example: "Это уже другое." }))).toEqual({
      before: "Это уже ",
      after: ".",
    });
  });

  it("is null without an example or when the term is not in it", () => {
    expect(clozeSentence(word())).toBeNull();
    expect(clozeSentence(word({ term: "casa", example: "Vado a scuola." }))).toBeNull();
  });
});

describe("chooseReviewMode", () => {
  it("only flips new words", () => {
    expect(chooseReviewMode(word({ box: 0 }), TODAY, { canListen: true })).toBe("flip");
  });

  it("stays within the modes of the box", () => {
    const withCloze = (box: number, id: string) => word({ id, box, term: "casa", example: "La casa è bella." });
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) seen.add(chooseReviewMode(withCloze(2, `w${i}`), TODAY, { canListen: true }));
    expect([...seen].sort()).toEqual(["cloze", "listen", "translate"]);
    const high = new Set<string>();
    for (let i = 0; i < 60; i++) high.add(chooseReviewMode(withCloze(5, `w${i}`), TODAY, { canListen: true }));
    expect([...high].sort()).toEqual(["cloze", "listen", "produce"]);
  });

  it("is stable for a word within the day", () => {
    const item = word({ box: 2, term: "casa", example: "La casa è bella." });
    const first = chooseReviewMode(item, TODAY, { canListen: true });
    for (let i = 0; i < 5; i++) expect(chooseReviewMode(item, TODAY, { canListen: true })).toBe(first);
  });

  it("drops listen without a voice and cloze without a sentence", () => {
    for (let i = 0; i < 30; i++) {
      expect(chooseReviewMode(word({ id: `w${i}`, box: 2 }), TODAY, { canListen: false })).toBe("translate");
      expect(chooseReviewMode(word({ id: `w${i}`, box: 5 }), TODAY, { canListen: false })).toBe("produce");
    }
  });

  it("honours a fixed mode, falling back to translate when impossible", () => {
    expect(chooseReviewMode(word(), TODAY, { canListen: true, fixed: "produce" })).toBe("produce");
    expect(chooseReviewMode(word(), TODAY, { canListen: true, fixed: "flip" })).toBe("flip");
    expect(chooseReviewMode(word(), TODAY, { canListen: false, fixed: "listen" })).toBe("translate");
    expect(chooseReviewMode(word(), TODAY, { canListen: true, fixed: "cloze" })).toBe("translate");
  });
});

describe("checkTypedAnswer", () => {
  const item = word({ term: "il giardino", translation: "le jardin, le parc (public) / verger" });

  it("accepts each sense of a translation, with or without article", () => {
    for (const answer of ["le jardin", "jardin", "Parc", "un parc", "verger", "  Le Jardin. "]) {
      expect(checkTypedAnswer("translate", item, answer)).toBe("right");
    }
  });

  it("accepts the reflexive on either side", () => {
    const reflexive = word({ translation: "se souvenir" });
    expect(checkTypedAnswer("translate", reflexive, "souvenir")).toBe("right");
    expect(checkTypedAnswer("translate", word({ translation: "souvenir" }), "se souvenir")).toBe("right");
    expect(checkTypedAnswer("translate", word({ translation: "l’eau" }), "eau")).toBe("right");
  });

  it("grades accents and one-letter slips as close", () => {
    expect(checkTypedAnswer("translate", word({ translation: "été" }), "ete")).toBe("close");
    expect(checkTypedAnswer("translate", word({ translation: "jardin" }), "jardn")).toBe("close");
    expect(checkTypedAnswer("translate", word({ translation: "jardin" }), "jardine")).toBe("close");
  });

  it("does not forgive a slip in a short word", () => {
    expect(checkTypedAnswer("translate", word({ translation: "chat" }), "chut")).toBe("wrong");
  });

  it("grades empty and wrong answers as wrong", () => {
    expect(checkTypedAnswer("translate", item, "")).toBe("wrong");
    expect(checkTypedAnswer("translate", item, "  ")).toBe("wrong");
    expect(checkTypedAnswer("translate", item, "maison")).toBe("wrong");
  });

  it("checks the term for produce, listen and cloze", () => {
    for (const mode of ["produce", "listen", "cloze"] as const) {
      expect(checkTypedAnswer(mode, item, "Il Giardino")).toBe("right");
      expect(checkTypedAnswer(mode, item, "il giardin")).toBe("close");
      expect(checkTypedAnswer(mode, item, "la casa")).toBe("wrong");
    }
  });

  it("accepts a part of a term written 'a / b'", () => {
    const pair = word({ term: "gentile / cortese" });
    expect(checkTypedAnswer("produce", pair, "cortese")).toBe("right");
  });

  it("ignores stress marks and ё for Russian", () => {
    const ru = word({ language: "ru", term: "мир", translation: "monde" });
    expect(checkTypedAnswer("produce", ru, "мир")).toBe("right");
    expect(checkTypedAnswer("produce", word({ language: "ru", term: "ёлка" }), "елка")).toBe("right");
  });
});

describe("gradeForCheck", () => {
  it("maps the result to a grade", () => {
    expect(gradeForCheck("right")).toBe("good");
    expect(gradeForCheck("close")).toBe("hard");
    expect(gradeForCheck("wrong")).toBe("again");
  });
});

describe("retentionByMode", () => {
  it("counts only reviews made at least 7 days after the previous one", () => {
    const stats = retentionByMode([
      { mode: "translate", grade: "good", daysSinceLast: 8 },
      { mode: "translate", grade: "again", daysSinceLast: 7 },
      { mode: "translate", grade: "again", daysSinceLast: 6 },
      { mode: "flip", grade: "easy", daysSinceLast: 16 },
      { mode: "flip", grade: "hard", daysSinceLast: null },
    ]);
    expect(stats.byMode.translate).toEqual({ reviews: 2, recalled: 1 });
    expect(stats.byMode.flip).toEqual({ reviews: 1, recalled: 1 });
    expect(stats.byMode.cloze).toEqual({ reviews: 0, recalled: 0 });
    expect(stats.total).toEqual({ reviews: 3, recalled: 2 });
  });
});
