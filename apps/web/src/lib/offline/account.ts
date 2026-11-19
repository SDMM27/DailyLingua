import { isValidTimeZone } from "@dailylingua/core";
import { resolveUiLocale, type UiLocale } from "@dailylingua/i18n";
import { languageCodeSchema } from "@dailylingua/schemas";
import { z } from "zod";

const ACCOUNT_KEY = "dailylingua-offline-account";
const CHANGE_EVENT = "dailylingua-offline-account-change";
const revisionKey = (id: string) => `${ACCOUNT_KEY}:revoked:${id}`;

const accountSchema = z.object({
  userId: z.uuid(),
  language: languageCodeSchema,
  timeZone: z.string().min(1).max(100).refine(isValidTimeZone),
  locale: z.string(),
});

export type OfflineAccount = Omit<z.infer<typeof accountSchema>, "locale"> & { locale: UiLocale };
export const ACCOUNT_HEADER = "x-dailylingua-user";

export function offlineAccountSnapshot(): string | null {
  try { return localStorage.getItem(ACCOUNT_KEY); } catch { return null; }
}

export function parseOfflineAccount(snapshot: string | null): OfflineAccount | null {
  if (!snapshot) return null;
  try {
    const data = accountSchema.parse(JSON.parse(snapshot));
    return { ...data, locale: resolveUiLocale(data.locale) };
  } catch {
    return null;
  }
}

export function subscribeToOfflineAccount(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(CHANGE_EVENT, notify);
  };
}

export function offlineAccountRevision(userId: string): string | null {
  try { return localStorage.getItem(revisionKey(userId)); } catch { return null; }
}

/** Only remember an account after its packet was fetched under that same authenticated identity. */
export function rememberOfflineAccount(account: OfflineAccount, expectedRevision: string | null) {
  try {
    if (offlineAccountRevision(account.userId) !== expectedRevision) return;
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch { /* Offline storage can be disallowed by the browser. */ }
}

export function forgetOfflineAccount(userId: string) {
  try {
    // Invalidate packet requests that were already running when this account signed out.
    localStorage.setItem(revisionKey(userId), crypto.randomUUID());
    if (parseOfflineAccount(offlineAccountSnapshot())?.userId === userId) {
      localStorage.removeItem(ACCOUNT_KEY);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  } catch { /* Settings and sign-out remain available without local storage. */ }
}
