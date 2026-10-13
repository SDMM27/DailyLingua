import { describe, expect, it } from "vitest";
import { addDays, diffInDays, formatLongDate, toDateKey } from "./dates";

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

describe("formatLongDate", () => {
  it("formats in French", () => {
    expect(formatLongDate("2026-10-13")).toBe("mardi 13 octobre");
  });
});
