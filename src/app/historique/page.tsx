import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ExternalIcon } from "@/components/icons";
import { WritingFeedbackCard } from "@/components/mission/writing-feedback-card";
import { languageStyle } from "@/components/ui/language-style";
import { PageHeader, ProgressBar } from "@/components/ui/primitives";
import { getRepository, requirePreferences } from "@/lib/data/repository";
import { formatLongDate } from "@/lib/domain/dates";
import { CONTENT_TYPE_LABELS } from "@/lib/domain/labels";

export const metadata: Metadata = { title: "Historique" };

export default async function HistoryPage() {
  await connection();
  await requirePreferences();
  const history = await (await getRepository()).getHistory();

  return (
    <>
      <PageHeader eyebrow="Historique" title="Missions passées">
        Les contenus restent accessibles à leur source d’origine.{" "}
        <Link href="/productions" className="font-medium text-accent-strong underline underline-offset-4">
          Voir mes productions écrites
        </Link>
      </PageHeader>
      {history.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Aucune mission terminée pour l’instant.</p>
      ) : (
        <ol className="border-b border-line">
          {history.map((entry) => (
            <li key={entry.id} className="border-t border-line py-5 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
              <div>
                <h2 className="kicker text-accent-strong">{formatLongDate(entry.date)}</h2>
                <p className="mt-1 font-serif text-3xl font-extrabold tabular-nums">
                  {entry.completedMinutes} / {entry.budgetMinutes} min
                </p>
                <ProgressBar
                  value={entry.completedMinutes / entry.budgetMinutes}
                  label={`Mission du ${formatLongDate(entry.date)}`}
                  className="mt-3"
                />
              </div>
              <div className="mt-5 lg:mt-0">
                <ul className="grid gap-x-10 gap-y-5 md:grid-cols-2">
                  {entry.sessions.map((s) => (
                    <li key={s.language} className="flex gap-3">
                      <span
                        className={`mt-2 size-2 shrink-0 rounded-full ${languageStyle(s.language).bg}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          lang={s.language}
                          className="group inline font-serif text-lg leading-snug font-bold hover:underline"
                        >
                          {s.title}
                          <ExternalIcon width={13} height={13} className="ml-1 inline text-muted" />
                        </a>
                        <p className="kicker mt-1 text-muted">
                          {CONTENT_TYPE_LABELS[s.type]} · {s.sourceName}
                          {s.score && ` · quiz ${s.score.correct}/${s.score.total}`}
                        </p>
                        {s.writing && (
                          <details className="mt-2 text-sm">
                            <summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-ink-soft">
                              Mon texte
                            </summary>
                            <p lang={s.language} className="mt-2 font-serif leading-relaxed whitespace-pre-wrap">
                              {s.writing}
                            </p>
                          </details>
                        )}
                        {s.feedback && (
                          <details className="mt-2 text-sm">
                            <summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-ink-soft">
                              Correction
                            </summary>
                            <div className="mt-2">
                              <WritingFeedbackCard language={s.language} feedback={s.feedback} />
                            </div>
                          </details>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
