import Link from "next/link";
import { ArrowRightIcon, ClockIcon } from "@/components/icons";
import { buttonClass, Eyebrow,LanguageTag, ProgressBar } from "@/components/ui/primitives";
import { CONTENT_TYPE_LABELS } from "@/lib/domain/labels";
import { missionMinutes, sessionMinutes } from "@/lib/domain/time-budget";
import type { Mission } from "@/lib/schemas/mission";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/** The day's mission as the front-page story: one numbered item per language, then the call to action. */
export function MissionSummaryCard({ mission, doneMinutes }: { mission: Mission; doneMinutes: number }) {
  const total = missionMinutes(mission);
  return (
    <article className="border-t border-ink pt-4">
      <div className="flex items-center justify-between">
        <Eyebrow>Mission du jour</Eyebrow>
        <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-muted">
          <ClockIcon width={14} height={14} />
          {total} min
        </span>
      </div>
      <ProgressBar value={doneMinutes / total} label="Progression de la mission" className="mt-4" />
      <p className="mt-2 font-mono text-xs text-muted">
        {doneMinutes} / {total} min réalisées
      </p>

      <ol className="mt-4 divide-y divide-line border-y border-line">
        {mission.sessions.map((session, i) => {
          const { content } = session;
          return (
            <li key={session.language} className="flex gap-4 py-5">
              <span
                className="w-8 shrink-0 font-serif text-2xl leading-none font-extrabold text-accent-strong"
                aria-hidden="true"
              >
                {ROMAN[i] ?? i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <LanguageTag language={session.language} />
                  <span className="font-mono text-xs font-medium text-ink-soft">{sessionMinutes(session)} min</span>
                </div>
                <p lang={session.language} className="mt-3 font-serif text-2xl leading-tight font-semibold text-balance sm:text-3xl">
                  {content.title}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {CONTENT_TYPE_LABELS[content.type]} · {content.source.name} · {content.difficulty}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5">
        <Link href="/mission" className={`${buttonClass.primary} w-full sm:w-auto`}>
          {doneMinutes > 0 ? "Reprendre la mission" : "Commencer la mission"}
          <ArrowRightIcon width={18} height={18} />
        </Link>
      </div>
    </article>
  );
}
