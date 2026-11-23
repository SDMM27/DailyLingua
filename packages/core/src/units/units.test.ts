import type { Unit, UnitItem } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { gradeUnitItem, gradeUnitTest, stepValidated } from "./grade";

const l10n = { fr: "fr", en: "en" };
const explain = l10n;

const mcq: UnitItem = {
  id: "q1",
  kind: "mcq",
  prompt: "Ciao ?",
  options: [
    { id: "a", text: "Salut" },
    { id: "b", text: "Merci" },
  ],
  answer: "a",
  audio: null,
  explain,
};
const listen: UnitItem = { ...mcq, id: "q2", kind: "listen_mcq", audio: "it/q2.mp3", audioText: "Ciao" };
const order: UnitItem = {
  id: "q3",
  kind: "order",
  prompt: l10n,
  tokens: ["Come", "ti", "chiami", "?"],
  distractors: ["sei"],
  answer: "Come ti chiami?",
  accept: ["Ti chiami come?"],
  explain,
};
const cloze: UnitItem = { id: "q4", kind: "cloze", before: "Io", after: "Anna.", accept: ["sono"], hint: null, explain };
const typed: UnitItem = { id: "q5", kind: "type", prompt: l10n, accept: ["Perché", "Perche"], explain };
const match: UnitItem = {
  id: "q6",
  kind: "match",
  pairs: [
    { left: "ciao", right: l10n },
    { left: "grazie", right: l10n },
    { left: "prego", right: l10n },
  ],
  explain,
};
const ruType: UnitItem = { id: "q7", kind: "type", prompt: l10n, accept: ["Привет"], explain };

describe("gradeUnitItem", () => {
  it("grades a choice by option id, listening included", () => {
    for (const item of [mcq, listen]) {
      expect(gradeUnitItem("it", item, "a")).toEqual({ correct: true, nearMiss: false });
      expect(gradeUnitItem("it", item, "b")).toEqual({ correct: false, nearMiss: false });
      expect(gradeUnitItem("it", item, "Salut")).toEqual({ correct: false, nearMiss: false });
    }
  });

  it("grades an ordering by the sentence rebuilt from the tokens", () => {
    expect(gradeUnitItem("it", order, "Come ti chiami ?").correct).toBe(true);
    expect(gradeUnitItem("it", order, "come ti chiami").correct).toBe(true);
    expect(gradeUnitItem("it", order, "Ti chiami come ?").correct).toBe(true);
    expect(gradeUnitItem("it", order, "Come sei chiami ?").correct).toBe(false);
    expect(gradeUnitItem("it", order, "").correct).toBe(false);
  });

  it("grades a cloze and a typed answer after normalisation", () => {
    expect(gradeUnitItem("it", cloze, " Sono ").correct).toBe(true);
    expect(gradeUnitItem("it", cloze, "sei").correct).toBe(false);
    expect(gradeUnitItem("it", cloze, "").correct).toBe(false);
    expect(gradeUnitItem("it", typed, "perche")).toEqual({ correct: true, nearMiss: false });
    expect(gradeUnitItem("ru", ruType, "привет!").correct).toBe(true);
  });

  it("applies the accent tolerance setting", () => {
    const accent: UnitItem = { id: "q8", kind: "type", prompt: l10n, accept: ["città"], explain };
    expect(gradeUnitItem("it", accent, "citta")).toEqual({ correct: true, nearMiss: true });
    expect(gradeUnitItem("it", accent, "citta", "lenient")).toEqual({ correct: true, nearMiss: true });
    expect(gradeUnitItem("it", accent, "citta", "strict")).toEqual({ correct: false, nearMiss: true });
    expect(gradeUnitItem("it", accent, "città", "strict")).toEqual({ correct: true, nearMiss: false });
    expect(gradeUnitItem("it", accent, "cina", "strict")).toEqual({ correct: false, nearMiss: false });
  });

  it("grades a matching against the identity pairing, whatever the order of the pairs", () => {
    expect(gradeUnitItem("it", match, "0:0,1:1,2:2").correct).toBe(true);
    expect(gradeUnitItem("it", match, "2:2,0:0,1:1").correct).toBe(true);
    expect(gradeUnitItem("it", match, "0:2,1:0,2:1").correct).toBe(false);
    expect(gradeUnitItem("it", match, "0:0,1:1").correct).toBe(false);
    expect(gradeUnitItem("it", match, "0:0,0:0,1:1").correct).toBe(false);
    expect(gradeUnitItem("it", match, "0:0,1:1,3:3").correct).toBe(false);
    expect(gradeUnitItem("it", match, "nonsense").correct).toBe(false);
    expect(gradeUnitItem("it", match, "").correct).toBe(false);
  });
});

const lesson = (id: "l1" | "l2" | "l3", steps: Unit["lessons"][number]["steps"]): Unit["lessons"][number] => ({ id, steps });
const unit = {
  lessons: [
    lesson("l1", [
      { step: "dialogue", itemIds: ["d1", "d2"], threshold: 0 },
      { step: "key_phrases", itemIds: ["k1", "k2"], threshold: 1 },
      { step: "exercises", itemIds: ["e1", "e2", "e3", "e4", "e5"], threshold: 0.6 },
      { step: "grammar", itemIds: ["g1", "g2"], threshold: 0.5 },
      { step: "conversation", itemIds: [], threshold: 1 },
    ]),
    lesson("l2", []),
  ],
} as unknown as Unit;

const tries = (...entries: [string, boolean][]) => entries.map(([itemId, correct]) => ({ itemId, correct }));

describe("stepValidated", () => {
  it("needs the comprehension items answered, right or wrong, when the threshold is 0", () => {
    expect(stepValidated(unit, "l1", "dialogue", tries(["d1", false], ["d2", false]))).toBe(true);
    expect(stepValidated(unit, "l1", "dialogue", tries(["d1", true]))).toBe(false);
    expect(stepValidated(unit, "l1", "dialogue", [])).toBe(false);
  });

  it("requires every key phrase right at a threshold of 1", () => {
    expect(stepValidated(unit, "l1", "key_phrases", tries(["k1", true], ["k2", true]))).toBe(true);
    expect(stepValidated(unit, "l1", "key_phrases", tries(["k1", true], ["k2", false]))).toBe(false);
  });

  it("counts the last try of each item", () => {
    expect(stepValidated(unit, "l1", "key_phrases", tries(["k1", false], ["k2", true], ["k1", true]))).toBe(true);
    expect(stepValidated(unit, "l1", "key_phrases", tries(["k1", true], ["k2", true], ["k1", false]))).toBe(false);
  });

  it("applies the share threshold: 0.6 of 5 is 3, 0.5 of 2 is 1", () => {
    const right = (n: number) => tries(...(["e1", "e2", "e3", "e4", "e5"] as const).map((id, i): [string, boolean] => [id, i < n]));
    expect(stepValidated(unit, "l1", "exercises", right(3))).toBe(true);
    expect(stepValidated(unit, "l1", "exercises", right(2))).toBe(false);
    expect(stepValidated(unit, "l1", "grammar", tries(["g1", true], ["g2", false]))).toBe(true);
    expect(stepValidated(unit, "l1", "grammar", tries(["g1", false], ["g2", false]))).toBe(false);
  });

  it("ignores the attempts of other items", () => {
    expect(stepValidated(unit, "l1", "key_phrases", tries(["x", true], ["k1", true]))).toBe(false);
  });

  it("never validates a step the lesson does not have, and validates one without items", () => {
    expect(stepValidated(unit, "l2", "dialogue", tries(["d1", true], ["d2", true]))).toBe(false);
    expect(stepValidated(unit, "l3", "dialogue", [])).toBe(false);
    expect(stepValidated(unit, "l1", "conversation", [])).toBe(true);
  });
});

/** A unit whose test is the ten `cloze` items `t1` to `t10`, each answered by "ok". */
function testUnit(): Pick<Unit, "language" | "items" | "test"> {
  const items: UnitItem[] = Array.from({ length: 10 }, (_, i) => ({
    id: `t${i + 1}`,
    kind: "cloze",
    before: "",
    after: "",
    accept: ["ok"],
    hint: null,
    explain,
  }));
  return { language: "it", items: [...items, mcq], test: { itemIds: items.map((item) => item.id), passScore: 8 } };
}

const answersFor = (wrong: number[], count = 10) =>
  Array.from({ length: count }, (_, i) => ({ itemId: `t${i + 1}`, answer: wrong.includes(i + 1) ? "no" : "ok" }));

describe("gradeUnitTest", () => {
  const base = testUnit();

  it("scores 10, 8 and 7 against the pass mark of 8", () => {
    expect(gradeUnitTest(base, answersFor([]))).toEqual({ valid: true, score: 10, total: 10, passed: true, missed: [] });
    expect(gradeUnitTest(base, answersFor([2, 9]))).toEqual({ valid: true, score: 8, total: 10, passed: true, missed: ["t2", "t9"] });
    expect(gradeUnitTest(base, answersFor([1, 2, 3]))).toEqual({ valid: true, score: 7, total: 10, passed: false, missed: ["t1", "t2", "t3"] });
  });

  it("counts a missing answer wrong and lists it in the order of the test", () => {
    const result = gradeUnitTest(base, answersFor([5], 9));
    expect(result).toEqual({ valid: true, score: 8, total: 10, passed: true, missed: ["t5", "t10"] });
    expect(gradeUnitTest(base, [])).toMatchObject({ valid: true, score: 0, passed: false });
  });

  it("makes the submission invalid for an item outside the test or a duplicate", () => {
    expect(gradeUnitTest(base, [...answersFor([]), { itemId: "q1", answer: "a" }])).toEqual({ valid: false, reason: "unknown_item", itemId: "q1" });
    expect(gradeUnitTest(base, [...answersFor([]), { itemId: "zz", answer: "a" }])).toMatchObject({ valid: false, reason: "unknown_item" });
    expect(gradeUnitTest(base, [...answersFor([]), { itemId: "t3", answer: "ok" }])).toEqual({ valid: false, reason: "duplicate_item", itemId: "t3" });
  });

  it("follows the accent tolerance", () => {
    const accented = testUnit();
    accented.items = accented.items.map((item) => (item.id === "t1" && item.kind === "cloze" ? { ...item, accept: ["più"] } : item));
    const answers = answersFor([]).map((entry) => (entry.itemId === "t1" ? { ...entry, answer: "piu" } : entry));
    expect(gradeUnitTest(accented, answers, "lenient")).toMatchObject({ score: 10 });
    expect(gradeUnitTest(accented, answers, "strict")).toMatchObject({ score: 9, missed: ["t1"] });
  });
});
