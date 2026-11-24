import { getUnit } from "@dailylingua/content";
import type { SituationUnit } from "@dailylingua/schemas";
import { gradeUnitItem } from "@dailylingua/core";
import { describe, expect, it } from "vitest";
import { currentLessonNumber, firstOpenStep, flatSteps, matchRightOrder, misplacedTiles, orderTiles, seededShuffle, sentenceOf, serializeMatch, unitFinished, unitStarted } from "./flow";
import { segmentLine } from "./words";

const it1 = getUnit("it-a1-01-saluer") as SituationUnit;
const ru1 = getUnit("ru-a1-01-saluer") as SituationUnit;
const progress = (steps: string[], passedAt: string | null = null) => ({
  steps: Object.fromEntries(steps.map((key) => [key, "2026-11-23T10:00:00Z"])),
  bestScore: null,
  testAttempts: 0,
  passedAt,
});

describe("lesson resume", () => {
  it("lists the six steps of the three lessons in order", () => {
    expect(flatSteps(it1).map((step) => step.key)).toEqual(["l1:dialogue", "l1:key_phrases", "l2:grammar", "l2:exercises", "l3:conversation", "l3:test"]);
  });

  it("starts at the first step the server has not validated", () => {
    expect(firstOpenStep(it1, null)).toBe(0);
    expect(firstOpenStep(it1, progress(["l1:dialogue"]))).toBe(1);
    expect(firstOpenStep(it1, progress(["l1:dialogue", "l1:key_phrases"]))).toBe(2);
    expect(currentLessonNumber(it1, progress(["l1:dialogue", "l1:key_phrases"]))).toBe(2);
    // A hole in the records (a later step done, an earlier one not): the earlier one is next.
    expect(firstOpenStep(it1, progress(["l1:key_phrases"]))).toBe(0);
  });

  it("treats the test as done only once passed, and starts a finished unit over", () => {
    const all = ["l1:dialogue", "l1:key_phrases", "l2:grammar", "l2:exercises", "l3:conversation"];
    expect(firstOpenStep(it1, progress(all))).toBe(5);
    expect(unitFinished(it1, progress(all))).toBe(false);
    expect(unitFinished(it1, progress(all, "2026-11-23T11:00:00Z"))).toBe(true);
    expect(firstOpenStep(it1, progress(all, "2026-11-23T11:00:00Z"))).toBe(0);
    expect(unitStarted(it1, null)).toBe(false);
    expect(unitStarted(it1, progress(["l1:dialogue"]))).toBe(true);
  });
});

describe("item helpers", () => {
  it("builds the order tiles, stable and complete, and the sentence the grader reads", () => {
    const item = it1.items.find((entry) => entry.kind === "order")!;
    if (item.kind !== "order") throw new Error("order expected");
    const tiles = orderTiles(item);
    expect(orderTiles(item)).toEqual(tiles);
    expect(tiles.map((tile) => tile.text).sort()).toEqual([...item.tokens, ...item.distractors].sort());
    const built = item.answer.split(" ").map((word) => tiles.find((tile) => tile.text === word.replace(/[?.!]+$/u, ""))!);
    expect(gradeUnitItem(it1.language, item, sentenceOf(built)).correct).toBe(true);
    const swapped = [built[1]!, built[0]!, ...built.slice(2)];
    expect(gradeUnitItem(it1.language, item, sentenceOf(swapped)).correct).toBe(false);
    expect([...misplacedTiles(item, swapped)].sort()).toEqual([built[0]!.id, built[1]!.id].sort());
  });

  it("serialises a pairing the way the grader expects", () => {
    const item = it1.items.find((entry) => entry.kind === "match")!;
    if (item.kind !== "match") throw new Error("match expected");
    const right = Object.fromEntries(item.pairs.map((_, index) => [index, index]));
    expect(gradeUnitItem(it1.language, item, serializeMatch(right)).correct).toBe(true);
    const swapped = { ...right, 0: 1, 1: 0 };
    expect(gradeUnitItem(it1.language, item, serializeMatch(swapped)).correct).toBe(false);
    expect([...matchRightOrder(item)].sort()).toEqual(item.pairs.map((_, index) => index));
  });

  it("never returns a shuffle equal to the input", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) expect(seededShuffle([1, 2, 3], seed)).not.toEqual([1, 2, 3]);
  });
});

describe("tappable words", () => {
  it("cuts a line around the glossed words and keeps the text whole", () => {
    const line = it1.dialogue.lines[0]!;
    const segments = segmentLine(line.text, it1.dialogue.glosses);
    expect(segments.map((segment) => segment.text).join("")).toBe(line.text);
    expect(segments.filter((segment) => segment.gloss).length).toBeGreaterThan(2);
    expect(segments.find((segment) => segment.gloss?.form === "ciao")?.text).toBe("Ciao");
  });

  it("matches a Russian form with or without the stress mark, and not inside a longer word", () => {
    const gloss = { form: "привет", lemma: "привет", meaning: { fr: "salut", en: "hi" }, note: null, isNew: true };
    const stressed = String.fromCharCode(0x438, 0x301);
    const text = `Прив${stressed.slice(1)}`;
    expect(text).toBeTruthy();
    const marked = "Приве" + String.fromCharCode(0x301) + "т! приветик";
    const segments = segmentLine(marked, [gloss]);
    expect(segments.filter((segment) => segment.gloss).map((segment) => segment.text)).toEqual(["Приве" + String.fromCharCode(0x301) + "т"]);
    expect(segmentLine(ru1.dialogue.lines[0]!.text, ru1.dialogue.glosses).some((segment) => segment.gloss)).toBe(true);
  });
});
