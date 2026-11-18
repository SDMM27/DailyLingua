import type { DateKey } from "@dailylingua/schemas";
import { addDays, diffInDays } from "../dates";

/** One correction of a written production, in the order the correction ranks them (most useful first). */
export interface ErrorCandidate {
  id: string;
  category: string;
  /** The corrected passage, normalised. */
  correctedNormalized: string;
}

/** An error already seen in the last 30 days. */
export interface SeenError {
  category: string;
  correctedNormalized: string;
  day: DateKey;
}

export const RECURRING_ERROR_DAYS = 30;
/** Categories that make a poor error of the day: picked only when nothing else is left. */
const WEAK_CATEGORIES: readonly string[] = ["spelling", "other"];

/**
 * The error of the day (`j2-seance-contenu.md` §5): (1) a correction whose category and corrected passage were already
 * seen in the last 30 days (a recurring error); otherwise (2) the highest ranked one outside `spelling` and `other`;
 * otherwise (3) the first. One per day and language; null when there is no correction.
 */
export function chooseErrorOfDay(candidates: readonly ErrorCandidate[], seen: readonly SeenError[], today: DateKey): ErrorCandidate | null {
  const recurring = candidates.find((candidate) =>
    seen.some(
      (error) =>
        error.category === candidate.category &&
        error.correctedNormalized === candidate.correctedNormalized &&
        error.day <= today &&
        diffInDays(error.day, today) <= RECURRING_ERROR_DAYS,
    ),
  );
  if (recurring) return recurring;
  return candidates.find((candidate) => !WEAK_CATEGORIES.includes(candidate.category)) ?? candidates[0] ?? null;
}

/** An error of the last 7 days is still worth reworking (`error_of_day.reworked`). */
export const ERROR_OF_DAY_WINDOW_DAYS = 7;
export function isErrorWorkable(createdDay: DateKey, reworkedDay: DateKey | null, today: DateKey): boolean {
  return reworkedDay === null && createdDay >= addDays(today, -ERROR_OF_DAY_WINDOW_DAYS) && createdDay <= today;
}

/** Comprehension score of a text: right first answers over the questions served. */
export function readingScore(rightFirstTry: number, served: number): number {
  return served > 0 ? rightFirstTry / served : 0;
}

export type Density = 1 | 2 | 3;

export interface DensityDecision {
  density: Density;
  /** The text to serve is a dense one of the level below (the displayed level never changes). */
  lowerLevelDense: boolean;
  /** Consecutive drops from the lightest density, to pass back to the next call. */
  lightDrops: number;
  /** Already dense and 90 % twice: recorded for the continuous level of milestone 6. */
  ceilingSignal: boolean;
}

/**
 * Density of tomorrow's text (`j2-seance-contenu.md` §7). `scores` are the scores of the texts of the sessions, the
 * latest last; a skipped reading or fewer than 3 questions is simply left out (no update).
 */
export function nextDensity(current: Density, scores: readonly number[], lightDrops = 0): DensityDecision {
  const stay: DensityDecision = { density: current, lowerLevelDense: false, lightDrops: 0, ceilingSignal: false };
  const last = scores[scores.length - 1];
  if (last === undefined) return { ...stay, lightDrops };
  const previous = scores[scores.length - 2];
  if (last >= 0.9 && previous !== undefined && previous >= 0.9) {
    return current === 3 ? { ...stay, ceilingSignal: true } : { ...stay, density: (current + 1) as Density };
  }
  if (last < 0.6) {
    if (current > 1) return { ...stay, density: (current - 1) as Density };
    const drops = lightDrops + 1;
    return drops >= 2 ? { ...stay, density: 3, lowerLevelDense: true, lightDrops: 0 } : { ...stay, lightDrops: drops };
  }
  return stay;
}
