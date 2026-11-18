import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RetryButton } from "@/components/pwa/retry-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offline");
  return { title: t("title") };
}

/**
 * Shown by the service worker when a page cannot be fetched. Public and free of user data: it is
 * pre-cached for every visitor.
 */
export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <h1 className="sd-display text-3xl">{t("title")}</h1>
      <p className="text-muted">{t("body")}</p>
      <RetryButton>{t("retry")}</RetryButton>
    </main>
  );
}
