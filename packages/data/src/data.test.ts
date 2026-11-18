import { describe, expect, it } from "vitest";
import { getProfile, listEnrollments, listSkillEstimates, saveEnrollments, saveProfile } from "./index";
import { fakeClient } from "./fake-client";
import { enrollmentRow, estimateRow, profileRow } from "./fixtures";

const ok = (data: unknown) => ({ data, error: null });
const failure = (code: string) => ({ data: null, error: { code, message: "relation app.enrollment: secret detail" } });

const profileInput = { nativeLanguage: "ar", uiLanguage: "en", timeZone: "Asia/Tokyo", reminderTime: "08:15" };

async function codeOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? "not a DataError";
  }
}

describe("getProfile", () => {
  it("reads the app schema and maps the row", async () => {
    const { client, calls, schemas } = fakeClient(ok(profileRow));
    const profile = await getProfile(client);
    expect(schemas).toEqual(["app"]);
    expect(calls[0]).toMatchObject({ name: "profile", chain: ['select("*")', "maybeSingle()"] });
    expect(profile?.nativeLanguage).toBe("ar");
  });

  it("returns null when there is no row", async () => {
    expect(await getProfile(fakeClient(ok(null)).client)).toBeNull();
  });

  it("turns a database error into a DataError without its message", async () => {
    const { client } = fakeClient(failure("42501"));
    await expect(getProfile(client)).rejects.toMatchObject({ code: "unauthenticated", message: "unauthenticated" });
  });
});

describe("saveProfile", () => {
  it("validates, calls save_profile with the arguments and maps the result", async () => {
    const { client, calls } = fakeClient(ok(profileRow));
    const profile = await saveProfile(client, profileInput);
    expect(calls[0]).toMatchObject({
      kind: "rpc",
      name: "save_profile",
      args: { p_native_language: "ar", p_ui_language: "en", p_time_zone: "Asia/Tokyo", p_reminder_time: "08:15" },
    });
    expect(profile.reminderTime).toBe("08:15");
  });

  it("omits the reminder argument when there is none", async () => {
    const { client, calls } = fakeClient(ok(profileRow));
    await saveProfile(client, { ...profileInput, reminderTime: null });
    expect(calls[0]?.args).not.toHaveProperty("p_reminder_time");
  });

  it("refuses an invalid input before any call", async () => {
    const { client, calls } = fakeClient(ok(profileRow));
    expect(await codeOf(saveProfile(client, { ...profileInput, nativeLanguage: "French" }))).toBe("invalid");
    expect(calls).toHaveLength(0);
  });

  it.each([
    ["28000", "unauthenticated"],
    ["22023", "invalid"],
    ["23514", "conflict"],
    ["P0002", "not_found"],
    ["XX000", "unknown"],
  ])("maps %s to %s", async (sqlstate, code) => {
    expect(await codeOf(saveProfile(fakeClient(failure(sqlstate)).client, profileInput))).toBe(code);
  });
});

describe("listEnrollments", () => {
  it("asks for the active enrollments in plan order and maps them", async () => {
    const { client, calls } = fakeClient(ok([enrollmentRow]));
    const list = await listEnrollments(client);
    expect(calls[0]).toMatchObject({
      name: "enrollment",
      chain: ['select("*")', 'eq("active",true)', 'order("position",{"ascending":true})'],
    });
    expect(list.map((e) => e.language)).toEqual(["fr"]);
  });

  it("maps errors", async () => {
    expect(await codeOf(listEnrollments(fakeClient(failure("42501")).client))).toBe("unauthenticated");
  });
});

describe("listSkillEstimates", () => {
  it("filters on the language and maps the rows", async () => {
    const { client, calls } = fakeClient(ok([estimateRow]));
    const list = await listSkillEstimates(client, "fr");
    expect(calls[0]).toMatchObject({ name: "skill_estimate", chain: ['select("*")', 'eq("language","fr")'] });
    expect(list[0]?.levelValue).toBe(0.5);
  });
});

describe("saveEnrollments", () => {
  it("sends the snake_case plan with its defaults and maps the rows", async () => {
    const { client, calls } = fakeClient(ok([enrollmentRow]));
    const list = await saveEnrollments(client, [{ language: "fr", dailyMinutes: 15, startLevel: "A0" }]);
    expect(calls[0]).toMatchObject({
      kind: "rpc",
      name: "save_enrollments",
      args: {
        p_enrollments: [
          { language: "fr", daily_minutes: 15, days: [1, 2, 3, 4, 5, 6, 7], target_level: null, purpose: null, start_level: "A0" },
        ],
      },
    });
    expect(list).toHaveLength(1);
  });

  it("refuses an invalid plan before any call", async () => {
    const { client, calls } = fakeClient(ok([]));
    expect(await codeOf(saveEnrollments(client, []))).toBe("invalid");
    expect(await codeOf(saveEnrollments(client, [{ language: "fr", dailyMinutes: 1 }]))).toBe("invalid");
    expect(calls).toHaveLength(0);
  });

  it.each([
    ["23503", "invalid"],
    ["23514", "conflict"],
    ["22023", "invalid"],
    ["42501", "unauthenticated"],
    ["P0002", "not_found"],
    ["28000", "unauthenticated"],
  ])("maps %s to %s", async (sqlstate, code) => {
    expect(await codeOf(saveEnrollments(fakeClient(failure(sqlstate)).client, [{ language: "fr", dailyMinutes: 15 }]))).toBe(code);
  });
});
