import type { DateKey } from "@/lib/schemas/common";

export const DEFAULT_TIME_ZONE = "Europe/Paris";

const MS_PER_DAY = 86_400_000;

/** Whether `timeZone` is an IANA zone name the runtime can format dates in. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

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

/**
 * How long ago an instant was, for publication dates: "il y a 5 min", "il y a 3 h", "hier",
 * "il y a 4 jours", then the calendar date in `timeZone` beyond a week.
 */
export function formatTimeAgo(instant: Date, now: Date, timeZone: string = DEFAULT_TIME_ZONE, locale = "fr-FR"): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - instant.getTime()) / 60_000));
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 60) return minutes < 1 ? "à l’instant" : relative.format(-minutes, "minute");
  if (minutes < 24 * 60) return relative.format(-Math.floor(minutes / 60), "hour");
  const days = diffInDays(toDateKey(instant, timeZone), toDateKey(now, timeZone));
  if (days < 7) return relative.format(-days, "day");
  return formatShortDate(toDateKey(instant, timeZone), locale);
}
