import { languageDisplayName } from "@dailylingua/core";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { languageStyle } from "@/lib/units/language-style";

/**
 * « À voix haute » below the session of the day, when the learner's language has sentences to say. A secondary card:
 * one line about what it is and one secondary button, never a filled one (the session is the main action).
 */
export async function OralCard({ language, locale, count }: { language: string; locale: string; count: number }) {
  const t = await getTranslations("oral.card");
  return (
    <article aria-labelledby="oral-card-title" style={languageStyle(language)} className="mt-5 space-y-3 rounded-card border border-line bg-surface p-5">
      <p className="meta text-lang">{t("meta", { language: languageDisplayName(language, locale) })}</p>
      <h2 id="oral-card-title" className="sd-display text-2xl">{t("title")}</h2>
      <p className="text-sm text-muted">{t("body", { count })}</p>
      <Link href="/oral" className={`${buttonClass("secondary")} w-full`}>{t("open")}</Link>
    </article>
  );
}
