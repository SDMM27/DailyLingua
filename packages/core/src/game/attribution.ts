import type { DateKey } from "@dailylingua/schemas";
import { addDays, learningDay } from "../dates";

export const MIN_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

/** Tolerance on an `occurredAt` ahead of the reception instant. */
export const FUTURE_TOLERANCE_MS = 5 * MIN_MS;
/** Tolerance below the instant the server served the item, card or text. */
export const SERVED_TOLERANCE_MS = MIN_MS;
/** Beyond this delay (reception - occurrence) an event is late: kept, but out of the ring, the week and the streak. */
export const LATE_AFTER_MS = 72 * HOUR_MS;
/** Beyond this delay an event is refused (`too_old`). */
export const TOO_OLD_AFTER_MS = 7 * DAY_MS;
/** Minimum gap between two accepted changes of time zone. */
export const TIME_ZONE_CHANGE_GAP_MS = 48 * HOUR_MS;
/** A device clock that goes back by more than this between two events of the same device is counted as a rollback. */
export const CLOCK_ROLLBACK_MS = 2 * MIN_MS;
/** `xp_ledger.day` must lie in [server day - 3, server day + 1] (SQL bound of `ingest_batch`). */
export const LEDGER_DAYS_BEFORE = 3;
export const LEDGER_DAYS_AFTER = 1;

export type Attribution =
  | { ok: true; day: DateKey; late: boolean }
  | { ok: false; reason: "in_future" | "too_old" | "before_served" };

/**
 * Attribution of an event to a learning day (`j2-jeu-xp-serie.md` §3.2). Pure: every input is a parameter.
 *
 * - `occurredAt > receivedAt + 5 min` → `in_future`; `receivedAt - occurredAt > 7 days` → `too_old`;
 * - `occurredAt < servedAt - 1 min` → `before_served` (no antedating; `servedAt` null: nothing to compare);
 * - the day is that of `occurredAt` in `timeZone` (04:00 start), never before `floorDay`, the day of the
 *   previous event of the same device: days are monotone;
 * - `late` above 72 hours.
 */
export function attribute(input: {
  occurredAt: Date;
  receivedAt: Date;
  servedAt: Date | null;
  timeZone: string;
  floorDay: DateKey | null;
}): Attribution {
  const { occurredAt, receivedAt, servedAt, timeZone, floorDay } = input;
  const occurred = occurredAt.getTime();
  const received = receivedAt.getTime();
  if (occurred > received + FUTURE_TOLERANCE_MS) return { ok: false, reason: "in_future" };
  if (received - occurred > TOO_OLD_AFTER_MS) return { ok: false, reason: "too_old" };
  if (servedAt !== null && occurred < servedAt.getTime() - SERVED_TOLERANCE_MS) return { ok: false, reason: "before_served" };
  let day = learningDay(occurredAt, timeZone);
  if (floorDay !== null && day < floorDay) day = floorDay;
  return { ok: true, day, late: received - occurred > LATE_AFTER_MS };
}

/**
 * The day an XP line is written on (`xp_ledger.day`): the day of the action, except for a late event (reception
 * day); always inside the SQL bound [server day - 3, server day + 1].
 */
export function ledgerDay(attribution: { day: DateKey; late: boolean }, serverDay: DateKey): DateKey {
  const earliest = addDays(serverDay, -LEDGER_DAYS_BEFORE);
  const latest = addDays(serverDay, LEDGER_DAYS_AFTER);
  if (attribution.late || attribution.day < earliest) return serverDay;
  return attribution.day > latest ? latest : attribution.day;
}

/** One entry of the time zone journal (`timezone_change`): from `effectiveAt` on, days are cut in `timeZone`. */
export interface TimeZoneChange {
  /** ISO 8601 instant. */
  effectiveAt: string;
  timeZone: string;
}

/** The zone in force at `instant`: the last change at or before it, else the first one (the oldest zone known), else `fallback`. */
export function timeZoneAt(journal: readonly TimeZoneChange[], instant: Date, fallback: string): string {
  if (journal.length === 0) return fallback;
  const sorted = [...journal].sort((a, b) => Date.parse(a.effectiveAt) - Date.parse(b.effectiveAt));
  let zone = (sorted[0] as TimeZoneChange).timeZone;
  for (const change of sorted) {
    if (Date.parse(change.effectiveAt) <= instant.getTime()) zone = change.timeZone;
    else break;
  }
  return zone;
}

/**
 * Whether a device that reports `reportedZone` at `occurredAt` changes the zone of the account
 * (`j2-jeu-xp-serie.md` §3.1): it must differ from the zone in force, the event must not predate the last
 * journal entry, and the previous accepted change must be at least 48 hours older (`lastChangeAt`, null: none).
 */
export function acceptsTimeZoneChange(input: {
  reportedZone: string;
  zoneInForce: string;
  occurredAt: Date;
  lastEntryAt: Date | null;
  lastChangeAt: Date | null;
}): boolean {
  const { reportedZone, zoneInForce, occurredAt, lastEntryAt, lastChangeAt } = input;
  if (reportedZone === zoneInForce) return false;
  if (lastEntryAt !== null && occurredAt.getTime() < lastEntryAt.getTime()) return false;
  return lastChangeAt === null || occurredAt.getTime() - lastChangeAt.getTime() >= TIME_ZONE_CHANGE_GAP_MS;
}

/**
 * Learning days a move to the east skipped between two instants: the day just before the change (read in the
 * old zone) and the day just after (new zone) differ by more than one. They are neutral (`travel`) for the streak.
 * A move to the west repeats a day: nothing is skipped, the monotone floor keeps days from doubling.
 */
export function daysSkippedByTimeZoneChange(change: { at: Date; fromZone: string; toZone: string }): DateKey[] {
  const before = learningDay(new Date(change.at.getTime() - 1), change.fromZone);
  const after = learningDay(change.at, change.toZone);
  const skipped: DateKey[] = [];
  for (let day = addDays(before, 1); day < after; day = addDays(day, 1)) skipped.push(day);
  return skipped;
}
