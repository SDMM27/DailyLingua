import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const MINE = "33333333-3333-4333-8333-333333333333";
const THEIRS = "44444444-4444-4444-8444-444444444444";
const ORIGIN = "https://app.example.test";
const NOW = new Date("2026-11-27T12:00:00Z");

interface Row { id: string; userId: string; language: string; day: string; minutes: number; kind: string }

let signedIn: { id: string } | null = { id: USER };
let enrolled = ["ru", "it"];
let rows: Row[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: signedIn } }) } }),
}));
// The data functions are exercised by the data package; here they are an in-memory table with the same contract.
vi.mock("@dailylingua/data", () => ({
  getProfile: async () => ({ timeZone: "Europe/Paris" }),
  listEnrollments: async () => enrolled.map((language) => ({ language })),
  countImmersionOnDay: async (_: unknown, userId: string, day: string) => rows.filter((row) => row.userId === userId && row.day === day).length,
  getImmersion: async (_: unknown, userId: string, id: string) => rows.find((row) => row.id === id && row.userId === userId) ?? null,
  createImmersion: async (_: unknown, userId: string, input: Omit<Row, "id" | "userId">) => {
    const id = crypto.randomUUID();
    rows.push({ id, userId, ...input });
    return id;
  },
  updateImmersion: async (_: unknown, userId: string, id: string, input: Omit<Row, "id" | "userId">) => {
    const row = rows.find((candidate) => candidate.id === id && candidate.userId === userId);
    if (row) Object.assign(row, input);
    return row !== undefined;
  },
  deleteImmersion: async (_: unknown, userId: string, id: string) => {
    const before = rows.length;
    rows = rows.filter((row) => !(row.id === id && row.userId === userId));
    return rows.length < before;
  },
}));

const handlers = await import("./handlers");
const service = () => ({}) as never;
const createEntry = (request: Request) => handlers.createEntry(request, service);
const updateEntry = (request: Request, id: string) => handlers.updateEntry(request, id, service);
const deleteEntry = (request: Request, id: string) => handlers.deleteEntry(request, id, service);

const entry = { language: "ru", day: "2026-11-26", minutes: 30, kind: "video" };
const request = (method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}/api/immersion`, {
    method,
    headers: { Origin: ORIGIN, "Content-Type": "application/json", "x-dailylingua-user": USER, ...headers },
    body: body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body),
  });
const row = (id: string, userId: string, day = "2026-11-26"): Row => ({ id, userId, language: "ru", day, minutes: 10, kind: "audio" });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  signedIn = { id: USER };
  enrolled = ["ru", "it"];
  rows = [row(MINE, USER), row(THEIRS, OTHER)];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/immersion", () => {
  it("creates the entry for the session's user and answers 201 with its id", async () => {
    const response = await createEntry(request("POST", entry));
    expect(response.status).toBe(201);
    const { id } = await response.json() as { id: string };
    expect(rows.find((candidate) => candidate.id === id)).toMatchObject({ userId: USER, language: "ru", minutes: 30 });
  });

  it("refuses, in order: another origin, a wrong type, a too large or invalid body, no session, a mismatched account header", async () => {
    expect((await createEntry(request("POST", entry, { Origin: "https://evil.test" }))).status).toBe(403);
    expect((await createEntry(request("POST", entry, { "Content-Type": "text/plain" }))).status).toBe(415);
    expect((await createEntry(request("POST", JSON.stringify({ ...entry, pad: "x".repeat(5000) })))).status).toBe(413);
    expect((await createEntry(request("POST", "{"))).status).toBe(400);
    expect((await createEntry(request("POST", { ...entry, minutes: 601 }))).status).toBe(400);
    signedIn = null;
    expect((await createEntry(request("POST", entry))).status).toBe(401);
    signedIn = { id: USER };
    expect((await createEntry(request("POST", entry, { "x-dailylingua-user": OTHER }))).status).toBe(401);
    expect(rows).toHaveLength(2);
  });

  it("refuses a language the account is not enrolled in, a future day and a day more than 30 days back", async () => {
    expect((await createEntry(request("POST", { ...entry, language: "de" }))).status).toBe(400);
    expect((await createEntry(request("POST", { ...entry, day: "2026-11-28" }))).status).toBe(400);
    expect((await createEntry(request("POST", { ...entry, day: "2026-10-27" }))).status).toBe(400);
    expect((await createEntry(request("POST", { ...entry, day: "2026-10-28" }))).status).toBe(201);
  });

  it("answers 429 from the 51st entry of a day", async () => {
    rows = Array.from({ length: 50 }, (_, index) => row(`id-${index}`, USER));
    expect((await createEntry(request("POST", entry))).status).toBe(429);
    expect((await createEntry(request("POST", { ...entry, day: "2026-11-25" }))).status).toBe(201);
  });
});

describe("PATCH /api/immersion/[id]", () => {
  it("updates the learner's entry (204)", async () => {
    expect((await updateEntry(request("PATCH", { ...entry, minutes: 55 }), MINE)).status).toBe(204);
    expect(rows.find((candidate) => candidate.id === MINE)).toMatchObject({ minutes: 55, kind: "video" });
  });

  it("answers 404 for another account's entry, an unknown one or a malformed id, and leaves the row alone", async () => {
    expect((await updateEntry(request("PATCH", entry), THEIRS)).status).toBe(404);
    expect((await updateEntry(request("PATCH", entry), "55555555-5555-4555-8555-555555555555")).status).toBe(404);
    expect((await updateEntry(request("PATCH", entry), "nope")).status).toBe(404);
    expect(rows.find((candidate) => candidate.id === THEIRS)!.minutes).toBe(10);
  });

  it("applies the same guards as the creation (401, language, day)", async () => {
    signedIn = null;
    expect((await updateEntry(request("PATCH", entry), MINE)).status).toBe(401);
    signedIn = { id: USER };
    expect((await updateEntry(request("PATCH", { ...entry, language: "de" }), MINE)).status).toBe(400);
    expect((await updateEntry(request("PATCH", { ...entry, day: "2026-11-28" }), MINE)).status).toBe(400);
  });

  it("answers 429 when moving the entry to a day that already holds 50", async () => {
    rows = [row(MINE, USER), ...Array.from({ length: 50 }, (_, index) => row(`id-${index}`, USER, "2026-11-25"))];
    expect((await updateEntry(request("PATCH", { ...entry, day: "2026-11-25" }), MINE)).status).toBe(429);
    expect((await updateEntry(request("PATCH", entry), MINE)).status).toBe(204);
  });
});

describe("DELETE /api/immersion/[id]", () => {
  it("deletes the learner's entry only", async () => {
    expect((await deleteEntry(request("DELETE"), THEIRS)).status).toBe(404);
    expect((await deleteEntry(request("DELETE"), MINE)).status).toBe(204);
    expect(rows.map((candidate) => candidate.id)).toEqual([THEIRS]);
  });

  it("refuses another origin and a signed-out visitor", async () => {
    expect((await deleteEntry(request("DELETE", undefined, { Origin: "https://evil.test" }), MINE)).status).toBe(403);
    signedIn = null;
    expect((await deleteEntry(request("DELETE"), MINE)).status).toBe(401);
  });
});
