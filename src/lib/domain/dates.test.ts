import { describe, expect, it } from "vitest";
import { addDays, diffInDays, formatLongDate, formatTimeAgo, toDateKey } from "./dates";

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

describe("formatTimeAgo", () => {
  const now = new Date("2026-10-13T10:00:00Z"); // 12:00 in Paris

  it("counts minutes and hours within a day", () => {
    expect(formatTimeAgo(new Date("2026-10-13T09:59:40Z"), now)).toBe("à l’instant");
    expect(formatTimeAgo(new Date("2026-10-13T09:55:00Z"), now)).toBe("il y a 5 minutes");
    expect(formatTimeAgo(new Date("2026-10-13T07:00:00Z"), now)).toBe("il y a 3 heures");
  });

  it("counts calendar days in the user's time zone", () => {
    // 10:00 the day before in Paris (26 hours ago): "hier" (yesterday).
    expect(formatTimeAgo(new Date("2026-10-12T08:00:00Z"), now)).toBe("hier");
    expect(formatTimeAgo(new Date("2026-10-09T10:00:00Z"), now)).toBe("il y a 4 jours");
  });

  it("shows the date beyond a week, and never a time in the future", () => {
    expect(formatTimeAgo(new Date("2026-09-30T10:00:00Z"), now)).toBe("30 sept.");
    expect(formatTimeAgo(new Date("2026-10-13T11:00:00Z"), now)).toBe("à l’instant");
  });
});
