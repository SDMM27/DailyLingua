import Link from "next/link";
import { languageStyle } from "@/components/ui/language-style";
import { Eyebrow, LanguageTag } from "@/components/ui/primitives";
import { languageInfo } from "@/lib/domain/languages";
import { toRoman } from "@/lib/domain/roman";
import type { DateKey, Language } from "@/lib/schemas/common";
import type { GrammarCard, GrammarPoint } from "@/lib/schemas/grammar";
import { grammarReviewStatus } from "@/lib/grammar/policy";
import { GrammarPractice } from "./grammar-practice";

/** One grammar point: the lesson (rule, table, examples), then its exercises. */
export function GrammarPointView({
  point,
  language,
  card,
  today,
  persist,
}: {
  point: GrammarPoint;
  language: Language;
  card?: GrammarCard;
  today: DateKey;
  persist: boolean;
}) {
  const style = languageStyle(language);
  const { dir } = languageInfo(language);
  const { table } = point;
  const status = grammarReviewStatus(point);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/grammaire?langue=${language}`}
          className="min-h-11 content-center text-sm font-medium text-muted hover:text-ink"
        >
          ← Grammaire
        </Link>
        <div className="flex items-center gap-2">
          <LanguageTag language={language} />
          {status === "draft" && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">
              Non relue
            </span>
          )}
        </div>
      </div>

      <header className="mb-8 border-b border-ink pb-6">
        <Eyebrow className="mb-3">Niveau {point.level}</Eyebrow>
        <h1 className="sd-display text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02] text-balance">{point.title}</h1>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-0">
        <article className="min-w-0 space-y-8 lg:pr-10">
          <section aria-label="La règle">
            <Eyebrow>La règle</Eyebrow>
            <div className="mt-3 max-w-[68ch] space-y-3">
              {point.rule.map((paragraph, i) => (
                <p key={i} className="font-serif text-xl leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {table && (
              // The table scrolls inside its container, not the page.
              <div className="mt-6 overflow-x-auto border-y border-ink">
                <table className="w-full min-w-max border-collapse text-left text-sm">
                  {table.caption && <caption className="py-2 text-left text-xs text-muted">{table.caption}</caption>}
                  <thead>
                    <tr className="border-b border-line">
                      {table.headers.map((header) => (
                        <th key={header} scope="col" className="kicker px-3 py-2 text-ink-soft">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          // Cells may hold French as well as the studied language: the direction follows the text.
                          <td key={j} lang={j === 0 ? undefined : language} dir="auto" className="px-3 py-2 font-serif text-base">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-label="Exemples">
            <Eyebrow className="mb-3">Exemples</Eyebrow>
            <ul className="border-t border-line">
              {point.examples.map((example, index) => (
                <li key={example.text} className="flex items-start gap-4 border-b border-line py-4">
                  <span aria-hidden="true" className="w-8 shrink-0 font-serif text-2xl leading-none font-extrabold text-accent-strong">
                    {toRoman(index + 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p lang={language} dir={dir} className={`font-serif text-2xl leading-snug font-semibold italic ${style.text}`}>
                      {example.text}
                    </p>
                    <p className="mt-1 text-[15px] text-ink-soft">{example.translation}</p>
                    {example.note && <p className="mt-1 text-xs text-muted">{example.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </article>

        <aside className="min-w-0 border-t border-ink pt-6 lg:border-t-0 lg:border-l lg:border-line lg:pt-0 lg:pl-10">
          {/* Remounted per point: the exercise state belongs to it. */}
          <GrammarPractice key={point.id} point={point} language={language} card={card} today={today} persist={persist} />
        </aside>
      </div>

      {status === "ai" && (
        <p className="mt-8 text-xs text-muted">
          Relu par IA, pas encore par un natif.{" "}
          <Link
            href={`/retour?depuis=/grammaire/${language}/${point.id}`}
            className="inline-flex min-h-11 items-center font-medium underline underline-offset-2 hover:text-ink"
          >
            Signaler une erreur
          </Link>
        </p>
      )}
    </div>
  );
}
