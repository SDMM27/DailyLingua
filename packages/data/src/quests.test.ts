import { describe, expect, it } from "vitest";
import { completeQuest, insertQuestAssignments, listQuestAssignments, listQuestLedgerLines, rerollQuest } from "./quests";
import { tableFake } from "./table-fake";

const USER = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";

const row = (userId: string, over: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(), user_id: userId, period: "day", period_start: "2026-11-27", slot: 1, quest_id: "read_2", target: 2,
  catalog_version: "quests.v1", rerolled_from: null, completed_at: null, ...over,
});

describe("quest assignments", () => {
  it("lists only the learner's quests from a day on", async () => {
    const { client } = tableFake({ quest_assignment: [row(USER), row(USER, { period_start: "2026-11-01" }), row(OTHER)] });
    const rows = await listQuestAssignments(client, USER, "2026-11-20");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ questId: "read_2", periodStart: "2026-11-27", completedAt: null });
  });

  it("keeps the first quest of a slot when the same slot is created again", async () => {
    const { client } = tableFake({ quest_assignment: [] });
    const quest = { period: "day" as const, periodStart: "2026-11-27", slot: 1, questId: "read_2", target: 2, catalogVersion: "quests.v1" };
    await insertQuestAssignments(client, USER, [quest]);
    await insertQuestAssignments(client, USER, [{ ...quest, questId: "session_1", target: 1 }]);
    expect((await listQuestAssignments(client, USER, "2026-11-01")).map((r) => r.questId)).toEqual(["read_2"]);
  });
});

describe("quest ledger lines", () => {
  it("reads the learner's lines of a window", async () => {
    const line = (user_id: string, day: string) => ({ id: Math.random(), user_id, day, reason: "session.complete", amount: 10 });
    const { client } = tableFake({ xp_ledger: [line(USER, "2026-11-26"), line(USER, "2026-10-01"), line(OTHER, "2026-11-26")] });
    expect(await listQuestLedgerLines(client, USER, "2026-11-20", "2026-11-27")).toEqual([{ reason: "session.complete", day: "2026-11-26", amount: 10 }]);
  });
});

describe("rpc wrappers", () => {
  it("pass their arguments and read the boolean answer", async () => {
    const calls: unknown[] = [];
    const { client } = tableFake({}, { rpc: (name, args) => (calls.push([name, args]), { data: true, error: null }) });
    expect(await completeQuest(client, "a")).toBe(true);
    expect(await rerollQuest(client, USER, "a", "read_2", 2, "quests.v1")).toBe(true);
    expect(calls).toEqual([
      ["complete_quest", { p_assignment: "a" }],
      ["reroll_quest", { p_user: USER, p_assignment: "a", p_quest_id: "read_2", p_target: 2, p_catalog: "quests.v1" }],
    ]);
  });
});
