import { addDays } from "@/lib/domain/dates";
import type { DateKey } from "@/lib/schemas/common";
import type { MissionHistoryEntry } from "@/lib/schemas/mission";

/** Days ago on which a session took place (today excluded: today's mission is pending). */
const STUDIED_DAYS_AGO = [
  1, 2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 14, 16, 17, 19, 20, 21, 22, 24, 26, 27, 28, 30, 31,
];

const PAST_SESSIONS: MissionHistoryEntry["sessions"][] = [
  [
    {
      language: "ru",
      title: "Как читать Платонова: язык, который сопротивляется",
      sourceName: "Arzamas",
      url: "https://arzamas.academy",
      type: "podcast",
      score: { correct: 3, total: 3 },
    },
    {
      language: "it",
      title: "Le città italiane che si svuotano",
      sourceName: "Il Post",
      url: "https://www.ilpost.it",
      type: "article",
      score: { correct: 2, total: 3 },
    },
  ],
  [
    {
      language: "ru",
      title: "Почему мы так плохо запоминаем лица",
      sourceName: "ПостНаука",
      url: "https://postnauka.org",
      type: "video",
      score: { correct: 2, total: 3 },
    },
    {
      language: "it",
      title: "Intervista: il mestiere del doppiatore",
      sourceName: "Rai Radio 3",
      url: "https://www.raiplaysound.it",
      type: "interview",
      score: null,
    },
  ],
  [
    {
      language: "ru",
      title: "Сибирские города: жизнь после заводов",
      sourceName: "Медуза",
      url: "https://meduza.io",
      type: "article",
      score: { correct: 3, total: 4 },
    },
    {
      language: "it",
      title: "Che cosa mangiavano gli antichi romani",
      sourceName: "Focus",
      url: "https://www.focus.it",
      type: "article",
      score: { correct: 3, total: 3 },
    },
  ],
];

const COMPLETED_MINUTES = [30, 26, 30, 22, 30, 18];

export function buildMockStudyDates(today: DateKey): DateKey[] {
  return STUDIED_DAYS_AGO.map((n) => addDays(today, -n));
}

export function buildMockHistory(today: DateKey): MissionHistoryEntry[] {
  return STUDIED_DAYS_AGO.slice(0, 6).map((daysAgo, i) => {
    const date = addDays(today, -daysAgo);
    return {
      id: `mission-${date}`,
      date,
      budgetMinutes: 30,
      completedMinutes: COMPLETED_MINUTES[i],
      sessions: PAST_SESSIONS[i % PAST_SESSIONS.length],
    };
  });
}
