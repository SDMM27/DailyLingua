import type { Metadata } from "next";
import { connection } from "next/server";
import { ExternalIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { Card, PageHeader, ProgressBar } from "@/components/ui/primitives";
import { getRepository } from "@/lib/data/repository";
import { formatLongDate } from "@/lib/domain/dates";
import { CONTENT_TYPE_LABELS } from "@/lib/domain/labels";

export const metadata: Metadata = { title: "Historique" };

export default async function HistoryPage() {
  await connection();
  const history = await (await getRepository()).getHistory();

  return (
    <>
      <PageHeader eyebrow="Historique" title="Missions passées">
        Les contenus restent accessibles à leur source d’origine.
      </PageHeader>
      {history.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Aucune mission terminée pour l’instant.</p>
      ) : (
        <ol className="space-y-4">
          {history.map((entry) => (
            <li key={entry.id}>
              <Card>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-serif text-lg font-semibold first-letter:uppercase">
                    {formatLongDate(entry.date)}
                  </h2>
                  <span className="text-xs font-medium text-muted">
                    {entry.completedMinutes} / {entry.budgetMinutes} min
                  </span>
                </div>
                <ProgressBar
                  value={entry.completedMinutes / entry.budgetMinutes}
                  label={`Mission du ${formatLongDate(entry.date)}`}
                  className="mt-3"
                />
                <ul className="mt-4 space-y-3">
                  {entry.sessions.map((s) => (
                    <li key={s.language} className="flex gap-3">
                      <span
                        className={`mt-1 w-1 shrink-0 self-stretch rounded-full ${languageStyle(s.language).bg}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          lang={s.language}
                          className="group inline font-serif text-[16px] leading-snug font-medium hover:underline"
                        >
                          {s.title}
                          <ExternalIcon width={13} height={13} className="ml-1 inline text-muted" />
                        </a>
                        <p className="mt-0.5 text-xs text-muted">
                          {CONTENT_TYPE_LABELS[s.type]} · {s.sourceName}
                          {s.score && ` · quiz ${s.score.correct}/${s.score.total}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
