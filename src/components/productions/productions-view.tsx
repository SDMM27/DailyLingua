import Link from "next/link";
import { ExternalIcon } from "@/components/icons";
import { WritingFeedbackCard } from "@/components/mission/writing-feedback-card";
import { languageStyle } from "@/components/ui/language-style";
import { Card, Eyebrow, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { formatLongDate } from "@/lib/domain/dates";
import type { GrammarSuggestion } from "@/lib/domain/grammar-suggestions";
import { languageInfo } from "@/lib/domain/languages";
import { productionStats } from "@/lib/domain/production-stats";
import type { DateKey, Language } from "@/lib/schemas/common";
import type { CorrectionCard } from "@/lib/schemas/correction-card";
import type { ProductionEntry } from "@/lib/schemas/production";
import { AddCorrectionCardButton } from "./add-correction-card-button";
import { CorrectionReview } from "./correction-review";
import { ProductionStatsPanel } from "./production-stats-panel";

/**
 * "Mes productions": written texts with their review, the evolution of the errors and the cards
 * to review. `selected` is the language filter (already validated by the page). `persist` is
 * false in the demo, where nothing can be saved.
 */
export function ProductionsView({
  entries,
  cards,
  userLanguages,
  selected,
  today,
  persist,
  grammarSuggestions = {},
}: {
  entries: ProductionEntry[];
  cards: CorrectionCard[];
  userLanguages: Language[];
  selected?: Language;
  today: DateKey;
  persist: boolean;
  /** Grammar points suggested by the errors, per language (languages without a course are absent). */
  grammarSuggestions?: Partial<Record<Language, GrammarSuggestion[]>>;
}) {
  const withProductions = userLanguages.filter((l) => entries.some((e) => e.language === l));
  const visible = selected ? entries.filter((e) => e.language === selected) : entries;
  const visibleCards = selected ? cards.filter((c) => c.language === selected) : cards;

  return (
    <>
      <PageHeader eyebrow="Productions" title="Mes productions">
        Les textes que tu as écrits, avec leur correction et ton évolution.
      </PageHeader>

      {withProductions.length > 1 && (
        <nav aria-label="Filtrer par langue" className="-mx-4 mb-6 overflow-x-auto px-4">
          <ul className="flex gap-2">
            <FilterChip href="/productions" active={!selected} label="Toutes" />
            {withProductions.map((language) => (
              <FilterChip
                key={language}
                href={`/productions?langue=${language}`}
                active={selected === language}
                label={languageInfo(language).nameFr}
                language={language}
              />
            ))}
          </ul>
        </nav>
      )}

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Aucune production écrite pour l’instant.</p>
      ) : (
        <ProductionStatsPanel stats={productionStats(entries, today, selected)} grammarSuggestions={grammarSuggestions} />
      )}

      {visibleCards.length > 0 && (
        <section id="revoir" aria-label="Mes erreurs à revoir" className="mb-10 scroll-mt-4">
          <SectionTitle>Mes erreurs à revoir</SectionTitle>
          {/* Remounted on a filter change: the queue is fixed per mount. */}
          <CorrectionReview key={selected ?? "all"} initialCards={visibleCards} today={today} persist={persist} />
        </section>
      )}

      {visible.length > 0 && (
        <ol className="space-y-4">
          {visible.map((entry) => (
            <li key={entry.sessionId}>
              <ProductionCard entry={entry} persist={persist} />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function ProductionCard({ entry, persist }: { entry: ProductionEntry; persist: boolean }) {
  const { feedback } = entry;
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold first-letter:uppercase">{formatLongDate(entry.date)}</h2>
        <span className={`text-xs font-semibold ${languageStyle(entry.language).text}`}>
          {languageInfo(entry.language).nameFr}
        </span>
      </div>
      <div className="mt-3 flex gap-3">
        <span
          className={`w-1 shrink-0 self-stretch rounded-full ${languageStyle(entry.language).bg}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            lang={entry.language}
            className="inline font-serif text-[16px] leading-snug font-medium hover:underline"
          >
            {entry.title}
            <ExternalIcon width={13} height={13} className="ml-1 inline text-muted" />
          </a>
          <p className="mt-0.5 text-xs text-muted">{entry.sourceName}</p>
          {entry.task && (
            <p lang={entry.language} className="mt-2 text-[13px] text-ink-soft italic">
              {entry.task}
            </p>
          )}
          <Eyebrow className="mt-4">Mon texte</Eyebrow>
          <p lang={entry.language} className="mt-1 font-serif leading-relaxed whitespace-pre-wrap">
            {entry.body}
          </p>
          {feedback && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-xs font-medium text-ink-soft">Correction</summary>
              <div className="mt-3">
                <WritingFeedbackCard
                  language={entry.language}
                  feedback={feedback}
                  correctionAction={(index) => {
                    const added = entry.cardIndexes.includes(index);
                    if (!added && !persist) return null;
                    return (
                      <AddCorrectionCardButton sessionId={entry.sessionId} correctionIndex={index} added={added} />
                    );
                  }}
                />
              </div>
            </details>
          )}
        </div>
      </div>
    </Card>
  );
}

function FilterChip({
  href,
  active,
  label,
  language,
}: {
  href: string;
  active: boolean;
  label: string;
  language?: Language;
}) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
          active ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink-soft"
        }`}
      >
        {language && <span className={`size-1.5 rounded-full ${languageStyle(language).bg}`} aria-hidden="true" />}
        {label}
      </Link>
    </li>
  );
}
