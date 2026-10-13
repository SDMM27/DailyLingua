import Link from "next/link";
import { ArrowRightIcon, ClockIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { Card, Eyebrow, LanguageTag, ProgressBar } from "@/components/ui/primitives";
import { CONTENT_TYPE_LABELS } from "@/lib/domain/labels";
import { missionMinutes, sessionMinutes } from "@/lib/domain/time-budget";
import type { Mission } from "@/lib/schemas/mission";

export function MissionSummaryCard({ mission, doneMinutes }: { mission: Mission; doneMinutes: number }) {
  const total = missionMinutes(mission);
  return (
    <Card className="p-0 sm:p-0">
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-between">
          <Eyebrow>Mission du jour</Eyebrow>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
            <ClockIcon width={14} height={14} />
            {total} min
          </span>
        </div>
        <ProgressBar value={doneMinutes / total} label="Progression de la mission" className="mt-4" />
        <p className="mt-2 text-xs text-muted">
          {doneMinutes} / {total} min réalisées
        </p>
      </div>

      <ul className="mt-2 divide-y divide-line">
        {mission.sessions.map((session) => {
          const { content } = session;
          return (
            <li key={session.language} className="flex gap-4 px-5 py-4 sm:px-6">
              <span
                className={`mt-1 w-1 shrink-0 self-stretch rounded-full ${languageStyle(session.language).bg}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <LanguageTag language={session.language} />
                  <span className="text-xs font-medium text-ink-soft">{sessionMinutes(session)} min</span>
                </div>
                <p lang={session.language} className="mt-2 font-serif text-[17px] leading-snug font-medium">
                  {content.title}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {CONTENT_TYPE_LABELS[content.type]} · {content.source.name} · {content.difficulty}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <Link
          href="/mission"
          className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98]"
        >
          {doneMinutes > 0 ? "Reprendre la mission" : "Commencer la mission"}
          <ArrowRightIcon width={18} height={18} />
        </Link>
      </div>
    </Card>
  );
}
