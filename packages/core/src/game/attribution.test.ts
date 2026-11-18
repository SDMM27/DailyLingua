import { describe, expect, it } from "vitest";
import {
  CLOCK_ROLLBACK_MS,
  DAY_MS,
  HOUR_MS,
  MIN_MS,
  acceptsTimeZoneChange,
  attribute,
  daysSkippedByTimeZoneChange,
  ledgerDay,
  timeZoneAt,
} from "./index";

const at = (iso: string) => new Date(iso);
const PARIS = "Europe/Paris";
const RECEIVED = at("2026-11-12T10:00:00Z");

function attr(occurred: Date, extra: Partial<Parameters<typeof attribute>[0]> = {}) {
  return attribute({ occurredAt: occurred, receivedAt: RECEIVED, servedAt: null, timeZone: PARIS, floorDay: null, ...extra });
}

describe("attribute", () => {
  it("puts an event on the learning day of its zone, with the 04:00 start", () => {
    expect(attr(at("2026-11-12T09:00:00Z"))).toEqual({ ok: true, day: "2026-11-12", late: false });
    // 02:30 in Paris on the 12th is still the 11th.
    expect(attr(at("2026-11-12T01:30:00Z"))).toMatchObject({ ok: true, day: "2026-11-11" });
  });

  it("refuses the future beyond 5 minutes", () => {
    expect(attr(at("2026-11-12T10:05:00Z"))).toMatchObject({ ok: true });
    expect(attr(at("2026-11-12T10:05:01Z"))).toEqual({ ok: false, reason: "in_future" });
  });

  it("refuses beyond 7 days, accepts up to 7 days", () => {
    expect(attr(new Date(RECEIVED.getTime() - 7 * DAY_MS))).toMatchObject({ ok: true, late: true });
    expect(attr(new Date(RECEIVED.getTime() - 7 * DAY_MS - 1))).toEqual({ ok: false, reason: "too_old" });
  });

  it("marks late over 72 hours: 71 h is on time, 73 h is late, 8 days is refused", () => {
    expect(attr(new Date(RECEIVED.getTime() - 71 * HOUR_MS))).toMatchObject({ ok: true, late: false });
    expect(attr(new Date(RECEIVED.getTime() - 72 * HOUR_MS))).toMatchObject({ ok: true, late: false });
    expect(attr(new Date(RECEIVED.getTime() - 73 * HOUR_MS))).toMatchObject({ ok: true, late: true });
    expect(attr(new Date(RECEIVED.getTime() - 8 * DAY_MS))).toEqual({ ok: false, reason: "too_old" });
  });

  it("refuses an event before the item was served, with a minute of tolerance", () => {
    const served = at("2026-11-12T08:00:00Z");
    expect(attr(at("2026-11-12T07:59:00Z"), { servedAt: served })).toMatchObject({ ok: true });
    expect(attr(at("2026-11-12T07:58:59Z"), { servedAt: served })).toEqual({ ok: false, reason: "before_served" });
    expect(attr(at("2026-11-12T07:00:00Z"), { servedAt: null })).toMatchObject({ ok: true });
  });

  it("keeps days monotone: never before the day of the previous event of the device", () => {
    expect(attr(at("2026-11-12T09:00:00Z"), { floorDay: "2026-11-13" })).toMatchObject({ ok: true, day: "2026-11-13" });
    expect(attr(at("2026-11-12T09:00:00Z"), { floorDay: "2026-11-10" })).toMatchObject({ ok: true, day: "2026-11-12" });
  });

  it("exposes the clock rollback threshold of 2 minutes", () => {
    expect(CLOCK_ROLLBACK_MS).toBe(2 * MIN_MS);
  });
});

describe("ledgerDay", () => {
  it("writes on the day of the action, or on the reception day for a late event", () => {
    expect(ledgerDay({ day: "2026-11-11", late: false }, "2026-11-12")).toBe("2026-11-11");
    expect(ledgerDay({ day: "2026-11-08", late: true }, "2026-11-12")).toBe("2026-11-12");
  });

  it("stays inside the SQL bound [server day - 3, server day + 1]", () => {
    expect(ledgerDay({ day: "2026-11-09", late: false }, "2026-11-12")).toBe("2026-11-09");
    expect(ledgerDay({ day: "2026-11-08", late: false }, "2026-11-12")).toBe("2026-11-12");
    expect(ledgerDay({ day: "2026-11-14", late: false }, "2026-11-12")).toBe("2026-11-13");
  });
});

describe("time zone journal", () => {
  const journal = [
    { effectiveAt: "2026-11-01T00:00:00Z", timeZone: "Europe/Paris" },
    { effectiveAt: "2026-11-10T12:00:00Z", timeZone: "Europe/Rome" },
  ];

  it("reads the zone in force at an instant, the oldest known before the first change", () => {
    expect(timeZoneAt(journal, at("2026-11-05T00:00:00Z"), "America/New_York")).toBe("Europe/Paris");
    expect(timeZoneAt(journal, at("2026-11-10T12:00:00Z"), "America/New_York")).toBe("Europe/Rome");
    expect(timeZoneAt(journal, at("2026-10-01T00:00:00Z"), "America/New_York")).toBe("Europe/Paris");
    expect(timeZoneAt([], at("2026-11-05T00:00:00Z"), "Asia/Tokyo")).toBe("Asia/Tokyo");
  });

  it("does not depend on the order of the journal", () => {
    expect(timeZoneAt([...journal].reverse(), at("2026-11-11T00:00:00Z"), "x")).toBe("Europe/Rome");
  });

  it("accepts a new zone only 48 hours after the previous change", () => {
    const base = { reportedZone: "Asia/Tokyo", zoneInForce: "Europe/Paris", occurredAt: at("2026-11-12T10:00:00Z"), lastEntryAt: null };
    expect(acceptsTimeZoneChange({ ...base, lastChangeAt: null })).toBe(true);
    expect(acceptsTimeZoneChange({ ...base, lastChangeAt: at("2026-11-10T10:00:00Z") })).toBe(true);
    expect(acceptsTimeZoneChange({ ...base, lastChangeAt: at("2026-11-10T10:00:01Z") })).toBe(false);
    expect(acceptsTimeZoneChange({ ...base, reportedZone: "Europe/Paris", lastChangeAt: null })).toBe(false);
    expect(acceptsTimeZoneChange({ ...base, lastEntryAt: at("2026-11-12T10:00:01Z"), lastChangeAt: null })).toBe(false);
  });

  it("finds no skipped day for the usual moves, east or west", () => {
    // Paris to Tokyo (+8 h): 19:00 UTC is 20:00 in Paris (day 12) and 04:00 in Tokyo (day 13).
    expect(daysSkippedByTimeZoneChange({ at: at("2026-11-12T19:00:00Z"), fromZone: PARIS, toZone: "Asia/Tokyo" })).toEqual([]);
    expect(daysSkippedByTimeZoneChange({ at: at("2026-11-12T10:00:00Z"), fromZone: PARIS, toZone: "America/New_York" })).toEqual([]);
    expect(daysSkippedByTimeZoneChange({ at: at("2026-11-12T10:00:00Z"), fromZone: PARIS, toZone: PARIS })).toEqual([]);
  });

  it("skips a whole learning day only when the jump is over 24 hours and crosses a 04:00 limit", () => {
    // Pago Pago (-11) to Kiritimati (+14): 03:59 on the 12th (still the 11th) becomes 05:00 on the 13th.
    expect(daysSkippedByTimeZoneChange({ at: at("2026-11-12T15:00:00Z"), fromZone: "Pacific/Pago_Pago", toZone: "Pacific/Kiritimati" })).toEqual(["2026-11-12"]);
  });
});

describe("attribute across a change of daylight saving time", () => {
  it("cuts the day at 04:00 local time on the day the clocks go back (25 hours)", () => {
    // 2026-10-25: 03:00 CEST becomes 02:00 CET. 01:59Z is 03:59 local (CET, after the change): still the 24th.
    expect(attr(at("2026-10-25T01:59:00Z"), { receivedAt: at("2026-10-25T09:00:00Z") })).toMatchObject({ ok: true, day: "2026-10-24" });
    // 03:00Z is 04:00 CET: the 25th starts.
    expect(attr(at("2026-10-25T03:00:00Z"), { receivedAt: at("2026-10-25T09:00:00Z") })).toMatchObject({ ok: true, day: "2026-10-25" });
    expect(attr(at("2026-10-25T02:59:00Z"), { receivedAt: at("2026-10-25T09:00:00Z") })).toMatchObject({ ok: true, day: "2026-10-24" });
  });

  it("cuts the day at 04:00 local time on the day the clocks go forward (23 hours)", () => {
    // 2026-03-29: 02:00 CET becomes 03:00 CEST. 01:59Z is 03:59 CEST: the 28th; 02:00Z is 04:00 CEST: the 29th.
    const received = at("2026-03-29T09:00:00Z");
    expect(attr(at("2026-03-29T01:59:00Z"), { receivedAt: received })).toMatchObject({ ok: true, day: "2026-03-28" });
    expect(attr(at("2026-03-29T02:00:00Z"), { receivedAt: received })).toMatchObject({ ok: true, day: "2026-03-29" });
  });

  it("measures 72 hours in elapsed time, not in calendar days, across the change", () => {
    const received = at("2026-10-26T12:00:00Z");
    expect(attr(new Date(received.getTime() - 72 * HOUR_MS), { receivedAt: received })).toMatchObject({ ok: true, late: false });
    expect(attr(new Date(received.getTime() - 72 * HOUR_MS - 1), { receivedAt: received })).toMatchObject({ ok: true, late: true });
  });
});
