import { FlameIcon } from "@/components/icons";
import { Card } from "@/components/ui/primitives";
import { formatLongDate, weekdayInitial } from "@/lib/domain/dates";
import type { DayCell } from "@/lib/domain/stats";

export interface DashboardStats {
  streak: number;
  daysStudied: number;
  wordsKnown: number;
  weekMinutes: number;
}

export function WeekCard({ days, stats }: { days: DayCell[]; stats: DashboardStats }) {
  const items = [
    { label: "jours étudiés", value: stats.daysStudied },
    { label: "mots maîtrisés", value: stats.wordsKnown },
    { label: "min cette semaine", value: stats.weekMinutes },
  ];
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-terracotta-soft text-terracotta">
            <FlameIcon width={18} height={18} />
          </span>
          <div>
            <p className="font-serif text-2xl leading-none font-semibold">{stats.streak}</p>
            <p className="mt-0.5 text-xs text-muted">jours d’affilée</p>
          </div>
        </div>
        <ol className="flex gap-1.5" aria-label="Sept derniers jours">
          {days.map((day) => (
            <li key={day.date} className="flex flex-col items-center gap-1">
              <span
                className={`size-6 rounded-full border transition-colors sm:size-7 ${
                  day.studied
                    ? "border-ink bg-ink"
                    : day.isToday
                      ? "border-dashed border-ink-soft"
                      : "border-line bg-surface-sunk"
                }`}
                title={`${formatLongDate(day.date)} : ${day.studied ? "étudié" : "pas d’étude"}`}
              />
              <span className={`text-[10px] uppercase ${day.isToday ? "font-bold text-ink" : "text-muted"}`}>
                {weekdayInitial(day.date)}
              </span>
              <span className="sr-only">{day.studied ? "étudié" : "non étudié"}</span>
            </li>
          ))}
        </ol>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
        {items.map((item) => (
          <div key={item.label}>
            <dd className="font-serif text-xl font-semibold">{item.value}</dd>
            <dt className="text-[11px] leading-tight text-muted">{item.label}</dt>
          </div>
        ))}
      </dl>
    </Card>
  );
}
