import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "11111111-1111-4111-8111-111111111111";
const MINE = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";
const ORIGIN = "https://app.example.test";
const NOW = new Date("2026-11-27T12:00:00Z");

let signedIn: { id: string } | null = { id: USER };
let rows: { id: string; period: "day"; periodStart: string; questId: string; completedAt: string | null; rerolledFrom: string | null }[] = [];
let accepted = true;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: signedIn } }) } }),
}));
vi.mock("@dailylingua/data", () => ({
  getGameContext: async () => ({ timeZone: "Europe/Paris", gameSettings: {} }),
  listQuestAssignments: async () => rows,
  listQuestLedgerLines: async () => [],
  getFirstXpDay: async () => "2026-10-01",
  listUsedReasons: async () => [],
  rerollQuest: async () => accepted,
}));

const { rerollQuestRequest } = await import("./reroll");
const call = (body: unknown, headers: Record<string, string> = {}) =>
  rerollQuestRequest(new Request(`${ORIGIN}/api/quests/reroll`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json", "x-dailylingua-user": USER, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }), () => ({}) as never);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  signedIn = { id: USER };
  accepted = true;
  rows = [
    { id: MINE, period: "day", periodStart: "2026-11-27", questId: "read_2", completedAt: null, rerolledFrom: null },
    { id: OTHER, period: "day", periodStart: "2026-11-27", questId: "session_1", completedAt: "x", rerolledFrom: null },
  ];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/quests/reroll", () => {
  it("replaces an unfinished quest of the day and answers the new quest id", async () => {
    const response = await call({ assignmentId: MINE });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ questId: expect.any(String) });
  });

  it("refuses, in order: another origin, a wrong type, a bad body, no session", async () => {
    expect((await call({ assignmentId: MINE }, { Origin: "https://evil.test" })).status).toBe(403);
    expect((await call({ assignmentId: MINE }, { "Content-Type": "text/plain" })).status).toBe(415);
    expect((await call({ assignmentId: "nope" })).status).toBe(400);
    expect((await call("x".repeat(2000))).status).toBe(413);
    signedIn = null;
    expect((await call({ assignmentId: MINE })).status).toBe(401);
  });

  it("answers 404 for a quest that is not on today's list, 409 for a finished one or a spent reroll", async () => {
    expect((await call({ assignmentId: "55555555-5555-4555-8555-555555555555" })).status).toBe(404);
    expect((await call({ assignmentId: OTHER })).status).toBe(409);
    rows[1]!.completedAt = null;
    rows[1]!.rerolledFrom = "read_5_week";
    expect((await call({ assignmentId: MINE })).status).toBe(409);
  });

  it("answers 409 when the database refuses", async () => {
    accepted = false;
    expect((await call({ assignmentId: MINE })).status).toBe(409);
  });
});
