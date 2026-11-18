import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const saveProfile = vi.fn();
const saveEnrollments = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser } }) }));
vi.mock("@dailylingua/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@dailylingua/data")>()),
  saveProfile: (...args: unknown[]) => saveProfile(...args),
  saveEnrollments: (...args: unknown[]) => saveEnrollments(...args),
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr" }));
vi.mock("@/lib/locale-cookie", () => ({ rememberLocale: async () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  },
}));

const { completeOnboarding } = await import("./onboarding");
const { DataError } = await import("@dailylingua/data");

const valid = { nativeLanguage: "fr", targetLanguage: "it", startLevel: "A0", dailyMinutes: 15, timeZone: "Europe/Paris" };

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u" } } });
});

describe("completeOnboarding", () => {
  it("rejects invalid input before touching the database", async () => {
    for (const bad of [
      null,
      { ...valid, targetLanguage: "fr" }, // the mother tongue cannot be learned
      { ...valid, targetLanguage: "xx" },
      { ...valid, startLevel: "D9" },
      { ...valid, dailyMinutes: 7 },
      { ...valid, timeZone: "Mars/Olympus" },
    ]) {
      expect(await completeOnboarding(bad)).toEqual({ error: "invalid" });
    }
    expect(saveProfile).not.toHaveBeenCalled();
    expect(saveEnrollments).not.toHaveBeenCalled();
  });

  it("sends a signed-out visitor to the sign-in screen", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(completeOnboarding(valid)).rejects.toThrow("NEXT_REDIRECT /sign-in");
  });

  it("saves the profile then the plan with the current interface language, then goes to Today", async () => {
    await expect(completeOnboarding(valid)).rejects.toThrow("NEXT_REDIRECT /");
    expect(saveProfile).toHaveBeenCalledWith(expect.anything(), {
      nativeLanguage: "fr",
      uiLanguage: "fr",
      timeZone: "Europe/Paris",
      reminderTime: null,
    });
    expect(saveEnrollments).toHaveBeenCalledWith(expect.anything(), [{ language: "it", dailyMinutes: 15, startLevel: "A0" }]);
  });

  it("turns a data error into a message key", async () => {
    saveEnrollments.mockRejectedValue(new DataError("conflict"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await completeOnboarding(valid)).toEqual({ error: "conflict" });
  });
});
