import { diffInDays } from "@/lib/domain/dates";
import { LANGUAGE_CODES } from "@/lib/domain/languages";
import type { DateKey, Language } from "@/lib/schemas/common";
import type { ProductionEntry } from "@/lib/schemas/production";
import {
  CORRECTION_CATEGORIES,
  WRITING_CRITERIA,
  type CorrectionCategory,
  type WritingCriterion,
  type WritingFeedback,
} from "@/lib/schemas/writing-feedback";

/** Length of a comparison window, in days (today included in the recent one). */
export const STATS_WINDOW_DAYS = 30;

export interface CategoryCount {
  category: CorrectionCategory;
  /** Corrections of that category in the last 30 days. */
  recent: number;
  /** Same, in the 30 days before. */
  previous: number;
}

type CriterionAverages = Record<WritingCriterion, number | null>;

export interface LanguageProductionStats {
  language: Language;
  /** Most frequent recent categories first; those absent from both windows are left out. */
  categories: CategoryCount[];
  /** Mean score per criterion on each window; null when no review falls in it. */
  averages: { recent: CriterionAverages; previous: CriterionAverages };
  /** Number of reviews each window is built on. */
  reviewedCount: { recent: number; previous: number };
}

type StatsEntry = Pick<ProductionEntry, "date" | "language" | "feedback">;

type Window = "recent" | "previous";

/** recent = [today-29, today], previous = [today-59, today-30]; null outside (or in the future). */
function windowOf(date: DateKey, today: DateKey): Window | null {
  const age = diffInDays(date, today);
  if (age < 0 || age >= 2 * STATS_WINDOW_DAYS) return null;
  return age < STATS_WINDOW_DAYS ? "recent" : "previous";
}

const mean = (values: number[]) => (values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length);

/**
 * Error categories and mean scores of the last 30 days against the 30 days before, per language.
 * Only reviewed productions count; corrections without a category are ignored in the categories
 * (they come from reviews stored before categories existed). Languages with no review in the 60
 * days are left out. `language` restricts the result to one language.
 */
export function productionStats(
  entries: readonly StatsEntry[],
  today: DateKey,
  language?: Language,
): LanguageProductionStats[] {
  const byLanguage = new Map<Language, { feedback: WritingFeedback; window: Window }[]>();
  for (const entry of entries) {
    if (!entry.feedback || (language && entry.language !== language)) continue;
    const window = windowOf(entry.date, today);
    if (!window) continue;
    byLanguage.set(entry.language, [...(byLanguage.get(entry.language) ?? []), { feedback: entry.feedback, window }]);
  }

  return LANGUAGE_CODES.filter((code) => byLanguage.has(code)).map((code) => {
    const reviews = byLanguage.get(code)!;
    const counts = new Map<CorrectionCategory, { recent: number; previous: number }>();
    for (const { feedback, window } of reviews) {
      for (const correction of feedback.corrections) {
        if (!correction.category) continue;
        const count = counts.get(correction.category) ?? { recent: 0, previous: 0 };
        count[window] += 1;
        counts.set(correction.category, count);
      }
    }
    const categories = CORRECTION_CATEGORIES.filter((c) => counts.has(c))
      .map((category) => ({ category, ...counts.get(category)! }))
      // Stable: ties keep the order of CORRECTION_CATEGORIES.
      .sort((a, b) => b.recent - a.recent);

    const averageOn = (window: Window) =>
      Object.fromEntries(
        WRITING_CRITERIA.map((criterion) => [
          criterion,
          mean(reviews.filter((r) => r.window === window).map((r) => r.feedback.scores[criterion].score)),
        ]),
      ) as CriterionAverages;
    const countOn = (window: Window) => reviews.filter((r) => r.window === window).length;

    return {
      language: code,
      categories,
      averages: { recent: averageOn("recent"), previous: averageOn("previous") },
      reviewedCount: { recent: countOn("recent"), previous: countOn("previous") },
    };
  });
}

/**
 * Indexes of the corrections of `current` whose category already appeared in a correction of one
 * of `previous` (reviews of other sessions of the same language, from the last 30 days: the
 * caller selects them). Those are recurring errors, worth a review card.
 */
export function recurringCorrectionIndexes(current: WritingFeedback, previous: readonly WritingFeedback[]): number[] {
  const seen = new Set<CorrectionCategory>();
  for (const feedback of previous) {
    for (const correction of feedback.corrections) if (correction.category) seen.add(correction.category);
  }
  return current.corrections.flatMap((correction, index) =>
    correction.category && seen.has(correction.category) ? [index] : [],
  );
}
