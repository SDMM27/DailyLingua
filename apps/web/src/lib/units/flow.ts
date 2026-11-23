import type { Unit, UnitItem, UnitLessonId, UnitStep } from "@dailylingua/schemas";
import type { UnitProgressView } from "./progress";

/** One step of a unit, in the order the learner meets them. */
export interface FlatStep {
  lesson: UnitLessonId;
  step: UnitStep;
  /** Key of the step in `UnitProgressView.steps`, e.g. `"l1:dialogue"`. */
  key: string;
}

export function stepKey(lesson: UnitLessonId, step: UnitStep): string {
  return `${lesson}:${step}`;
}

/** The steps of the three lessons, in order (six for a situation unit). */
export function flatSteps(unit: Pick<Unit, "lessons">): FlatStep[] {
  return unit.lessons.flatMap((lesson) => lesson.steps.map(({ step }) => ({ lesson: lesson.id, step, key: stepKey(lesson.id, step) })));
}

/** The test has no step event: it is done when the server recorded a pass. */
function stepDone(step: FlatStep, progress: UnitProgressView | null): boolean {
  if (!progress) return false;
  if (step.step === "test") return progress.passedAt !== null;
  return Object.hasOwn(progress.steps, step.key);
}

/** Index of the first step that is not done yet; 0 when the unit is finished (a review starts over). */
export function firstOpenStep(unit: Pick<Unit, "lessons">, progress: UnitProgressView | null): number {
  const index = flatSteps(unit).findIndex((step) => !stepDone(step, progress));
  return index < 0 ? 0 : index;
}

/** Whether every step is done, the test passed. */
export function unitFinished(unit: Pick<Unit, "lessons">, progress: UnitProgressView | null): boolean {
  return flatSteps(unit).every((step) => stepDone(step, progress));
}

/** Whether the learner has done at least one step (the unit is under way). */
export function unitStarted(unit: Pick<Unit, "lessons">, progress: UnitProgressView | null): boolean {
  return flatSteps(unit).some((step) => stepDone(step, progress));
}

/** Number (1 to 3) of the first lesson that still has a step to do; 1 when nothing is recorded or all is done. */
export function currentLessonNumber(unit: Pick<Unit, "lessons">, progress: UnitProgressView | null): number {
  const open = flatSteps(unit)[firstOpenStep(unit, progress)];
  const index = open ? unit.lessons.findIndex((lesson) => lesson.id === open.lesson) : 0;
  return index < 0 ? 1 : index + 1;
}

/**
 * Estimated XP of one item, shown before the server answers (`focus.first_try` 2, `focus.second_try` 1). The server
 * decides: it also applies the daily caps and the "first success of this account" rule, which this cannot know.
 */
export function estimateItemXp(tryNumber: number, correct: boolean): number {
  if (!correct) return 0;
  return tryNumber === 1 ? 2 : tryNumber === 2 ? 1 : 0;
}

/** Deterministic PRNG (mulberry32) seeded from a string, so a shuffle is stable between renders. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shuffled copy of `values`, never in the original order when there is more than one value. */
export function seededShuffle<T>(values: readonly T[], seed: string): T[] {
  const random = seededRandom(seed);
  const result = [...values];
  for (let attempt = 0; attempt < 4; attempt++) {
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    if (result.length < 2 || result.some((value, index) => value !== values[index])) break;
  }
  return result;
}

export interface Tile {
  id: string;
  text: string;
}

/** The tiles of an `order` item (its tokens and its distractors), in a stable shuffled order. */
export function orderTiles(item: Extract<UnitItem, { kind: "order" }>): Tile[] {
  const tiles = [...item.tokens, ...item.distractors].map((text, index) => ({ id: `t${index}`, text }));
  return seededShuffle(tiles, item.id);
}

/** The sentence a learner built from tiles, as `gradeUnitItem` expects it (tokens joined by a space). */
export function sentenceOf(tiles: readonly Tile[]): string {
  return tiles.map((tile) => tile.text).join(" ");
}

const bare = (word: string) => word.replace(/\p{P}+$/u, "");

/** The built tiles that are not where an accepted sentence has them (to mark them after a wrong try); end punctuation is ignored, as in the grading. */
export function misplacedTiles(item: Extract<UnitItem, { kind: "order" }>, placed: readonly Tile[]): Set<string> {
  const accepted = [item.answer, ...item.accept].map((sentence) => sentence.split(/\s+/).map(bare));
  const wrong = new Set<string>();
  placed.forEach((tile, index) => {
    if (!accepted.some((words) => words[index] === bare(tile.text))) wrong.add(tile.id);
  });
  return wrong;
}

/** The right-hand column of a `match` item: the indices of its pairs, in a stable shuffled order. */
export function matchRightOrder(item: Extract<UnitItem, { kind: "match" }>): number[] {
  return seededShuffle(item.pairs.map((_, index) => index), item.id);
}

/** `"0:2,1:0,…"`, sorted by left index: the answer format of `match`. */
export function serializeMatch(pairing: Readonly<Record<number, number>>): string {
  return Object.entries(pairing)
    .map(([left, right]) => [Number(left), right] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([left, right]) => `${left}:${right}`)
    .join(",");
}

/** What a missed item expects, as text: the target-language sentence where there is one. `null` when there is none to show. */
export function expectedText(item: UnitItem, locale: "fr" | "en"): string | null {
  switch (item.kind) {
    case "mcq":
    case "listen_mcq":
      return item.options.find((option) => option.id === item.answer)?.text ?? null;
    case "order":
      return item.answer;
    case "cloze":
      return `${item.before}${item.accept[0] ?? ""}${item.after}`.trim();
    case "type":
      return item.accept[0] ?? null;
    case "match":
      return item.pairs.map((pair) => `${pair.left} · ${pair.right[locale]}`).join("\n");
  }
}

/** XP of a passed test, as an estimate (rule `unit.complete`). TODO(lot B): read it from the game rules once exported. */
export const UNIT_TEST_XP_ESTIMATE = 25;

/** The items of a step of a lesson, in the order of the lesson. For the test step: the items of the test. */
export function stepItems(unit: Pick<Unit, "lessons" | "items" | "test">, lesson: UnitLessonId, step: UnitStep): UnitItem[] {
  const byId = new Map(unit.items.map((item) => [item.id, item]));
  const ids = step === "test" ? unit.test.itemIds : (unit.lessons.find((entry) => entry.id === lesson)?.steps.find((entry) => entry.step === step)?.itemIds ?? []);
  return ids.flatMap((id) => byId.get(id) ?? []);
}
