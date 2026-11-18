import { getTranslations } from "next-intl/server";

/** Sign-in and sign-up: one centred column, the name of the app above the title. */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("common");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <p className="meta mb-6">{t("appName")}</p>
      {children}
    </main>
  );
}
