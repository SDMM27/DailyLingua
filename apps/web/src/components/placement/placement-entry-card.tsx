import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/** On the progress page: the level of the language is not measured yet, the placement test does it. */
export async function PlacementEntryCard({ language, languageName }: { language: string; languageName: string }) {
  const t = await getTranslations("placement");
  return (
    <section aria-labelledby="progress-placement" className="mb-6 rounded-3xl bg-accent-soft p-6">
      <h2 id="progress-placement" className="font-display text-2xl font-semibold">{t("title", { language: languageName })}</h2>
      <p className="mt-1 mb-4 text-muted">{t("cardBody")}</p>
      <Link href={`/placement/${language}`} className={`${buttonClass("primary")} md:w-auto md:px-8`}>{t("start")}</Link>
    </section>
  );
}
