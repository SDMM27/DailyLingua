import { describe, expect, it } from "vitest";
import { createRoleplayStore, learnerTurnsOf, readIngestRoleplays, turnsLeftOf } from "./roleplay";
import { tableFake } from "./table-fake";

const USER = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const MINE = "00000000-0000-4000-8000-0000000000a1";
const THEIRS = "00000000-0000-4000-8000-0000000000a2";
const AT = "2026-11-26T10:00:00Z";

const learner = (text: string) => ({ role: "learner", text, via: "typed", at: AT });
const ai = { role: "ai", text: "Buongiorno", translation: "Bonjour", at: AT };
const game = (id: string, userId: string, extra: Record<string, unknown> = {}) => ({
  id, user_id: userId, language: "it", scenario_id: "cafe-order", level: "A2", status: "finished",
  turns: [ai, learner("un caffè"), ai, learner("un cornetto")], objectives_met: [true, false, false],
  review: { objectives: [{ met: true, comment: "" }, { met: false, comment: "" }, { met: false, comment: "" }], errors: [], betterPhrasings: [], detectedLanguage: "it" },
  created_at: AT, finished_at: AT, ...extra,
});

describe("readIngestRoleplays", () => {
  it("reads only the learner's own games, with their turns and detected language, and whether they were paid", async () => {
    const { client, queries } = tableFake({
      roleplay: [game(MINE, USER), game(THEIRS, OTHER)],
      xp_ledger: [
        { user_id: USER, reason: "roleplay.completed", meta: { ref: MINE } },
        { user_id: OTHER, reason: "roleplay.completed", meta: { ref: THEIRS } },
      ],
    });
    expect(await readIngestRoleplays(client, USER, [MINE, THEIRS])).toEqual([
      { id: MINE, language: "it", level: "A2", status: "finished", learnerTurns: ["un caffè", "un cornetto"], detectedLanguage: "it", paid: true },
    ]);
    expect(queries.every((query) => query.chain.some((step) => step.includes(`eq("user_id","${USER}")`)))).toBe(true);
  });

  it("answers a game not paid yet, a game with an unreadable review as no language, and nothing for no id", async () => {
    const { client, queries } = tableFake({ roleplay: [game(MINE, USER, { review: { broken: true } })], xp_ledger: [] });
    expect(await readIngestRoleplays(client, USER, [MINE])).toEqual([
      expect.objectContaining({ id: MINE, paid: false, detectedLanguage: null }),
    ]);
    const before = queries.length;
    expect(await readIngestRoleplays(client, USER, [])).toEqual([]);
    expect(queries).toHaveLength(before);
  });

  it("leaves out a row with a status the code does not know", async () => {
    const { client } = tableFake({ roleplay: [game(MINE, USER, { status: "paused" })], xp_ledger: [] });
    expect(await readIngestRoleplays(client, USER, [MINE])).toEqual([]);
  });
});

it("reads confirmed roleplay XP for the exact account and game", async () => {
  const { client } = tableFake({
    xp_ledger: [
      { user_id: USER, reason: "roleplay.completed", meta: { ref: MINE }, amount: 15 },
      { user_id: OTHER, reason: "roleplay.completed", meta: { ref: THEIRS }, amount: 15 },
    ],
  });
  const store = createRoleplayStore(client);
  expect(await store.readXp(USER, MINE)).toBe(15);
  expect(await store.readXp(USER, THEIRS)).toBe(0);
});

describe("turns left", () => {
  const turns = (count: number) => Array.from({ length: count }, () => ({ role: "learner" as const, text: "x", via: "typed" as const, at: AT }));
  it("counts down from 8, and is 0 once the game is over, full or won", () => {
    expect(learnerTurnsOf(turns(3))).toBe(3);
    expect(turnsLeftOf({ turns: turns(3), objectivesMet: [false, false, false], status: "active" })).toBe(5);
    expect(turnsLeftOf({ turns: turns(8), objectivesMet: [false, false, false], status: "active" })).toBe(0);
    expect(turnsLeftOf({ turns: turns(2), objectivesMet: [true, true, true], status: "active" })).toBe(0);
    expect(turnsLeftOf({ turns: turns(2), objectivesMet: [false, false, false], status: "finished" })).toBe(0);
  });
});
