import { addDays, type IngestState } from "@dailylingua/core";
import { MAX_MEMO_BYTES, type DateKey, type IngestMemo } from "@dailylingua/schemas";

/**
 * The memo `app.ingest_state.memo` holds after a batch (`j2-pr1-lot-w.md`, D3 and section 5): the counters that the
 * tables cannot give back exactly, kept for the recent days only. Pure.
 */

/** Days of counters kept before the server day, and after it (an action dated tomorrow, within the clock tolerance). */
export const MEMO_DAYS_BEFORE = 10;
export const MEMO_DAYS_AFTER = 1;
export const MEMO_MAX_TEXTS = 200;
/**
 * Productions are kept for 4 days only (a `production.corrected` older than that is refused by the SQL day bound, so a
 * production never settled cannot linger), and 30 at most, the most recent first (W-I1).
 */
export const MEMO_PRODUCTION_DAYS = 4;
export const MEMO_MAX_PRODUCTIONS = 30;
export const MEMO_CATCH_UP_DAYS = 60;

export class MemoTooLargeError extends Error {
  constructor(readonly bytes: number) {
    super(`The ingest memo is ${bytes} bytes (limit ${MAX_MEMO_BYTES})`);
    this.name = "MemoTooLargeError";
  }
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * `previous` is the memo the batch started from (null: none): what the batch did not touch is kept from it, what it
 * touched comes from `nextState`. The size is checked and never cut short: an over-large memo is a server error.
 */
export function buildNextMemo(previous: IngestMemo | null, nextState: IngestState, serverDay: DateKey): IngestMemo {
  const from = addDays(serverDay, -MEMO_DAYS_BEFORE);
  const to = addDays(serverDay, MEMO_DAYS_AFTER);
  const days: IngestMemo["days"] = {};
  for (const [day, counters] of Object.entries(nextState.days)) if (day >= from && day <= to) days[day] = counters;

  // Texts: the state only holds the texts the batch loaded, so they overlay the ones the memo already knew.
  const texts: Record<string, IngestMemo["texts"][string]> = { ...(previous?.texts ?? {}) };
  for (const text of Object.values(nextState.texts)) {
    if (text.readingEarnedDay === null && text.referenceWpm === null) continue;
    texts[text.id] = { readingEarnedDay: text.readingEarnedDay, referenceWpm: text.referenceWpm };
  }
  const keptTexts = Object.entries(texts)
    .sort(([idA, a], [idB, b]) => compare(b.readingEarnedDay ?? "", a.readingEarnedDay ?? "") || compare(idA, idB))
    .slice(0, MEMO_MAX_TEXTS);

  // Productions: the ones of the last 4 days, settled or not, the 30 most recent at most.
  const productionsFrom = addDays(serverDay, -MEMO_PRODUCTION_DAYS);
  const allProductions: IngestMemo["productions"] = { ...(previous?.productions ?? {}) };
  for (const production of Object.values(nextState.productions)) {
    allProductions[production.id] = { day: production.day, late: production.late, settled: production.settled, correctionDeferred: production.correctionDeferred };
  }
  const productions: IngestMemo["productions"] = Object.fromEntries(
    Object.entries(allProductions)
      .filter(([, production]) => production.day >= productionsFrom)
      .sort(([idA, a], [idB, b]) => compare(b.day, a.day) || compare(idA, idB))
      .slice(0, MEMO_MAX_PRODUCTIONS),
  );

  const catchFrom = addDays(serverDay, -MEMO_CATCH_UP_DAYS);
  const catchUpDays = [...new Set([...(previous?.catchUpDays ?? []), ...nextState.catchUpDays])].filter((day) => day >= catchFrom).sort();

  const memo: IngestMemo = { v: 1, days, texts: Object.fromEntries(keptTexts), productions, catchUpDays };
  const bytes = jsonbTextBytes(memo);
  if (bytes > MAX_MEMO_BYTES) throw new MemoTooLargeError(bytes);
  return memo;
}

/** Size of the text form SQL measures (`octet_length(memo::text)`): `jsonb` prints a space after every `:` and `,`. */
export function jsonbTextBytes(value: unknown): number {
  const text = JSON.stringify(value).replace(/("(?:[^"\\]|\\.)*")|([:,])/g, (_match, quoted: string | undefined, separator: string | undefined) => (quoted ?? `${separator} `));
  return new TextEncoder().encode(text).length;
}
