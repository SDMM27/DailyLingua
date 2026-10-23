import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { Card, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { GRAMMAR_LEVELS, grammarPointState } from "@/lib/domain/grammar";
import type { GrammarSuggestion } from "@/lib/domain/grammar-suggestions";
import { languageInfo } from "@/lib/domain/languages";
import { STATS_WINDOW_DAYS } from "@/lib/domain/production-stats";
import { dueItems, relativeDueLabel } from "@/lib/domain/spaced-repetition";
import type { CefrLevel, DateKey, Language } from "@/lib/schemas/common";
import type { GrammarCard, GrammarPoint, GrammarPointState } from "@/lib/schemas/grammar";
import { CORRECTION_CATEGORY_LABELS } from "@/lib/schemas/writing-feedback";

const STATE_LABELS: Record<GrammarPointState, string> = {
  new: "À voir",
  practised: "Exercée",
  mastered: "Maîtrisée",
};

/** « Accords : 5 erreurs en 30 jours », several reasons joined with « · ». */
function suggestionReason({ reasons }: GrammarSuggestion): string {
  return reasons
    .map((r) => `${CORRECTION_CATEGORY_LABELS[r.category]} : ${r.count} erreur${r.count > 1 ? "s" : ""} en ${STATS_WINDOW_DAYS} jours`)
    .join(" · ");
}

/**
 * "Grammaire": the points suggested by the repeated errors, the points to review today, then the points of the language by level, the
 * learner's own level first. `points` are the ones visible to the learner (the page applies the
 * draft policy) and `cards` the cards of the selected language.
 */
export function GrammarView({
  userLanguages,
  language,
  points,
  cards,
  level,
  today,
  hasAlphabet = false,
  suggestions = [],
}: {
  userLanguages: Language[];
  language: Language;
  points: GrammarPoint[];
  cards: GrammarCard[];
  /** The learner's declared level in this language. */
  level: CefrLevel;
  today: DateKey;
  /** The language has a visible alphabet: link to it. */
  hasAlphabet?: boolean;
  /** Points suggested by the errors of the last 30 days; the section is hidden when empty. */
  suggestions?: GrammarSuggestion[];
}) {
  const cardOf = (point: GrammarPoint) => cards.find((c) => c.pointId === point.id);
  const dueCards = dueItems(cards, today).filter((c) => points.some((p) => p.id === c.pointId));
  const covered = GRAMMAR_LEVELS.includes(level);
  // The learner's level first; above the covered levels every section is shown as a reference.
  const levels = covered ? [level, ...GRAMMAR_LEVELS.filter((l) => l !== level)] : [...GRAMMAR_LEVELS];

  return (
    <>
      <PageHeader eyebrow="Grammaire" title="Grammaire">
        Des fiches courtes avec des exercices. Une fiche réussie rejoint tes révisions.
      </PageHeader>

      {userLanguages.length > 1 && (
        <nav aria-label="Choisir une langue" className="-mx-4 mb-6 overflow-x-auto px-4">
          <ul className="flex gap-2">
            {userLanguages.map((l) => (
              <li key={l} className="shrink-0">
                <Link
                  href={`/grammaire?langue=${l}`}
                  aria-current={l === language ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium ${
                    l === language ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-soft"
                  }`}
                >
                  <span className={`size-2 rounded-full ${languageStyle(l).bg}`} aria-hidden="true" />
                  {languageInfo(l).nameFr}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {hasAlphabet && (
        <p className="-mt-3 mb-6 text-sm">
          <Link
            href={`/alphabet?langue=${language}`}
            className="inline-flex min-h-11 items-center font-medium text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Revoir l’alphabet
          </Link>
        </p>
      )}

      {points.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Les fiches de grammaire arrivent d’abord en russe et en italien.
        </p>
      ) : (
        <div className="space-y-10">
          {suggestions.length > 0 && (
            <section aria-label="Suggéré par tes erreurs">
              <SectionTitle>Suggéré par tes erreurs</SectionTitle>
              <ul className="space-y-2">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.point.id}>
                    <PointRow
                      point={suggestion.point}
                      language={language}
                      card={cardOf(suggestion.point)}
                      today={today}
                      note={suggestionReason(suggestion)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label="À revoir aujourd’hui">
            <SectionTitle>À revoir aujourd’hui</SectionTitle>
            {dueCards.length === 0 ? (
              <Card>
                <p className="text-sm text-ink-soft">Aucune fiche à revoir aujourd’hui.</p>
              </Card>
            ) : (
              <ul className="space-y-2">
                {dueCards.map((card) => {
                  const point = points.find((p) => p.id === card.pointId)!;
                  return (
                    <li key={card.id}>
                      <PointRow point={point} language={language} card={card} today={today} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {!covered && (
            <p className="rounded-2xl bg-surface-sunk px-4 py-3 text-sm text-ink-soft">
              Les fiches vont pour l’instant jusqu’au B1&nbsp;: sers-t’en comme référence.
            </p>
          )}

          {levels.map((l) => {
            const inLevel = points.filter((p) => p.level === l);
            if (inLevel.length === 0) return null;
            return (
              <section key={l} aria-label={`Fiches ${l}`}>
                <SectionTitle
                  action={
                    covered && l === level ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${languageStyle(language).softBg} ${languageStyle(language).text}`}>
                        Ton niveau
                      </span>
                    ) : undefined
                  }
                >
                  {l}
                </SectionTitle>
                <ul className="space-y-2">
                  {inLevel.map((point) => (
                    <li key={point.id}>
                      <PointRow point={point} language={language} card={cardOf(point)} today={today} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function PointRow({
  point,
  language,
  card,
  today,
  note,
}: {
  point: GrammarPoint;
  language: Language;
  card?: GrammarCard;
  today: DateKey;
  /** Shown in place of the summary (the reason of a suggestion). */
  note?: string;
}) {
  const state = grammarPointState(card);
  const style = languageStyle(language);
  return (
    <Link
      href={`/grammaire/${language}/${point.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-sunk"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{point.title}</span>
        <span className="block text-xs text-muted">{note ?? point.summary}</span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              state === "mastered"
                ? "bg-success-soft text-success"
                : state === "practised"
                  ? `${style.softBg} ${style.text}`
                  : "bg-surface-sunk text-ink-soft"
            }`}
          >
            {STATE_LABELS[state]}
          </span>
          {card && (
            <span className="text-[11px] text-muted">Révision {relativeDueLabel(card.review.dueOn, today)}</span>
          )}
          {point.reviewedOn === null && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">
              Non relue
            </span>
          )}
        </span>
      </span>
      <ArrowRightIcon width={16} height={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
