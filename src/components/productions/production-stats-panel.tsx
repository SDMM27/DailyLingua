import { languageStyle } from "@/components/ui/language-style";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { languageInfo } from "@/lib/domain/languages";
import { STATS_WINDOW_DAYS, type CategoryCount, type LanguageProductionStats } from "@/lib/domain/production-stats";
import {
  CORRECTION_CATEGORY_LABELS,
  WRITING_CRITERIA,
  WRITING_CRITERION_LABELS,
  WRITING_FEEDBACK_LIMITS,
} from "@/lib/schemas/writing-feedback";

const formatScore = (value: number | null) => (value === null ? "—" : value.toFixed(1).replace(".", ","));

function Trend({ recent, previous }: Pick<CategoryCount, "recent" | "previous">) {
  const [arrow, label] =
    recent > previous
      ? ["↑", "en hausse"]
      : recent < previous
        ? ["↓", "en baisse"]
        : ["=", "stable"];
  return (
    <span className="text-xs text-muted">
      <span aria-hidden="true">{arrow}</span>
      <span className="sr-only">
        {label} par rapport aux {STATS_WINDOW_DAYS} jours précédents ({previous})
      </span>
      <span aria-hidden="true"> (avant : {previous})</span>
    </span>
  );
}

/**
 * Evolution over the last 30 days against the 30 days before, per language: error categories and
 * mean of the four scores. Hidden when no review falls in the last 60 days.
 */
export function ProductionStatsPanel({ stats }: { stats: LanguageProductionStats[] }) {
  if (stats.length === 0) return null;
  return (
    <section aria-label="Évolution" className="mb-10">
      <SectionTitle>Évolution</SectionTitle>
      <p className="-mt-1 mb-3 text-[13px] text-ink-soft">
        Les {STATS_WINDOW_DAYS} derniers jours, comparés aux {STATS_WINDOW_DAYS} jours d’avant.
      </p>
      <div className="space-y-3">
        {stats.map((s) => (
          <Card key={s.language}>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span className={`size-2 rounded-full ${languageStyle(s.language).bg}`} aria-hidden="true" />
              {languageInfo(s.language).nameFr}
              <span className="text-xs font-normal text-muted">
                · {s.reviewedCount.recent} texte{s.reviewedCount.recent > 1 ? "s" : ""} corrigé
                {s.reviewedCount.recent > 1 ? "s" : ""}
              </span>
            </h3>

            {s.categories.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {s.categories.map((c) => (
                  <li key={c.category} className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{CORRECTION_CATEGORY_LABELS[c.category]}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="font-semibold">{c.recent}</span>
                      <Trend recent={c.recent} previous={c.previous} />
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3 text-sm">
              {WRITING_CRITERIA.map((criterion) => (
                <li key={criterion} className="flex items-baseline justify-between gap-2">
                  <span className="text-ink-soft">{WRITING_CRITERION_LABELS[criterion]}</span>
                  <span>
                    <span className="font-semibold">{formatScore(s.averages.recent[criterion])}</span>
                    <span className="text-xs text-muted">
                      {" "}
                      / {WRITING_FEEDBACK_LIMITS.score.max}
                      <span className="sr-only">, avant : {formatScore(s.averages.previous[criterion])}</span>
                      <span aria-hidden="true"> (avant : {formatScore(s.averages.previous[criterion])})</span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}
