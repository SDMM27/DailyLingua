import { describe, expect, it } from "vitest";
import { DataError } from "./errors";
import { enrollmentRow, estimateRow, INSTANT, profileRow, USER_ID } from "./fixtures";
import { toEnrollment, toEnrollmentsPayload, toProfile, toSkillEstimate } from "./mappers";

describe("toProfile", () => {
  it("converts to camelCase and trims the seconds of the reminder", () => {
    expect(toProfile(profileRow)).toEqual({
      userId: USER_ID,
      nativeLanguage: "ar",
      uiLanguage: "en",
      timeZone: "Asia/Tokyo",
      reminderTime: "08:15",
      gameSettings: { sounds: false },
      isGuest: false,
      legacyMigratedAt: null,
      createdAt: INSTANT,
      updatedAt: INSTANT,
    });
  });

  it("keeps a missing reminder null", () => {
    expect(toProfile({ ...profileRow, reminder_time: null }).reminderTime).toBeNull();
  });

  it("throws an unknown DataError, without the row, when the row breaks the schema", () => {
    const run = () => toProfile({ ...profileRow, native_language: "French" });
    expect(run).toThrow(DataError);
    try {
      run();
    } catch (error) {
      expect((error as DataError).code).toBe("unknown");
      expect((error as DataError).message).not.toContain("French");
    }
  });
});

describe("toEnrollment", () => {
  it("converts to camelCase", () => {
    expect(toEnrollment(enrollmentRow)).toMatchObject({
      userId: USER_ID,
      language: "fr",
      targetLevel: "B1",
      dailyMinutes: 20,
      days: [1, 3, 5],
      position: 0,
      active: true,
    });
  });

  it("refuses an out-of-range value", () => {
    expect(() => toEnrollment({ ...enrollmentRow, daily_minutes: 500 })).toThrow(DataError);
    expect(() => toEnrollment({ ...enrollmentRow, target_level: "Z9" })).toThrow(DataError);
  });
});

describe("toSkillEstimate", () => {
  it("converts to camelCase", () => {
    expect(toSkillEstimate(estimateRow)).toMatchObject({ userId: USER_ID, skill: "reading", levelValue: 0.5, source: "declared" });
  });

  it("refuses an unknown skill", () => {
    expect(() => toSkillEstimate({ ...estimateRow, skill: "dancing" })).toThrow(DataError);
  });
});

describe("toEnrollmentsPayload", () => {
  it("converts to the snake_case wire form, keeping the order", () => {
    const payload = toEnrollmentsPayload([
      { language: "fr", dailyMinutes: 15, days: [1, 2], targetLevel: "B1", purpose: "travail", startLevel: "A0" },
      { language: "es", dailyMinutes: 10, days: [1, 2, 3, 4, 5, 6, 7], targetLevel: null, purpose: null, startLevel: null },
    ]);
    expect(payload).toEqual([
      { language: "fr", daily_minutes: 15, days: [1, 2], target_level: "B1", purpose: "travail", start_level: "A0" },
      { language: "es", daily_minutes: 10, days: [1, 2, 3, 4, 5, 6, 7], target_level: null, purpose: null, start_level: null },
    ]);
  });
});
