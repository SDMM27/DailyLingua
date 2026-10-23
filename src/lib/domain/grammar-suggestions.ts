import { grammarPointState } from "@/lib/domain/grammar";
import { productionStats } from "@/lib/domain/production-stats";
import { CEFR_LEVELS, type CefrLevel, type DateKey, type Language } from "@/lib/schemas/common";
import type { GrammarCard, GrammarPoint } from "@/lib/schemas/grammar";
import type { ProductionEntry } from "@/lib/schemas/production";
import type { CorrectionCategory } from "@/lib/schemas/writing-feedback";

/** Corrections of one category over the last 30 days needed to suggest a point. */
export const GRAMMAR_SUGGESTION_MIN_ERRORS = 3;
/** Points suggested at most. */
export const GRAMMAR_SUGGESTION_MAX = 3;
/** The categories a grammar point can answer; word choice, spelling and register cannot. */
export const SUGGESTION_CATEGORIES: readonly CorrectionCategory[] = ["verb", "agreement", "function_word", "word_order"];

export interface GrammarSuggestion {
  point: GrammarPoint;
  /** The triggered categories the point lists, most frequent first. */
  reasons: { category: CorrectionCategory; count: number }[];
}

/**
 * Grammar points worth opening given the repeated errors of the last 30 days (same window as
 * `productionStats`). A point is a candidate when it lists a category with at least 3 errors, is
 * not mastered and is at the learner's level or below (every point above B1, where the courses
 * stop). Ranked by the errors of the categories it treats, then new before practised, then
 * teaching order (`points` is in that order).
 */
export function suggestGrammarPoints({
  language,
  entries,
  points,
  cards,
  level,
  today,
}: {
  language: Language;
  entries: readonly Pick<ProductionEntry, "date" | "language" | "feedback">[];
  points: readonly GrammarPoint[];
  cards: readonly GrammarCard[];
  level: CefrLevel;
  today: DateKey;
}): GrammarSuggestion[] {
  const [stats] = productionStats(entries, today, language);
  const triggered = (stats?.categories ?? []).filter(
    (c) => SUGGESTION_CATEGORIES.includes(c.category) && c.recent >= GRAMMAR_SUGGESTION_MIN_ERRORS,
  );
  if (triggered.length === 0) return [];

  const rank = (l: CefrLevel) => CEFR_LEVELS.indexOf(l);
  return points
    .flatMap((point, order) => {
      const state = grammarPointState(cards.find((c) => c.pointId === point.id));
      if (state === "mastered" || rank(point.level) > rank(level)) return [];
      // `triggered` is already sorted by count, highest first.
      const reasons = triggered
        .filter((c) => point.categories.includes(c.category))
        .map((c) => ({ category: c.category, count: c.recent }));
      if (reasons.length === 0) return [];
      return [{ point, reasons, order, isNew: state === "new", total: reasons.reduce((n, r) => n + r.count, 0) }];
    })
    .sort((a, b) => b.total - a.total || Number(b.isNew) - Number(a.isNew) || a.order - b.order)
    .slice(0, GRAMMAR_SUGGESTION_MAX)
    .map(({ point, reasons }) => ({ point, reasons }));
}
