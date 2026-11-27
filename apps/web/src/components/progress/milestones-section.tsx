import type { NextStep } from "@dailylingua/core";
import { getLocale, getTranslations } from "next-intl/server";

export interface EarnedBadge {
  badgeId: string;
  awardedAt: string;
}

const NEW_DAYS = 7;
const DAY_MS = 86_400_000;

/**
 * "Milestones" block of the progress page: the badges earned for the language (name and date, "New" for a week), then one
 * line per family for the next step. No grid of empty slots.
 */
export async function MilestonesSection({ earned, steps, now }: { earned: EarnedBadge[]; steps: NextStep[]; now: Date }) {
  const [t, tSkill, locale] = await Promise.all([getTranslations("milestones"), getTranslations("progress"), getLocale()]);
  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });

  function name(id: string): string {
    let match = /^words_(\d+)$/.exec(id);
    if (match) return t("names.words", { count: Number(match[1]) });
    match = /^level_(reading|listening|writing|speaking)_(a1|a2|b1|b2|c1|c2)$/.exec(id);
    if (match) return t("names.level", { level: match[2]!.toUpperCase(), skill: tSkill(match[1] as "reading").toLowerCase() });
    match = /^reading_(\d+)$/.exec(id);
    if (match) return t("names.reading", { count: Number(match[1]) });
    match = /^practice_(\d+)h$/.exec(id);
    if (match) return t("names.practice", { hours: Number(match[1]) });
    return t(`names.${id}` as "names.rewrite_50");
  }

  return (
    <section aria-labelledby="progress-milestones" className="mt-2" data-testid="milestones">
      <h2 id="progress-milestones" className="font-display text-2xl font-semibold">{t("title")}</h2>
      {earned.length === 0 ? <p className="mt-2 text-sm text-muted">{t("none")}</p> : (
        <ul className="mt-3 divide-y divide-line">
          {earned.map((badge) => {
            const fresh = now.getTime() - Date.parse(badge.awardedAt) < NEW_DAYS * DAY_MS;
            return (
              <li key={badge.badgeId} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 py-2">
                <span className="font-semibold">{name(badge.badgeId)}{fresh && <span className="ms-2 text-sm font-normal text-accent-strong">{t("new")}</span>}</span>
                <time dateTime={badge.awardedAt} className="text-sm text-muted">{dateFormat.format(new Date(badge.awardedAt))}</time>
              </li>
            );
          })}
        </ul>
      )}
      {steps.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-muted">
          {steps.map((step) => (
            <li key={step.family}>{t(`next.${step.family}` as "next.words", { target: step.target, current: step.current })}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
