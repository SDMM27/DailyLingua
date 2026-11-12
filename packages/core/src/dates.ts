import type { DateKey } from "@dailylingua/schemas";

export const DEFAULT_TIME_ZONE = "Europe/Paris";

/** A learning day starts at 04:00 local time: an action at 00:30 still counts for the day before. */
export const LEARNING_DAY_START_HOUR = 4;

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
  const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(key: DateKey, days: number): DateKey {
  return new Date(keyToUtcMs(key) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffInDays(from: DateKey, to: DateKey): number {
  return Math.round((keyToUtcMs(to) - keyToUtcMs(from)) / MS_PER_DAY);
}

/** Wall-clock fields of `instant` in `timeZone`. */
function localParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Learning day of `instant`: it runs from 04:00 to 03:59 local time in `timeZone`. */
export function learningDay(instant: Date, timeZone: string = DEFAULT_TIME_ZONE): DateKey {
  const key = toDateKey(instant, timeZone);
  return localParts(instant, timeZone).hour < LEARNING_DAY_START_HOUR ? addDays(key, -1) : key;
}

/**
 * The instant at which the wall clock of `timeZone` reads `time` (HH:mm) on the local day `dateKey`.
 * Like Temporal's "compatible" rule: an ambiguous time (autumn change) maps to its first occurrence,
 * a time skipped by a spring-forward change is pushed forward by the length of the gap.
 */
export function localTime(dateKey: DateKey, time: string, timeZone: string = DEFAULT_TIME_ZONE): Date {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) throw new RangeError(`Expected HH:mm, got "${time}"`);
  const wallAsUtc = keyToUtcMs(dateKey) + (Number(match[1]) * 60 + Number(match[2])) * 60_000;
  // Offset (local minus UTC) in force at an instant.
  const offsetAt = (ms: number) => {
    const p = localParts(new Date(ms), timeZone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
  };
  // A change is at most a day away from the wall time: the offsets just before and after bracket the candidates.
  const offsets = [offsetAt(wallAsUtc - MS_PER_DAY), offsetAt(wallAsUtc + MS_PER_DAY)];
  const valid = offsets.map((offset) => wallAsUtc - offset).filter((ms) => offsetAt(ms) === wallAsUtc - ms);
  if (valid.length > 0) return new Date(Math.min(...valid));
  // In the gap: read the wall time with the offset in force before the change.
  return new Date(wallAsUtc - (offsets[0] as number));
}

/** "mardi 13 octobre" — the key is already a local day, so format it in UTC. */
export function formatLongDate(key: DateKey, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(keyToUtcMs(key)));
}

/** "13 oct." */
export function formatShortDate(key: DateKey, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(new Date(keyToUtcMs(key)));
}

/** One-letter weekday initial, e.g. "L" for lundi. */
export function weekdayInitial(key: DateKey, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "narrow" }).format(new Date(keyToUtcMs(key)));
}

/**
 * How long ago an instant was, for publication dates: "5 minutes ago", "3 hours ago", "yesterday",
 * "4 days ago", then the calendar date in `timeZone` beyond a week.
 */
export function formatTimeAgo(instant: Date, now: Date, timeZone: string, locale: string): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - instant.getTime()) / 60_000));
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 60) return relative.format(-minutes, "minute");
  if (minutes < 24 * 60) return relative.format(-Math.floor(minutes / 60), "hour");
  const days = diffInDays(toDateKey(instant, timeZone), toDateKey(now, timeZone));
  if (days < 7) return relative.format(-days, "day");
  return formatShortDate(toDateKey(instant, timeZone), locale);
}

/** ISO weekday of a local day: 1 = Monday … 7 = Sunday. Computed in UTC, the key is already a local day. */
export function isoWeekday(key: DateKey): number {
  return ((new Date(keyToUtcMs(key)).getUTCDay() + 6) % 7) + 1;
}
