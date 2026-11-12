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
 * Continuous scale of `skill_estimate.level_value`, bounded to [0, 6]: [0, 1) is A0 and 6 is the end of C2.
 * The spec fixes A1 → 1.5, A2 → 2.5 … C2 → 5.5 and the 0..6 bound, which leaves no room for six
 * bands of width 1: A1 to B2 keep their unit band (the value is its middle), C1 and C2 share [5, 6]
 * (C1 = [5, 5.5), C2 = [5.5, 6]). Open point reported to the architect.
 */
const BAND_START = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 5.5 } as const satisfies Record<CefrLevel, number>;
const BAND_VALUE = { A1: 1.5, A2: 2.5, B1: 3.5, B2: 4.5, C1: 5.25, C2: 5.5 } as const satisfies Record<CefrLevel, number>;

/** Representative value of a level on the continuous scale (A1 → 1.5 … C2 → 5.5). */
export function levelToValue(level: CefrLevel): number {
  return BAND_VALUE[level];
}

/** The level whose band contains `value`; below 1 is A0, from 6 up is C2. */
export function valueToLevel(value: number): "A0" | CefrLevel {
  if (!(value >= 1)) return "A0";
  let found: CefrLevel = "A1";
  for (const level of cefrLevels) if (value >= BAND_START[level]) found = level;
  return found;
}
