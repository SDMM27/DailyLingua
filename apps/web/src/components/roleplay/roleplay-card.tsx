import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";

export async function RoleplayCard() {
  const t = await getTranslations("roleplay");
  return (
    <article className="space-y-3 rounded-card border border-line bg-surface p-5">
      <h2 className="sd-display text-2xl">{t("title")}</h2>
      <p className="text-sm text-muted">{t("description")}</p>
      <Link href="/roleplay?from=oral" className={`${buttonClass("secondary")} w-full`}>{t("open")}</Link>
    </article>
  );
}
