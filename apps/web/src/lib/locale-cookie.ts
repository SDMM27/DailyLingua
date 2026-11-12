import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "./locale";

/** Remembers the interface language in a cookie (for the sign-in screen, and as a fallback). */
export async function rememberLocale(locale: string): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
