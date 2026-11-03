import { CEFR_LEVELS, type CefrLevel } from "@/lib/schemas/common";
import type { DifficultyMode } from "@/lib/schemas/preferences";

/** Level the content should have: one below (comfortable), the same (matched) or above (challenge). */
export function targetLevel(level: CefrLevel, mode: DifficultyMode): CefrLevel {
  const offset = mode === "comfortable" ? -1 : mode === "challenge" ? 1 : 0;
  const index = CEFR_LEVELS.indexOf(level) + offset;
  return CEFR_LEVELS[Math.min(CEFR_LEVELS.length - 1, Math.max(0, index))];
}

/** The level aimed at and its two neighbours (bounded to A1..C2), easiest first: the contents a mission may use. */
export function wantedLevels(level: CefrLevel, difficulty: DifficultyMode): CefrLevel[] {
  const index = CEFR_LEVELS.indexOf(targetLevel(level, difficulty));
  return CEFR_LEVELS.slice(Math.max(0, index - 1), index + 2);
}
