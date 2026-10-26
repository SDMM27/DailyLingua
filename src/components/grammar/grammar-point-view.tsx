import Link from "next/link";
import { languageStyle } from "@/components/ui/language-style";
import { Card, Eyebrow, LanguageTag } from "@/components/ui/primitives";
import { languageInfo } from "@/lib/domain/languages";
import type { DateKey, Language } from "@/lib/schemas/common";
import type { GrammarCard, GrammarPoint } from "@/lib/schemas/grammar";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/grammaire?langue=${language}`}
          className="min-h-11 content-center text-sm font-medium text-muted hover:text-ink"
        >
          ← Grammaire
        </Link>
        <div className="flex items-center gap-2">
          <LanguageTag language={language} />
          {point.reviewedOn === null && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">
              Non relue
            </span>
          )}
        </div>
      </div>

      <header>
        <Eyebrow className="mb-2">Niveau {point.level}</Eyebrow>
        <h1 className="font-serif text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance sm:text-4xl">
          {point.title}
        </h1>
      </header>

      <Card className="space-y-3">
        <Eyebrow>La règle</Eyebrow>
        {point.rule.map((paragraph, i) => (
          <p key={i} className="text-[15px] leading-relaxed text-ink-soft">
            {paragraph}
          </p>
        ))}

        {table && (
          // The table scrolls inside its container, not the page.
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-max border-collapse text-left text-sm">
              {table.caption && <caption className="px-3 py-2 text-left text-xs text-muted">{table.caption}</caption>}
              <thead>
                <tr className="bg-surface-sunk">
                  {table.headers.map((header) => (
                    <th key={header} scope="col" className="px-3 py-2 text-xs font-semibold text-ink-soft">
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
                      <td key={j} lang={j === 0 ? undefined : language} dir="auto" className="px-3 py-2 font-serif">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <section aria-label="Exemples">
        <Eyebrow className="mb-3">Exemples</Eyebrow>
        <ul className="space-y-3">
          {point.examples.map((example) => (
            <li key={example.text} className="rounded-2xl border border-line bg-surface px-4 py-3">
              <p lang={language} dir={dir} className={`font-serif text-lg font-semibold ${style.text}`}>
                {example.text}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{example.translation}</p>
              {example.note && <p className="mt-1 text-xs text-muted">{example.note}</p>}
            </li>
          ))}
        </ul>
      </section>

      {/* Remounted per point: the exercise state belongs to it. */}
      <GrammarPractice key={point.id} point={point} language={language} card={card} today={today} persist={persist} />
    </div>
  );
}
