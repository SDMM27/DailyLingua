import { languageDisplayName } from "@dailylingua/core";
import type { Unit } from "@dailylingua/schemas";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { currentLessonNumber, unitStarted } from "@/lib/units/flow";
import { languageStyle } from "@/lib/units/language-style";
import type { UnitProgressView } from "@/lib/units/progress";

/**
 * The way into the beginner path, below the session of the day: the next lesson of the first unit not passed, or the
 * start of the path. A plain card, one action.
 */
export async function UnitCard({ unit, progress, language, locale }: {
  unit: Unit;
  progress: UnitProgressView | null;
  language: string;
  locale: string;
}) {
  const t = await getTranslations("today.unit");
  const explanation = locale === "fr" ? "fr" : "en";
  const started = unitStarted(unit, progress);
  return (
    <article aria-labelledby="unit-card-title" style={languageStyle(language)} className="mt-5 space-y-3 rounded-card border border-line bg-surface p-5">
      <p className="meta text-lang">{t("meta", { language: languageDisplayName(language, locale) })}</p>
      <h2 id="unit-card-title" className="sd-display text-2xl" lang={explanation}>{unit.title[explanation]}</h2>
      <p className="text-sm text-muted">{t("lessons", { minutes: unit.minutes })}</p>
      <Link href={`/parcours/${language}/${unit.id}`} className={`${buttonClass("secondary")} w-full`}>
        {started ? t("continue", { lesson: currentLessonNumber(unit, progress) }) : t("start")}
      </Link>
    </article>
  );
}
