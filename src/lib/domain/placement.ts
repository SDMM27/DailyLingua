import { CEFR_LEVELS, type CefrLevel } from "@/lib/schemas/common";
import type {
  PlacementAnswer,
  PlacementConfidence,
  PlacementItem,
  PlacementVariant,
} from "@/lib/schemas/placement";
import type { LanguagePurpose } from "@/lib/schemas/preferences";

/**
 * Adaptive placement test. Levels are tested in blocks of two questions: 2/2 passes the level,
 * 0/2 fails it, 1/2 asks a third question that decides (2/3 passes). The test starts at the
 * declared level, climbs while levels pass and goes down while they fail; it stops at the first
 * pass/fail boundary. The estimate is the highest passed level (A1 when even A1 fails).
 * Confidence counts the boundary blocks that needed the deciding question: none → high, one →
 * medium, two → low. At most 3 questions per level, so a variant needs 3 per level.
 */

export interface PlacementResponse {
  level: CefrLevel;
  correct: boolean;
}

export type PlacementStep =
  | { kind: "ask"; level: CefrLevel }
  | { kind: "done"; estimate: CefrLevel; confidence: PlacementConfidence };

interface BlockOutcome {
  passed: boolean;
  /** Decided by the first two answers. */
  clean: boolean;
}

/** Variant suggested for a learning purpose; the learner can switch before starting. */
export function placementVariantFor(purpose: LanguagePurpose): PlacementVariant {
  return purpose === "professional" ? "professional" : "everyday";
}

function blockOutcome(answers: boolean[]): BlockOutcome | null {
  if (answers.length < 2) return null;
  const [a, b] = answers;
  if (a === b) return { passed: a, clean: true };
  if (answers.length < 3) return null;
  return { passed: answers[2], clean: false };
}

function confidenceOf(boundary: BlockOutcome[]): PlacementConfidence {
  const splits = boundary.filter((b) => !b.clean).length;
  return splits === 0 ? "high" : splits === 1 ? "medium" : "low";
}

/**
 * What to do after `responses` (in the order they were given), for a test started at `start`.
 * Throws when a response is not at the level the test asked for: callers replaying answers
 * (the server) check the sequence with `replayPlacement` instead.
 */
export function nextPlacementStep(start: CefrLevel, responses: readonly PlacementResponse[]): PlacementStep {
  const outcomes = new Map<number, BlockOutcome>();
  let current = CEFR_LEVELS.indexOf(start);
  let block: boolean[] = [];

  const settle = (): PlacementStep | null => {
    const outcome = blockOutcome(block);
    if (!outcome) return null;
    outcomes.set(current, outcome);
    block = [];
    if (outcome.passed) {
      const above = outcomes.get(current + 1);
      if (above && !above.passed) {
        return { kind: "done", estimate: CEFR_LEVELS[current], confidence: confidenceOf([outcome, above]) };
      }
      if (current === CEFR_LEVELS.length - 1) {
        return { kind: "done", estimate: CEFR_LEVELS[current], confidence: confidenceOf([outcome]) };
      }
      current += 1;
    } else {
      const below = outcomes.get(current - 1);
      if (below?.passed) {
        return { kind: "done", estimate: CEFR_LEVELS[current - 1], confidence: confidenceOf([below, outcome]) };
      }
      if (current === 0) {
        return { kind: "done", estimate: CEFR_LEVELS[0], confidence: confidenceOf([outcome]) };
      }
      current -= 1;
    }
    return null;
  };

  for (const [index, response] of responses.entries()) {
    if (response.level !== CEFR_LEVELS[current]) {
      throw new Error(`Response ${index} is at ${response.level}, the test asked for ${CEFR_LEVELS[current]}`);
    }
    block.push(response.correct);
    const done = settle();
    if (done) {
      if (index !== responses.length - 1) throw new Error("Responses continue after the end of the test");
      return done;
    }
  }
  return { kind: "ask", level: CEFR_LEVELS[current] };
}

/** The next question at `level`: the first one of the bank order that was not asked yet. */
export function pickPlacementItem(
  items: readonly PlacementItem[],
  level: CefrLevel,
  askedIds: ReadonlySet<string>,
): PlacementItem | null {
  return items.find((item) => item.level === level && !askedIds.has(item.id)) ?? null;
}

export type PlacementReplay =
  | { ok: true; estimate: CefrLevel; confidence: PlacementConfidence }
  | { ok: false; reason: string };

/**
 * Replays a finished test against the bank: every answer must be the question the engine would
 * have asked, and the test must end exactly on the last answer. Used by the server, which never
 * trusts an estimate computed by the client.
 */
export function replayPlacement(
  items: readonly PlacementItem[],
  start: CefrLevel,
  answers: readonly PlacementAnswer[],
): PlacementReplay {
  const asked = new Set<string>();
  const responses: PlacementResponse[] = [];
  for (const answer of answers) {
    const step = nextPlacementStep(start, responses);
    if (step.kind === "done") return { ok: false, reason: "answers after the end of the test" };
    const expected = pickPlacementItem(items, step.level, asked);
    if (!expected || expected.id !== answer.itemId) return { ok: false, reason: `unexpected item ${answer.itemId}` };
    asked.add(expected.id);
    responses.push({ level: expected.level, correct: answer.choice === expected.answer });
  }
  const step = nextPlacementStep(start, responses);
  if (step.kind !== "done") return { ok: false, reason: "the test is not finished" };
  return { ok: true, estimate: step.estimate, confidence: step.confidence };
}
