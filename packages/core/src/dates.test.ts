import { describe, expect, it } from "vitest";
import { addDays, diffInDays, formatLongDate, formatTimeAgo, isoWeekday, learningDay, localTime, toDateKey } from "./dates";

describe("toDateKey", () => {
  it("uses the Paris calendar day, not UTC", () => {
    // 23:30 UTC on 12 Oct is already 13 Oct in Paris (UTC+2 in summer time).
    expect(toDateKey(new Date("2026-10-12T23:30:00Z"))).toBe("2026-10-13");
    expect(toDateKey(new Date("2026-10-12T23:30:00Z"), "UTC")).toBe("2026-10-12");
  });

  it("handles winter time (UTC+1)", () => {
    expect(toDateKey(new Date("2026-12-31T22:59:00Z"))).toBe("2026-12-31");
    expect(toDateKey(new Date("2026-12-31T23:00:00Z"))).toBe("2027-01-01");
  });

  it("works in zones far from Paris", () => {
    const instant = new Date("2026-10-12T20:00:00Z");
    expect(toDateKey(instant, "Asia/Tokyo")).toBe("2026-10-13");
    expect(toDateKey(instant, "America/Los_Angeles")).toBe("2026-10-12");
  });
});

describe("addDays / diffInDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is not affected by the DST switch", () => {
    // Paris switches to winter time on 25 Oct 2026.
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(diffInDays("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("returns negative values for past days", () => {
    expect(diffInDays("2026-10-13", "2026-10-10")).toBe(-3);
  });
});

describe("learningDay", () => {
  it("counts an action at 00:30 for the day before", () => {
    // 22:30Z on 12 Oct = 00:30 on 13 Oct in Paris (UTC+2).
    expect(learningDay(new Date("2026-10-12T22:30:00Z"), "Europe/Paris")).toBe("2026-10-12");
  });

  it("changes day exactly at 04:00 local time", () => {
    expect(learningDay(new Date("2026-10-13T01:59:59Z"), "Europe/Paris")).toBe("2026-10-12"); // 03:59:59
    expect(learningDay(new Date("2026-10-13T02:00:00Z"), "Europe/Paris")).toBe("2026-10-13"); // 04:00
  });

  it("follows the time zone", () => {
    const instant = new Date("2026-10-12T18:30:00Z");
    expect(learningDay(instant, "Asia/Tokyo")).toBe("2026-10-12"); // 03:30 on the 13th
    expect(learningDay(new Date("2026-10-12T19:00:00Z"), "Asia/Tokyo")).toBe("2026-10-13"); // 04:00
    expect(learningDay(new Date("2026-10-12T10:30:00Z"), "America/Los_Angeles")).toBe("2026-10-11"); // 03:30
    expect(learningDay(new Date("2026-10-12T11:00:00Z"), "America/Los_Angeles")).toBe("2026-10-12"); // 04:00
    expect(learningDay(new Date("2026-10-12T09:59:00Z"), "America/Los_Angeles")).toBe("2026-10-11"); // 02:59
  });

  it("is right on DST change days", () => {
    // Paris, 25 Oct 2026: clocks go back at 03:00 CEST (01:00Z). 03:30 CET is 02:30Z and still the 24th.
    expect(learningDay(new Date("2026-10-25T02:30:00Z"), "Europe/Paris")).toBe("2026-10-24");
    expect(learningDay(new Date("2026-10-25T03:00:00Z"), "Europe/Paris")).toBe("2026-10-25"); // 04:00 CET
    // Los Angeles, 8 Nov 2026: clocks go back at 02:00 PDT (09:00Z).
    expect(learningDay(new Date("2026-11-08T11:30:00Z"), "America/Los_Angeles")).toBe("2026-11-07"); // 03:30 PST
    expect(learningDay(new Date("2026-11-08T12:00:00Z"), "America/Los_Angeles")).toBe("2026-11-08"); // 04:00 PST
  });
});

describe("localTime", () => {
  it("converts a wall-clock time to an instant", () => {
    expect(localTime("2026-10-13", "04:00", "Europe/Paris").toISOString()).toBe("2026-10-13T02:00:00.000Z");
    expect(localTime("2026-12-13", "12:00", "Europe/Paris").toISOString()).toBe("2026-12-13T11:00:00.000Z");
    expect(localTime("2026-10-13", "04:00", "Asia/Tokyo").toISOString()).toBe("2026-10-12T19:00:00.000Z");
    expect(localTime("2026-10-13", "12:00", "America/Los_Angeles").toISOString()).toBe("2026-10-13T19:00:00.000Z");
    expect(localTime("2026-10-13", "04:00", "UTC").toISOString()).toBe("2026-10-13T04:00:00.000Z");
  });

  it("round-trips through toDateKey", () => {
    for (const timeZone of ["Europe/Paris", "Asia/Tokyo", "America/Los_Angeles"]) {
      for (const key of ["2026-03-29", "2026-10-25", "2026-11-08", "2027-01-01"]) {
        const instant = localTime(key, "12:00", timeZone);
        expect(toDateKey(instant, timeZone)).toBe(key);
      }
    }
  });

  it("is right on DST change days", () => {
    // Paris, 25 Oct 2026 (back to CET at 03:00 CEST): 04:00 is after the change, UTC+1.
    expect(localTime("2026-10-25", "04:00", "Europe/Paris").toISOString()).toBe("2026-10-25T03:00:00.000Z");
    // Paris, 29 Mar 2026 (forward at 02:00 CET): 04:00 is already UTC+2.
    expect(localTime("2026-03-29", "04:00", "Europe/Paris").toISOString()).toBe("2026-03-29T02:00:00.000Z");
  });

  it("takes the first occurrence of an ambiguous time", () => {
    // 02:30 happens twice in Paris on 25 Oct 2026: 00:30Z (CEST) then 01:30Z (CET).
    expect(localTime("2026-10-25", "02:30", "Europe/Paris").toISOString()).toBe("2026-10-25T00:30:00.000Z");
  });

  it("pushes a skipped time forward by the length of the gap", () => {
    // 02:30 does not exist in Paris on 29 Mar 2026: it reads 03:30 CEST (01:30Z).
    expect(localTime("2026-03-29", "02:30", "Europe/Paris").toISOString()).toBe("2026-03-29T01:30:00.000Z");
  });

  it("refuses a malformed time", () => {
    expect(() => localTime("2026-10-13", "4:00", "UTC")).toThrow(RangeError);
  });
});

describe("formatLongDate", () => {
  it("formats in the requested locale", () => {
    expect(formatLongDate("2026-10-13", "fr-FR")).toBe("mardi 13 octobre");
    expect(formatLongDate("2026-10-13", "en-US")).toBe("Tuesday, October 13");
  });
});

describe("formatTimeAgo", () => {
  const now = new Date("2026-10-13T10:00:00Z"); // 12:00 in Paris
  const ago = (instant: string) => formatTimeAgo(new Date(instant), now, "Europe/Paris", "fr-FR");

  it("counts minutes and hours within a day", () => {
    expect(ago("2026-10-13T09:55:00Z")).toBe("il y a 5 minutes");
    expect(ago("2026-10-13T07:00:00Z")).toBe("il y a 3 heures");
  });

  it("counts calendar days in the user's time zone", () => {
    // 10:00 the day before in Paris (26 hours ago): "hier" (yesterday).
    expect(ago("2026-10-12T08:00:00Z")).toBe("hier");
    expect(ago("2026-10-09T10:00:00Z")).toBe("il y a 4 jours");
  });

  it("shows the date beyond a week, and never a time in the future", () => {
    expect(ago("2026-09-30T10:00:00Z")).toBe("30 sept.");
    expect(ago("2026-10-13T11:00:00Z")).toBe(ago("2026-10-13T10:00:00Z"));
  });

  it("follows the locale", () => {
    expect(formatTimeAgo(new Date("2026-10-13T07:00:00Z"), now, "Europe/Paris", "en")).toBe("3 hours ago");
  });
});

describe("isoWeekday", () => {
  it("numbers Monday 1 to Sunday 7", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => isoWeekday(addDays("2026-10-12", i)))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("works around year ends and before 1970", () => {
    expect(isoWeekday("2026-01-01")).toBe(4); // Thursday
    expect(isoWeekday("1969-12-31")).toBe(3); // Wednesday
  });
});
