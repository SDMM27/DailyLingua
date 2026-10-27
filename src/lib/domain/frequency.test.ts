import { describe, expect, it } from "vitest";
import { loadFrequencyRanks } from "@/lib/frequency";
import type { Language } from "@/lib/schemas/common";
import {
  COVERAGE_TARGETS,
  MAX_COVERAGE_PENALTY,
  buildRanks,
  coveragePenalty,
  coverageTarget,
  frequentWords,
  lexicalCoverage,
  normalizeWord,
} from "./frequency";
import { LANGUAGE_CODES } from "./languages";

/** Ranks built from a hand-written list: the first form is rank 1. */
const ranks = (language: Language, forms: string[]) => buildRanks(language, forms);

describe("buildRanks / normalizeWord", () => {
  it("lowercases with the language's rules and skips duplicates", () => {
    const tr = ranks("tr", ["ılık", "ILIK", "İstanbul", "istanbul"]);
    expect([...tr.entries()]).toEqual([
      ["ılık", 1],
      ["istanbul", 2],
    ]);
  });

  it("matches whatever the stress marks, ё and the Arabic short vowels", () => {
    expect(normalizeWord("ru", "сло́во")).toBe(normalizeWord("ru", "слово"));
    expect(normalizeWord("ru", "всё")).toBe("все");
    expect(normalizeWord("ar", "كَتَبَ")).toBe("كتب");
  });

  it("writes the Greek final sigma as wordfreq does", () => {
    expect(normalizeWord("el", "της")).toBe("τησ");
  });
});

describe("lexicalCoverage", () => {
  const it_ = ranks("it", ["il", "la", "di", "e", "un", "è", "in", "che", "casa", "grande", "mangio", "pane"]);

  it("is the share of the words among the top N", () => {
    const text = "La casa è grande e il pane è buono";
    // 9 words, "buono" is the only one out of the list.
    expect(lexicalCoverage("it", text, it_, 100)).toBeCloseTo(8 / 9);
    // The top 2 holds "il" and "la": two of the nine words.
    expect(lexicalCoverage("it", text, it_, 2)).toBeCloseTo(2 / 9);
  });

  it("is null under 8 counted words", () => {
    expect(lexicalCoverage("it", "La casa è grande e il pane", it_, 100)).toBeNull();
    expect(lexicalCoverage("it", "", it_, 100)).toBeNull();
  });

  it("ignores numbers and proper names in the middle of a sentence", () => {
    // 9 words count; "Mario", "Roma" and 2026 are left out, and "a" is the only one not in the list.
    const text = "La casa di Mario a Roma è grande e il pane 2026";
    expect(lexicalCoverage("it", text, it_, 100)).toBeCloseTo(8 / 9);
  });

  it("keeps the capitalised first word of every sentence", () => {
    const text = "Casa grande. Pane grande! Casa è un pane. La casa";
    // 12 words, all in the list but none ignored although capitalised.
    expect(lexicalCoverage("it", text, it_, 100)).toBe(1);
  });

  it("looks up an elision by what follows the apostrophe", () => {
    const list = ranks("it", ["la", "casa", "è", "grande", "un", "pane", "e", "casa", "amico"]);
    expect(lexicalCoverage("it", "L’amico è un pane e la casa è grande", list, 100)).toBe(1);
  });

  it("keeps capitalised common nouns in German", () => {
    const de = ranks("de", ["der", "ist", "und", "das", "haus", "groß", "hund", "klein"]);
    const text = "Das Haus ist groß und der Hund ist klein";
    expect(lexicalCoverage("de", text, de, 100)).toBe(1);
    // Same shape in Italian: "Haus" and "Hund" would be taken for names and left out of the 8 words.
    expect(lexicalCoverage("it", text, it_, 100)).toBeNull();
  });
});

describe("lexicalCoverage by script", () => {
  const cases: [Language, string][] = [
    ["ru", "Сегодня я иду в школу, потому что у меня есть урок русского языка."],
    ["uk", "Сьогодні я йду до школи, тому що в мене є урок української мови."],
    ["el", "Σήμερα πηγαίνω στο σχολείο γιατί έχω μάθημα ελληνικών και μετά θα γυρίσω σπίτι."],
    ["ar", "أنا أحب أن أشرب القهوة في الصباح مع أصدقائي قبل أن أذهب إلى العمل."],
    ["zh", "我今天要去学校，因为我有一节中文课，下午我会回家吃饭。"],
    ["ja", "私は毎日学校に行きます。そして、友達と一緒に昼ご飯を食べます。"],
    ["ko", "저는 매일 학교에 가요. 그리고 친구와 같이 점심을 먹어요."],
    ["tr", "Bugün okula gidiyorum çünkü bir Türkçe dersim var ve sonra eve döneceğim."],
    ["pl", "Dzisiaj idę do szkoły, ponieważ mam lekcję polskiego i potem wracam do domu."],
  ];

  it.each(cases)("%s: segments the sentence into at least 8 words and measures it", async (language, text) => {
    const list = await loadFrequencyRanks(language);
    const coverage = lexicalCoverage(language, text, list, 5000);
    expect(coverage).not.toBeNull();
    // Everyday sentences: a good part of the words are in the 5000 most frequent forms (Korean
    // particles are glued to the words, wordfreq lists them apart: its measure is the lowest).
    expect(coverage!).toBeGreaterThan(language === "ko" ? 0.3 : 0.5);
    expect(coverage!).toBeLessThanOrEqual(1);
  });

  it("gives a lower coverage with a smaller top", async () => {
    const list = await loadFrequencyRanks("ru");
    const text = cases.find(([l]) => l === "ru")![1];
    expect(lexicalCoverage("ru", text, list, 100)!).toBeLessThan(lexicalCoverage("ru", text, list, 5000)!);
  });

  it("does not ignore anything in a script without case", () => {
    const list = ranks("zh", ["我是", "学生", "他是", "老师", "我", "也是", "他", "好"]);
    expect(lexicalCoverage("zh", "我是学生他是老师我也是学生他也是老师", list, 100)).toBe(1);
  });
});

describe("frequentWords", () => {
  const list = ranks("it", ["il", "la", "di", "casa", "grande", "pane"]);

  it("lists the distinct frequent words in reading order, at most max", () => {
    const text = "La casa grande, la casa nuova di Mario e il pane";
    expect(frequentWords("it", text, list, 100, 10)).toEqual(["la", "casa", "grande", "di", "il", "pane"]);
    expect(frequentWords("it", text, list, 100, 2)).toEqual(["la", "casa"]);
    expect(frequentWords("it", text, list, 4, 10)).toEqual(["la", "casa", "di", "il"]);
  });
});

describe("coverage targets", () => {
  it("has a target for every language at A1 and A2, none above", () => {
    for (const code of LANGUAGE_CODES) {
      expect(COVERAGE_TARGETS[code].A1).toEqual({ top: 1000, share: 0.9 });
      expect(coverageTarget(code, "A2")).toEqual({ top: 2000, share: 0.9 });
      expect(coverageTarget(code, "B1")).toBeNull();
    }
  });

  it("penalises the gap, up to 6 points, and half of it when the text is too short", () => {
    const target = { top: 1000, share: 0.9 };
    expect(coveragePenalty(0.95, target)).toBe(0);
    expect(coveragePenalty(0.9, target)).toBe(0);
    expect(coveragePenalty(0.45, target)).toBeCloseTo(MAX_COVERAGE_PENALTY / 2);
    expect(coveragePenalty(0, target)).toBe(MAX_COVERAGE_PENALTY);
    expect(coveragePenalty(null, target)).toBe(MAX_COVERAGE_PENALTY / 2);
    expect(MAX_COVERAGE_PENALTY + 3).toBeLessThan(10); // with the learner-source bonus
  });
});

describe("frequency lists", () => {
  it.each(LANGUAGE_CODES)("%s: 5000 forms, ranked", async (code) => {
    const list = await loadFrequencyRanks(code);
    expect(list.size).toBeGreaterThan(4500);
    expect(list.size).toBeLessThanOrEqual(5000);
    expect([...list.values()].slice(0, 3)).toEqual([1, 2, 3]);
  });
});
