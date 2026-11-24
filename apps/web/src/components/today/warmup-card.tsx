import { languageDisplayName } from "@dailylingua/core";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { languageStyle } from "@/lib/units/language-style";
import type { DueWarmup } from "@/lib/units/warmup";

/**
 * The sentences missed at a unit test yesterday (or before), to redo before the test: from the learning day after the
 * test. One card for all units, leading to the first one; the warm-up itself is in the unit.
 */
export async function WarmupCard({ warmups, language, locale }: { warmups: DueWarmup[]; language: string; locale: string }) {
  const t = await getTranslations("warmup");
  const first = warmups[0];
  if (!first) return null;
  const explanation = locale === "fr" ? "fr" : "en";
  const count = warmups.reduce((sum, warmup) => sum + warmup.itemIds.length, 0);
  return (
    <article aria-labelledby="warmup-card-title" style={languageStyle(language)} className="mt-5 space-y-3 rounded-card border border-line bg-surface p-5">
      <p className="meta text-lang">{t("meta", { title: languageDisplayName(language, locale) })}</p>
      <h2 id="warmup-card-title" className="sd-display text-2xl">{t("title", { count })}</h2>
      <p className="text-sm text-muted" lang={explanation}>{first.unit.title[explanation]}</p>
      <Link href={`/parcours/${language}/${first.unit.id}`} className={`${buttonClass("secondary")} w-full`}>{t("go")}</Link>
    </article>
  );
}
