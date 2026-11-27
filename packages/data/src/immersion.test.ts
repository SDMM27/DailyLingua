import { describe, expect, it } from "vitest";
import {
  countImmersionOnDay, createImmersion, deleteImmersion, getImmersion, getImmersionOverview, listImmersion, sessionMinutes, updateImmersion,
} from "./immersion";
import { tableFake } from "./table-fake";

const user = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const row = (id: string, userId: string, language: string, day: string, minutes: number, created = "2026-11-26T10:00:00Z") =>
  ({ id, user_id: userId, language, day, minutes, kind: "video", created_at: created });

describe("sessionMinutes", () => {
  it("bounds a session to 60 minutes and counts 0 without a bound or in the wrong order", () => {
    expect(sessionMinutes("2026-11-26T10:00:00Z", "2026-11-26T10:25:00Z")).toBe(25);
    expect(sessionMinutes("2026-11-26T10:00:00Z", "2026-11-26T14:00:00Z")).toBe(60);
    expect(sessionMinutes(null, "2026-11-26T10:25:00Z")).toBe(0);
    expect(sessionMinutes("2026-11-26T10:00:00Z", null)).toBe(0);
    expect(sessionMinutes("2026-11-26T10:30:00Z", "2026-11-26T10:00:00Z")).toBe(0);
  });
});

describe("listImmersion", () => {
  it("keeps the learner's entries of the window, latest day then latest creation first, optionally one language", async () => {
    const { client, queries } = tableFake({
      immersion_entry: [
        row("a", user, "ru", "2026-11-20", 10),
        row("b", user, "it", "2026-11-26", 20, "2026-11-26T08:00:00Z"),
        row("c", user, "ru", "2026-11-26", 30, "2026-11-26T09:00:00Z"),
        row("d", user, "ru", "2026-11-19", 40),
        row("e", other, "ru", "2026-11-26", 50),
      ],
    });
    expect((await listImmersion(client, user, "2026-11-20", "2026-11-26")).map(({ id }) => id)).toEqual(["c", "b", "a"]);
    expect((await listImmersion(client, user, "2026-11-20", "2026-11-26", "ru")).map(({ id }) => id)).toEqual(["c", "a"]);
    expect(queries[0]!.chain).toContain("limit(60)");
  });
});

describe("getImmersionOverview", () => {
  it("separates app and declared minutes, per language, over the window and for the learner only", async () => {
    const session = (userId: string, language: string, day: string, status: string, started: string | null, completed: string | null) =>
      ({ user_id: userId, language, day, status, started_at: started, completed_at: completed });
    const { client } = tableFake({
      session: [
        session(user, "ru", "2026-11-26", "completed", "2026-11-26T10:00:00Z", "2026-11-26T10:20:00Z"),
        session(user, "ru", "2026-11-25", "completed", "2026-11-25T10:00:00Z", "2026-11-25T18:00:00Z"),
        session(user, "ru", "2026-11-24", "completed", null, "2026-11-24T10:00:00Z"),
        session(user, "ru", "2026-11-23", "started", "2026-11-23T10:00:00Z", "2026-11-23T10:30:00Z"),
        session(user, "ru", "2026-11-10", "completed", "2026-11-10T10:00:00Z", "2026-11-10T10:30:00Z"),
        session(user, "it", "2026-11-26", "completed", "2026-11-26T10:00:00Z", "2026-11-26T10:15:00Z"),
        session(other, "ru", "2026-11-26", "completed", "2026-11-26T10:00:00Z", "2026-11-26T10:45:00Z"),
      ],
      immersion_entry: [row("a", user, "ru", "2026-11-26", 45), row("b", user, "it", "2026-11-26", 12), row("c", other, "ru", "2026-11-26", 99)],
    });
    const russian = await getImmersionOverview(client, user, "ru", "2026-11-20", "2026-11-26");
    expect(russian).toMatchObject({ appMinutes: 80, declaredMinutes: 45 });
    expect(russian.entries.map(({ id }) => id)).toEqual(["a"]);
    expect(await getImmersionOverview(client, user, "it", "2026-11-20", "2026-11-26")).toMatchObject({ appMinutes: 15, declaredMinutes: 12 });
  });
});

describe("writes", () => {
  const input = { language: "ru", day: "2026-11-26", minutes: 30, kind: "audio" } as const;

  it("creates, reads, counts, updates and deletes, always on the learner's rows", async () => {
    const { client, store } = tableFake({ immersion_entry: [row("x", other, "ru", "2026-11-26", 5)] });
    const id = await createImmersion(client, user, input);
    expect(store.immersion_entry!.find((entry) => entry.id === id)).toMatchObject({ user_id: user, minutes: 30, kind: "audio" });
    expect(await getImmersion(client, user, id)).toEqual({ id, ...input });
    expect(await getImmersion(client, user, "x")).toBeNull();
    expect(await countImmersionOnDay(client, user, "2026-11-26")).toBe(1);

    expect(await updateImmersion(client, user, id, { ...input, minutes: 40 })).toBe(true);
    expect((await getImmersion(client, user, id))?.minutes).toBe(40);
    expect(await updateImmersion(client, user, "x", input)).toBe(false);
    expect(store.immersion_entry!.find((entry) => entry.id === "x")!.minutes).toBe(5);

    expect(await deleteImmersion(client, user, "x")).toBe(false);
    expect(await deleteImmersion(client, user, id)).toBe(true);
    expect(store.immersion_entry!.map((entry) => entry.id)).toEqual(["x"]);
  });
});
