import { itBank } from "@dailylingua/content/placement";
import { nextPlacementStep, pickPlacementItem } from "@dailylingua/core";
import type { CefrLevel } from "@dailylingua/schemas";
import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ORIGIN = "https://app.example.test";

interface Recorded { userId: string; input: Record<string, unknown> }

let signedIn: { id: string } | null = { id: USER };
let enrolled = ["it", "ru"];
let recorded: Recorded[] = [];
let failWrite = false;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: signedIn } }) } }),
}));
// The data functions are exercised by the data package; here they record what the route hands them.
vi.mock("@dailylingua/data", () => ({
  listEnrollments: async () => enrolled.map((language) => ({ language })),
  recordPlacementResult: async (_: unknown, userId: string, input: Record<string, unknown>) => {
    if (failWrite) throw new Error("database down");
    recorded.push({ userId, input });
  },
}));

const { completePlacement } = await import("./handlers");
const service = () => ({}) as never;

type Answer = { itemId: string; choice: number | null };

/** A whole test on the Italian bank until the engine stops: block n gets `right[n]` right answers (the last value repeats), the rest are wrong. */
function play(start: CefrLevel, right: number | number[]): Answer[] {
  const answers: Answer[] = [];
  const asked = new Set<string>();
  const responses: { level: CefrLevel; correct: boolean }[] = [];
  const rights = [right].flat();
  let inBlock = 0;
  for (;;) {
    const step = nextPlacementStep(start, responses);
    if (step.kind === "done") return answers;
    const item = pickPlacementItem(itBank.items, step.level, asked)!;
    asked.add(item.id);
    const correct = inBlock < (rights[Math.floor(answers.length / 5)] ?? rights.at(-1)!);
    answers.push({ itemId: item.id, choice: correct ? item.answer : (item.answer + 1) % 4 });
    responses.push({ level: item.level, correct });
    inBlock = (inBlock + 1) % 5;
  }
}

const body = (answers: Answer[], extra: Record<string, unknown> = {}) => ({ language: "it", startLevel: "A2", answers, chosenLevel: "B1", ...extra });
const request = (payload?: unknown, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}/api/placement`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json", "x-dailylingua-user": USER, ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
const post = (payload?: unknown, headers?: Record<string, string>) => completePlacement(request(payload, headers), service);

beforeEach(() => {
  signedIn = { id: USER };
  enrolled = ["it", "ru"];
  recorded = [];
  failWrite = false;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/placement", () => {
  it("replays the answers, computes the estimate itself and records it for the session's user", async () => {
    const answers = play("A2", 4);
    const response = await post(body(answers, { chosenLevel: "B2" }));
    expect(response.status).toBe(201);
    const result = await response.json() as { estimate: string; confidence: string };
    expect(result).toEqual({ estimate: "C2", confidence: "high" });
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      userId: USER,
      input: {
        language: "it", startLevel: "A2", estimatedLevel: "C2", confidence: "high", chosenLevel: "B2", bankVersion: itBank.version,
        // The level kept (B2 = 4.5) is what the reading estimate says, with the uncertainty of a high confidence.
        reading: { levelValue: 4.5, uncertainty: 0.5 },
      },
    });
    const stored = recorded[0]!.input.answers as { itemId: string; choice: number | null; correct: boolean }[];
    expect(stored.map(({ itemId, choice }) => ({ itemId, choice }))).toEqual(answers);
    expect(stored.filter(({ correct }) => correct)).toHaveLength(answers.length * 4 / 5);
  });

  it("scores from the bank, never from the client: a skipped question and a wrong choice are both wrong", async () => {
    const answers = play("A1", 0).map((answer, index) => (index % 2 === 0 ? { ...answer, choice: null } : answer));
    expect((await post(body(answers, { startLevel: "A1", chosenLevel: "A1" }))).status).toBe(201);
    expect((recorded[0]!.input.answers as { correct: boolean }[]).every(({ correct }) => !correct)).toBe(true);
    expect(recorded[0]!.input).toMatchObject({ estimatedLevel: "A1", reading: { levelValue: 1.5 } });
  });

  it("records the highest uncertainty for a borderline test", async () => {
    // A2 passed with 3 right answers, B1 failed with 2: both blocks of the boundary are borderline.
    expect((await post(body(play("A2", [3, 2])))).status).toBe(201);
    expect(recorded[0]!.input).toMatchObject({ confidence: "low", reading: { uncertainty: 1 } });
  });

  it("refuses, in order: another origin, a wrong type, a too large or unreadable or invalid body, no session, a mismatched account header", async () => {
    const answers = play("A2", 4);
    expect((await post(body(answers), { Origin: "https://evil.test" })).status).toBe(403);
    expect((await post(body(answers), { "Content-Type": "text/plain" })).status).toBe(415);
    expect((await post(JSON.stringify({ ...body(answers), pad: "x".repeat(5000) }))).status).toBe(413);
    expect((await post("{")).status).toBe(400);
    expect((await post(body(answers, { startLevel: "A0" }))).status).toBe(400);
    expect((await post(body(answers, { chosenLevel: "D1" }))).status).toBe(400);
    expect((await post(body(answers, { extra: true }))).status).toBe(400);
    expect((await post(body([]))).status).toBe(400);
    signedIn = null;
    expect((await post(body(answers))).status).toBe(401);
    signedIn = { id: USER };
    expect((await post(body(answers), { "x-dailylingua-user": OTHER })).status).toBe(401);
    expect(recorded).toEqual([]);
  });

  it("refuses a language without a test and a language the account does not study", async () => {
    const answers = play("A2", 4);
    expect((await post(body(answers, { language: "es" }))).status).toBe(400);
    enrolled = ["ru"];
    expect((await post(body(answers))).status).toBe(400);
    expect(recorded).toEqual([]);
  });

  it("refuses a tampered or incomplete sequence with 422 and records nothing", async () => {
    const answers = play("A2", 4);
    const tampered: Answer[][] = [
      answers.slice(0, -1), // unfinished
      [...answers, answers[0]!], // after the end
      [{ itemId: "it-b1-1", choice: 0 }, ...answers.slice(1)], // a question of another level than the engine asked
      [{ itemId: "ru-a2-1", choice: 0 }, ...answers.slice(1)], // a question of another bank
      [{ itemId: "it-a2-99", choice: 0 }, ...answers.slice(1)], // no such question
      [answers[0]!, answers[0]!, ...answers.slice(2)], // the same question twice
    ];
    for (const sequence of tampered) expect((await post(body(sequence))).status).toBe(422);
    // A start level that is not the one the answers were drawn for.
    expect((await post(body(answers, { startLevel: "C2" }))).status).toBe(422);
    expect(recorded).toEqual([]);
  });

  it("answers 503 when the write fails, without leaking the cause", async () => {
    failWrite = true;
    const response = await post(body(play("A2", 4)));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
  });

  it("writes for the session's user only: two accounts do not touch each other's results", async () => {
    await post(body(play("A2", 4)));
    signedIn = { id: OTHER };
    await post(body(play("A2", 4)), { "x-dailylingua-user": OTHER });
    expect(recorded.map(({ userId }) => userId)).toEqual([USER, OTHER]);
  });
});
