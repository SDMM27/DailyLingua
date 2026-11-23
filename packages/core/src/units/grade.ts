import type { Unit, UnitItem, UnitLessonId, UnitStep } from "@dailylingua/schemas";
import { gradeChoice, gradeTyped, type AccentTolerance, type Graded } from "../grading";

/** Outcome of one item: `nearMiss` is a diacritics-only slip (right under the lenient tolerance, wrong under the strict one). */
export interface UnitItemGrade {
  correct: boolean;
  nearMiss: boolean;
}

const fromGraded = (graded: Graded): UnitItemGrade => ({ correct: graded.correct, nearMiss: graded.verdict === "almost" });

/** `match` answers are `"0:2,1:0,…"` (left index : right index); the right one pairs each left with the same index. */
function gradeMatch(pairCount: number, answer: string): boolean {
  const entries = answer.split(",").map((entry) => entry.trim());
  if (entries.length !== pairCount) return false;
  const seen = new Set<number>();
  for (const entry of entries) {
    const parts = /^(\d+):(\d+)$/.exec(entry);
    if (!parts) return false;
    const left = Number(parts[1]);
    if (left !== Number(parts[2]) || left >= pairCount || seen.has(left)) return false;
    seen.add(left);
  }
  return true;
}

/**
 * Grades one item of a unit. Pure. The answer is the id of the chosen option (`mcq`, `listen_mcq`), the
 * rebuilt sentence with the tokens joined by a space (`order`), the typed text (`cloze`, `type`) or the
 * serialised pairing (`match`). `language` is the language of the unit (accent rules of the comparison).
 */
export function gradeUnitItem(
  language: string,
  item: UnitItem,
  answer: string,
  tolerance: AccentTolerance = "lenient",
): UnitItemGrade {
  switch (item.kind) {
    case "mcq":
    case "listen_mcq":
      return fromGraded(gradeChoice(answer, item.answer));
    case "order":
      return fromGraded(gradeTyped({ language, kind: "cloze", answer, accept: [item.answer, ...item.accept], tolerance }));
    case "cloze":
      return fromGraded(gradeTyped({ language, kind: "cloze", answer, accept: item.accept, tolerance }));
    case "type":
      return fromGraded(gradeTyped({ language, kind: "short_answer", answer, accept: item.accept, tolerance }));
    case "match":
      return { correct: gradeMatch(item.pairs.length, answer), nearMiss: false };
  }
}

/** One recorded try of an item; the list is in chronological order, the last try of an item counts. */
export interface UnitAttempt {
  itemId: string;
  correct: boolean;
}

/**
 * Whether a step of a lesson is validated: every item of the step has been answered at least once and the
 * share of items right on their last try reaches the `threshold` the content set for the step (a step with
 * a threshold of 0, like the dialogue, only asks for its items to be answered). A step the lesson does not
 * have is never validated; a step without items is.
 */
export function stepValidated(
  unit: Pick<Unit, "lessons">,
  lesson: UnitLessonId,
  step: UnitStep,
  attempts: readonly UnitAttempt[],
): boolean {
  const config = unit.lessons.find((entry) => entry.id === lesson)?.steps.find((entry) => entry.step === step);
  if (!config) return false;
  const last = new Map<string, boolean>();
  for (const attempt of attempts) last.set(attempt.itemId, attempt.correct);
  const ids = [...new Set(config.itemIds)];
  if (ids.length === 0) return true;
  if (ids.some((id) => !last.has(id))) return false;
  const right = ids.filter((id) => last.get(id) === true).length;
  return right / ids.length >= config.threshold - 1e-9;
}

export interface UnitTestAnswer {
  itemId: string;
  answer: string;
}

/** The result of a submitted test; an invalid submission (item outside the test, or twice) is graded nowhere. */
export type UnitTestGrade =
  | { valid: true; score: number; total: number; passed: boolean; missed: string[] }
  | { valid: false; reason: "unknown_item" | "duplicate_item"; itemId: string };

/**
 * Grades the test of a unit. A missing answer counts wrong; `missed` lists the wrong or missing item ids in
 * the order of the test. An answer for an item outside the test, or two answers for one item, make the
 * submission invalid.
 */
export function gradeUnitTest(
  unit: Pick<Unit, "language" | "items" | "test">,
  answers: readonly UnitTestAnswer[],
  tolerance: AccentTolerance = "lenient",
): UnitTestGrade {
  const inTest = new Set(unit.test.itemIds);
  const given = new Map<string, string>();
  for (const { itemId, answer } of answers) {
    if (!inTest.has(itemId)) return { valid: false, reason: "unknown_item", itemId };
    if (given.has(itemId)) return { valid: false, reason: "duplicate_item", itemId };
    given.set(itemId, answer);
  }
  const items = new Map(unit.items.map((item) => [item.id, item]));
  const missed: string[] = [];
  for (const id of unit.test.itemIds) {
    const item = items.get(id);
    const answer = given.get(id);
    const correct = item !== undefined && answer !== undefined && gradeUnitItem(unit.language, item, answer, tolerance).correct;
    if (!correct) missed.push(id);
  }
  const total = unit.test.itemIds.length;
  const score = total - missed.length;
  return { valid: true, score, total, passed: score >= unit.test.passScore, missed };
}
