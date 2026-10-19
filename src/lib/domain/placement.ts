import { CEFR_LEVELS, type CefrLevel } from "@/lib/schemas/common";
import {
  PLACEMENT_ITEMS_PER_LEVEL,
  PLACEMENT_SKILLS,
  type PlacementAnswer,
  type PlacementConfidence,
  type PlacementItem,
  type PlacementSkill,
} from "@/lib/schemas/placement";

/**
 * Adaptive placement test. Levels are tested in blocks of 5 questions at the same level; a block
 * is passed from 3 right answers (an "I don't know" counts as wrong). The test starts at the
 * declared level, climbs while blocks pass and goes down while they fail; it stops at the first
 * pass/fail boundary, so it asks at most one block per level, 30 questions. The estimate is the
 * highest passed level (A1 when even A1 fails).
 * Confidence looks at the two blocks of the boundary: a block is clear with 0, 1, 4 or 5 right
 * answers, and borderline with 2 or 3. Both clear → high, one borderline → medium, both
 * borderline → low (a single boundary block, at A1 or C2, is high when clear, medium otherwise).
 */

export interface PlacementResponse {
  level: CefrLevel;
  correct: boolean;
}

export type PlacementStep =
  | { kind: "ask"; level: CefrLevel }
  | { kind: "done"; estimate: CefrLevel; confidence: PlacementConfidence };

/** Right answers needed to pass a block. */
const PASS_SCORE = 3;

interface BlockOutcome {
  passed: boolean;
  /** Decided without hesitation: 0, 1, 4 or 5 right answers. */
  clear: boolean;
}

function blockOutcome(answers: boolean[]): BlockOutcome | null {
  if (answers.length < PLACEMENT_ITEMS_PER_LEVEL) return null;
  const score = answers.filter(Boolean).length;
  return { passed: score >= PASS_SCORE, clear: score <= 1 || score >= 4 };
}

function confidenceOf(boundary: BlockOutcome[]): PlacementConfidence {
  const borderline = boundary.filter((b) => !b.clear).length;
  return borderline === 0 ? "high" : borderline === 1 ? "medium" : "low";
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

/**
 * A copy of the bank in random order, drawn once when a test starts so that a retest asks other
 * questions. The order only decides which question of a skill comes first: `pickPlacementItem`
 * still alternates the skills, and the server replay accepts any order.
 */
export function shufflePlacementItems(items: readonly PlacementItem[], random: () => number = Math.random): PlacementItem[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Skill of the next question at `level`: the one asked the least so far at this level, among those
 * with questions left, ties in the order of `PLACEMENT_SKILLS` (a block of 5 is grammar, vocabulary,
 * reading, grammar, vocabulary). Depends only on which questions were asked, not on their order.
 */
function nextSkill(items: readonly PlacementItem[], level: CefrLevel, askedIds: ReadonlySet<string>): PlacementSkill | null {
  let best: { skill: PlacementSkill; asked: number } | null = null;
  for (const skill of PLACEMENT_SKILLS) {
    const ofSkill = items.filter((item) => item.level === level && item.skill === skill);
    const asked = ofSkill.filter((item) => askedIds.has(item.id)).length;
    if (asked < ofSkill.length && (!best || asked < best.asked)) best = { skill, asked };
  }
  return best?.skill ?? null;
}

/** The next question at `level`: the first one, in the given order, of the skill `nextSkill` picks. */
export function pickPlacementItem(
  items: readonly PlacementItem[],
  level: CefrLevel,
  askedIds: ReadonlySet<string>,
): PlacementItem | null {
  const skill = nextSkill(items, level, askedIds);
  return items.find((item) => item.level === level && item.skill === skill && !askedIds.has(item.id)) ?? null;
}

export type PlacementReplay =
  | { ok: true; estimate: CefrLevel; confidence: PlacementConfidence }
  | { ok: false; reason: string };

/**
 * Replays a finished test against the bank: every answer must be a question of the bank not asked
 * yet, at the level and of the skill the engine expected (the client draws the order, so any
 * question of that level and skill is accepted), and the test must end exactly on the last answer.
 * Used by the server, which never trusts an estimate computed by the client.
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
    const skill = nextSkill(items, step.level, asked);
    const item = items.find((i) => i.id === answer.itemId);
    if (!item || asked.has(item.id) || item.level !== step.level || item.skill !== skill) {
      return { ok: false, reason: `unexpected item ${answer.itemId}` };
    }
    asked.add(item.id);
    responses.push({ level: item.level, correct: answer.choice === item.answer });
  }
  const step = nextPlacementStep(start, responses);
  if (step.kind !== "done") return { ok: false, reason: "the test is not finished" };
  return { ok: true, estimate: step.estimate, confidence: step.confidence };
}
