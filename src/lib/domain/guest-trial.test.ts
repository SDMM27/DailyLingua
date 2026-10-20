import { describe, expect, it } from "vitest";
import { GUEST_TRIAL_DAYS, guestTrialStatus } from "./guest-trial";

const TODAY = "2026-10-19";

describe("guestTrialStatus", () => {
  it("lets a new guest start", () => {
    expect(guestTrialStatus([], TODAY)).toEqual({ daysUsed: 0, daysLeft: GUEST_TRIAL_DAYS, canStartToday: true });
  });

  it("counts today’s mission and keeps it reachable", () => {
    expect(guestTrialStatus([TODAY], TODAY)).toEqual({ daysUsed: 1, daysLeft: 2, canStartToday: true });
    expect(guestTrialStatus(["2026-10-17", "2026-10-18", TODAY], TODAY)).toEqual({
      daysUsed: 3,
      daysLeft: 0,
      canStartToday: true,
    });
  });

  it("allows a new day while fewer than 3 distinct earlier days were used", () => {
    expect(guestTrialStatus(["2026-10-17", "2026-10-18"], TODAY)).toEqual({ daysUsed: 2, daysLeft: 1, canStartToday: true });
  });

  it("refuses a fourth day", () => {
    expect(guestTrialStatus(["2026-10-15", "2026-10-17", "2026-10-18"], TODAY)).toEqual({
      daysUsed: 3,
      daysLeft: 0,
      canStartToday: false,
    });
  });

  it("dedupes dates", () => {
    expect(guestTrialStatus(["2026-10-18", "2026-10-18", "2026-10-18"], TODAY)).toMatchObject({ daysUsed: 1, canStartToday: true });
  });

  it("ignores days after today (time zone drift)", () => {
    expect(guestTrialStatus(["2026-10-20"], TODAY)).toMatchObject({ daysUsed: 0, canStartToday: true });
  });
});
