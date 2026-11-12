import { loadMessages } from "@dailylingua/i18n";
import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, pickUiLocale } from "@/lib/locale";
import { getSessionProfile } from "@/lib/session";

/**
 * next-intl without a language segment in the URL: the language comes from the request (profile,
 * cookie, `Accept-Language`), see `pickUiLocale`.
 */
export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  let profileLocale: string | null = null;
  try {
    profileLocale = (await getSessionProfile())?.uiLanguage ?? null;
  } catch {
    // Database unreachable or session rejected: fall back to the cookie and the browser language.
  }
  const locale = pickUiLocale({
    profileLocale,
    cookieLocale: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
  return { locale, messages: await loadMessages(locale) };
});
