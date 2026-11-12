import { cefrLevels, type CefrLevel } from "@dailylingua/schemas";

/** How hard the content should be compared with the learner's level. */
export type DifficultyMode = "comfortable" | "matched" | "challenge";

/** Level the content should have: one below (comfortable), the same (matched) or above (challenge). */
export function targetLevel(level: CefrLevel, mode: DifficultyMode): CefrLevel {
  const offset = mode === "comfortable" ? -1 : mode === "challenge" ? 1 : 0;
  const index = cefrLevels.indexOf(level) + offset;
  return cefrLevels[Math.min(cefrLevels.length - 1, Math.max(0, index))] as CefrLevel;
}

/** The level aimed at and its two neighbours (bounded to A1..C2), easiest first: the contents a mission may use. */
export function wantedLevels(level: CefrLevel, difficulty: DifficultyMode): CefrLevel[] {
  const index = cefrLevels.indexOf(targetLevel(level, difficulty));
  return cefrLevels.slice(Math.max(0, index - 1), index + 2);
}

/**
 * Continuous scale of `skill_estimate.level_value`, bounded to [0, 7], one band of width 1 per level:
 * A0 = [0, 1), A1 = [1, 2) … C1 = [5, 6), C2 = [6, 7]. Bands are closed on the left; 7 belongs to C2.
 */
export const LEVEL_SCALE_MAX = 7;

/** Middle of the level's band: A1 1.5, A2 2.5, B1 3.5, B2 4.5, C1 5.5, C2 6.5. */
export function levelToValue(level: CefrLevel): number {
  return cefrLevels.indexOf(level) + 1.5;
}

/** The level whose band contains `value`. Values outside [0, 7] are clamped (below 0 is A0, above 7 is C2). */
export function valueToLevel(value: number): "A0" | CefrLevel {
  if (!(value >= 1)) return "A0";
  return cefrLevels[Math.min(cefrLevels.length - 1, Math.floor(value) - 1)] as CefrLevel;
}
