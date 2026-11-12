import { DataError } from "@dailylingua/data";
import { describe, expect, it } from "vitest";
import { dailyGoalXp } from "./goal";
import { saveErrorKey } from "./data-errors";
import { completeOnboardingSchema } from "./onboarding";
import { learningSettingsSchema, uiLanguageSchema } from "./settings";
import { readSupabaseEnv } from "./supabase/env";
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "./security/headers";

describe("dailyGoalXp", () => {
  it("follows the tiers of the game design: 10 min = 50 XP, 20 = 100, 30 = 150", () => {
    expect([10, 20, 30].map(dailyGoalXp)).toEqual([50, 100, 150]);
    expect(dailyGoalXp(15)).toBe(75);
  });
});

describe("saveErrorKey", () => {
  it("maps each data error code to a message key and anything else to generic", () => {
    expect(saveErrorKey(new DataError("unauthenticated"))).toBe("unauthenticated");
    expect(saveErrorKey(new DataError("invalid"))).toBe("invalid");
    expect(saveErrorKey(new DataError("conflict"))).toBe("conflict");
    expect(saveErrorKey(new DataError("not_found"))).toBe("notFound");
    expect(saveErrorKey(new DataError("unknown"))).toBe("generic");
    expect(saveErrorKey(new Error("relation app.profile does not exist"))).toBe("generic");
  });
});

describe("completeOnboardingSchema", () => {
  const valid = { nativeLanguage: "fr", targetLanguage: "ru", startLevel: "B1", dailyMinutes: 30, timeZone: "UTC" };

  it("accepts the four decisions and the time zone", () => {
    expect(completeOnboardingSchema.safeParse(valid).success).toBe(true);
    expect(completeOnboardingSchema.safeParse({ ...valid, nativeLanguage: "ar", targetLanguage: "fr" }).success).toBe(true);
  });

  it("accepts only the four durations of the screen", () => {
    for (const minutes of [10, 15, 20, 30]) expect(completeOnboardingSchema.safeParse({ ...valid, dailyMinutes: minutes }).success).toBe(true);
    for (const minutes of [0, 5, 45, 15.5]) expect(completeOnboardingSchema.safeParse({ ...valid, dailyMinutes: minutes }).success).toBe(false);
  });

  it("refuses a language to learn that is not in the registry or is the mother tongue", () => {
    expect(completeOnboardingSchema.safeParse({ ...valid, targetLanguage: "xx" }).success).toBe(false);
    expect(completeOnboardingSchema.safeParse({ ...valid, targetLanguage: "fr" }).success).toBe(false);
  });

  it("accepts A0 to C2 as the starting level", () => {
    for (const level of ["A0", "A1", "A2", "B1", "B2", "C1", "C2"]) {
      expect(completeOnboardingSchema.safeParse({ ...valid, startLevel: level }).success).toBe(true);
    }
    expect(completeOnboardingSchema.safeParse({ ...valid, startLevel: "C3" }).success).toBe(false);
  });
});

describe("learningSettingsSchema", () => {
  it("turns an empty reminder into no reminder and keeps a valid time", () => {
    expect(learningSettingsSchema.parse({ nativeLanguage: "fr", timeZone: "Europe/Paris", reminderTime: "" }).reminderTime).toBeNull();
    expect(learningSettingsSchema.parse({ nativeLanguage: "fr", timeZone: "Europe/Paris", reminderTime: "08:15" }).reminderTime).toBe("08:15");
  });

  it("refuses an unknown time zone, language or a malformed time", () => {
    expect(learningSettingsSchema.safeParse({ nativeLanguage: "fr", timeZone: "Nope/Nope", reminderTime: "" }).success).toBe(false);
    expect(learningSettingsSchema.safeParse({ nativeLanguage: "french", timeZone: "UTC", reminderTime: "" }).success).toBe(false);
    expect(learningSettingsSchema.safeParse({ nativeLanguage: "fr", timeZone: "UTC", reminderTime: "25:00" }).success).toBe(false);
  });
});

describe("uiLanguageSchema", () => {
  it("accepts only the interface languages of the i18n package", () => {
    expect(uiLanguageSchema.safeParse("fr").success).toBe(true);
    expect(uiLanguageSchema.safeParse("en").success).toBe(true);
    expect(uiLanguageSchema.safeParse("ar").success).toBe(false);
  });
});

describe("readSupabaseEnv", () => {
  it("accepts the two public variables", () => {
    expect(
      readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k".repeat(30) }),
    ).toEqual({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k".repeat(30) });
  });

  it("fails loudly when a variable is missing or malformed", () => {
    expect(() => readSupabaseEnv({})).toThrow(/Invalid Supabase environment variables/);
    expect(() => readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "not a url", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k".repeat(30) })).toThrow();
  });

  it("never reads the service-role key", () => {
    const env = readSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "k".repeat(30),
      SUPABASE_SERVICE_ROLE_KEY: "s".repeat(30),
    });
    expect(Object.keys(env)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});

describe("security headers", () => {
  it("sends the headers of the legacy app", () => {
    expect(SECURITY_HEADERS.map((header) => header.key)).toEqual([
      "X-Content-Type-Options",
      "Referrer-Policy",
      "X-Frame-Options",
      "Permissions-Policy",
      "Content-Security-Policy",
    ]);
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
  });
});
