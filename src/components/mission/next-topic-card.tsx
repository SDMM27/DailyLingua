import { Eyebrow, LanguageTag } from "@/components/ui/primitives";
import { getRepository } from "@/lib/data/repository";
import { addDays, isoWeekday } from "@/lib/domain/dates";
import { WEEKDAY_NAMES } from "@/lib/domain/labels";
import { languageInfo } from "@/lib/domain/languages";
import { wantedLevels } from "@/lib/domain/levels";
import { nextWorkedDate } from "@/lib/domain/schedule";
import { availableTopics } from "@/lib/domain/topics";
import type { DateKey, Language } from "@/lib/schemas/common";
import type { MissionRequest } from "@/lib/schemas/mission-request";
import type { Topic } from "@/lib/schemas/preferences";
import { NextTopicForm } from "./next-topic-form";

export interface NextTopicRow {
  language: Language;
  /** The next day this language is worked. */
  date: DateKey;
  saved: Topic | null;
  available: Topic[];
}

/** « demain », or the weekday in full (« jeudi ») when the next worked day is further away. */
export function dayLabel(date: DateKey, today: DateKey): string {
  return date === addDays(today, 1) ? "demain" : WEEKDAY_NAMES[isoWeekday(date) - 1];
}

/** « Demain, plutôt » for each language: the card itself, without data access (see `NextTopicCard`). */
export function NextTopicCardView({ rows, today }: { rows: NextTopicRow[]; today: DateKey }) {
  return (
    <section className="border-t border-ink pt-5">
      <Eyebrow>Demain, plutôt</Eyebrow>
      <p className="mt-2 max-w-[68ch] font-serif text-lg text-ink-soft">
        Choisis le thème de ta prochaine mission, langue par langue.
      </p>
      <ul className="mt-5 grid gap-x-10 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const day = dayLabel(row.date, today);
          return (
            <li key={row.language} className="min-w-0 border-t border-line pt-4">
              <div className="mb-1.5 flex items-center gap-2 text-sm">
                <LanguageTag language={row.language} />
                <span className="text-ink-soft">{day}</span>
              </div>
              {row.available.length === 0 && !row.saved ? (
                <p className="text-sm text-muted">Pas encore assez de contenus récents pour choisir un thème.</p>
              ) : (
                <NextTopicForm
                  language={row.language}
                  label={`Thème de la mission de ${day} en ${languageInfo(row.language).nameFr}`}
                  saved={row.saved}
                  available={row.available}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Server side: loads the preferences, the requests already made and the domains with enough
 * contents at each language's level. Nothing is shown in the demo or for a guest (the choice is
 * saved to an account), nor when there is no language.
 */
export async function NextTopicCard({ today, requests }: { today: DateKey; requests?: MissionRequest[] }) {
  const repo = await getRepository();
  if (repo.isDemo || (await repo.getGuestTrial())) return null;
  const preferences = await repo.getPreferences();
  if (!preferences) return null;
  const made = requests ?? (await repo.listMissionRequests());
  const rows: NextTopicRow[] = await Promise.all(
    preferences.goals.map(async (goal) => {
      const date = nextWorkedDate(goal.days, today);
      const counts = await repo.listTopicAvailability(goal.language, wantedLevels(goal.level, preferences.difficulty));
      return {
        language: goal.language,
        date,
        saved: made.find((r) => r.date === date && r.language === goal.language)?.topic ?? null,
        available: availableTopics(counts),
      };
    }),
  );
  // Nothing to choose from in any language: a card of empty lists would only be noise.
  if (rows.every((row) => row.available.length === 0 && !row.saved)) return null;
  return <NextTopicCardView rows={rows} today={today} />;
}
