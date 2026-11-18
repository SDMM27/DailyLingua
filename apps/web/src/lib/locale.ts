import { resolveUiLocale, uiLocales, type UiLocale } from "@dailylingua/i18n";

/** Cookie holding the interface language of a visitor (and of a signed-in user, as a fallback). */
export const LOCALE_COOKIE = "dl_locale";

function available(code: string | null | undefined): code is UiLocale {
  return code !== null && code !== undefined && (uiLocales as readonly string[]).includes(code);
}

/**
 * Interface language of a request, in this order: the language saved in the profile (signed in),
 * the `dl_locale` cookie, the `Accept-Language` header, then English. A value that is not an
 * available interface language is skipped, not turned into the default.
 */
export function pickUiLocale({
  profileLocale,
  cookieLocale,
  acceptLanguage,
}: {
  profileLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): UiLocale {
  const requested = [profileLocale, cookieLocale].find(available);
  return resolveUiLocale(requested, acceptLanguage);
}
