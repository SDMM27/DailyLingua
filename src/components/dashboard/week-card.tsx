import { FlameIcon } from "@/components/icons";
import { formatLongDate, weekdayInitial } from "@/lib/domain/dates";
import type { DayCell } from "@/lib/domain/stats";

export interface DashboardStats {
  streak: number;
  daysStudied: number;
  wordsKnown: number;
  weekMinutes: number;
}

/** Figures in a row of big serif numbers split by thin vertical rules, and the week as a strip of days. */
export function WeekCard({ days, stats, showStreak = true }: { days: DayCell[]; stats: DashboardStats; showStreak?: boolean }) {
  const items = [
    ...(showStreak ? [{ label: "jours d’affilée", value: stats.streak, streak: true }] : []),
    { label: "jours étudiés", value: stats.daysStudied, streak: false },
    { label: "mots maîtrisés", value: stats.wordsKnown, streak: false },
    { label: "min cette semaine", value: stats.weekMinutes, streak: false },
  ];
  return (
    <section className="border-t border-ink pt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">
      <dl className="grid grid-cols-2 gap-y-6 sm:grid-flow-col sm:auto-cols-fr">
        {items.map((item) => (
          <div
            key={item.label}
            className="border-l border-line pl-4 max-sm:odd:border-l-0 max-sm:odd:pl-0 sm:first:border-l-0 sm:first:pl-0"
          >
            <dd className="flex items-center gap-2 font-serif text-4xl leading-none font-bold">
              {item.streak && <FlameIcon width={22} height={22} className="text-accent-strong" aria-hidden="true" />}
              {item.value}
            </dd>
            <dt className="kicker mt-2 text-muted">{item.label}</dt>
          </div>
        ))}
      </dl>
      <ol
        className="mt-6 flex justify-between gap-1.5 border-t border-line pt-5 lg:mt-0 lg:justify-end lg:gap-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10"
        aria-label="Sept derniers jours"
      >
        {days.map((day) => (
          <li key={day.date} className="flex flex-col items-center gap-1">
            <span
              className={`size-7 rounded-full border transition-colors sm:size-8 ${
                day.studied
                  ? "border-ink bg-ink"
                  : day.isToday
                    ? "border-dashed border-ink-soft"
                    : "border-line bg-surface-sunk"
              }`}
              title={`${formatLongDate(day.date)} : ${day.studied ? "étudié" : "pas d’étude"}`}
            />
            <span className={`font-mono text-[10px] uppercase ${day.isToday ? "font-bold text-ink" : "text-muted"}`}>
              {weekdayInitial(day.date)}
            </span>
            <span className="sr-only">{day.studied ? "étudié" : "non étudié"}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
