import type { DateKey } from "@/lib/schemas/common";

export const DEFAULT_TIME_ZONE = "Europe/Paris";

const MS_PER_DAY = 86_400_000;

/** Calendar day (YYYY-MM-DD) of `instant` as seen in `timeZone`. */
export function toDateKey(instant: Date, timeZone: string = DEFAULT_TIME_ZONE): DateKey {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function keyToUtcMs(key: DateKey): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(key: DateKey, days: number): DateKey {
  return new Date(keyToUtcMs(key) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffInDays(from: DateKey, to: DateKey): number {
  return Math.round((keyToUtcMs(to) - keyToUtcMs(from)) / MS_PER_DAY);
}

/** "mardi 13 octobre" — the key is already a local day, so format it in UTC. */
export function formatLongDate(key: DateKey, locale = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(keyToUtcMs(key)));
}

/** "13 oct." */
export function formatShortDate(key: DateKey, locale = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(new Date(keyToUtcMs(key)));
}

/** One-letter weekday initial, e.g. "L" for lundi. */
export function weekdayInitial(key: DateKey, locale = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "narrow" }).format(
    new Date(keyToUtcMs(key)),
  );
}
