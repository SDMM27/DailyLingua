import { cefrLevels, PLACEMENT_ITEMS_PER_LEVEL, PLACEMENT_MAX_ITEMS, type CefrLevel, type PlacementConfidence } from "@dailylingua/schemas";

/** Right answers that pass a block (the engine's rule, shown in the rail). */
const PASS_SCORE = 3;

export type SegmentState = "done" | "current" | "todo";

/** The six segments of the progress bar: blocks of five questions in the order they are asked. */
export function stepSegments(answered: number): SegmentState[] {
  const current = Math.floor(answered / PLACEMENT_ITEMS_PER_LEVEL);
  return Array.from({ length: PLACEMENT_MAX_ITEMS / PLACEMENT_ITEMS_PER_LEVEL }, (_, index) =>
    index < current ? "done" : index === current ? "current" : "todo");
}

export type RailState = "mastered" | "current" | "idle";

/**
 * The levels the rail shows, from A1 to the one after the highest level reached: a level whose block was passed is
 * mastered, the one being asked is current. A level is asked once (the engine stops at the first boundary).
 */
export function railLevels(responses: readonly { level: CefrLevel; correct: boolean }[], current: CefrLevel | null): { level: CefrLevel; state: RailState }[] {
  const passed = new Set<CefrLevel>();
  for (const level of cefrLevels) {
    const block = responses.filter((response) => response.level === level);
    if (block.length >= PLACEMENT_ITEMS_PER_LEVEL && block.filter((response) => response.correct).length >= PASS_SCORE) passed.add(level);
  }
  const reached = Math.max(
    current ? cefrLevels.indexOf(current) : -1,
    ...responses.map((response) => cefrLevels.indexOf(response.level)),
  );
  return cefrLevels.slice(0, Math.min(cefrLevels.length, reached + 2)).map((level) => ({
    level,
    state: level === current ? "current" : passed.has(level) ? "mastered" : "idle",
  }));
}

/** Filled bars of the confidence gauge (1 to 3). */
export function confidenceBars(confidence: PlacementConfidence): number {
  return confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
}

/** The declared level the test starts at: A0 and no declaration both start at A1, the first level of the test. */
export function testStartLevel(declared: string | null): CefrLevel {
  return (cefrLevels as readonly string[]).includes(declared ?? "") ? (declared as CefrLevel) : "A1";
}
