import { Card, Eyebrow, SectionTitle } from "@/components/ui/primitives";
import { REVIEW_MODE_LABELS } from "@/lib/domain/labels";
import {
  RETENTION_MIN_DELAY_DAYS,
  RETENTION_MIN_REVIEWS_PER_MODE,
  RETENTION_MIN_REVIEWS_TOTAL,
  RETENTION_WINDOW_DAYS,
  REVIEW_MODES,
} from "@/lib/domain/review-modes";
import type { RetentionStats } from "@/lib/schemas/vocabulary";

const percent = (recalled: number, reviews: number) => Math.round((recalled / reviews) * 100);

/** What the learner keeps, per review mode, measured on reviews made long after the previous one. */
export function RetentionCard({ stats }: { stats: RetentionStats }) {
  const modes = REVIEW_MODES.filter((mode) => stats.byMode[mode].reviews >= RETENTION_MIN_REVIEWS_PER_MODE);
  const indicative = stats.total.reviews < RETENTION_MIN_REVIEWS_TOTAL;

  return (
    <section>
      <SectionTitle>Ce que tu retiens</SectionTitle>
      <Card>
        <Eyebrow>Rappel après au moins {RETENTION_MIN_DELAY_DAYS} jours</Eyebrow>
        {modes.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {modes.map((mode) => {
              const { reviews, recalled } = stats.byMode[mode];
              return (
                <li key={mode} className="text-[15px]">
                  <span className="font-semibold">{REVIEW_MODE_LABELS[mode]}</span>
                  {mode === "flip" && <span className="text-ink-soft"> (auto-évaluée)</span>} :{" "}
                  {percent(recalled, reviews)} % sur {reviews} révisions
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-[15px] text-ink-soft">
            Pas encore assez de révisions espacées pour afficher un taux.
          </p>
        )}
        <p className="mt-3 text-xs text-muted">
          On compte les révisions faites au moins {RETENTION_MIN_DELAY_DAYS} jours après la précédente, sur les{" "}
          {RETENTION_WINDOW_DAYS} derniers jours ; un mot est retenu s’il n’est pas à revoir. Un mode
          apparaît à partir de {RETENTION_MIN_REVIEWS_PER_MODE} révisions.
        </p>
        {indicative && (
          <p className="mt-1 text-xs text-muted">
            {stats.total.reviews} révisions mesurées pour l’instant : ces chiffres sont indicatifs, il en faut au
            moins {RETENTION_MIN_REVIEWS_TOTAL}.
          </p>
        )}
      </Card>
    </section>
  );
}
