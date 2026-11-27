import { describe, expect, it } from "vitest";
import { immersionCloseThrough, immersionDayXp, isImmersionDayClosed } from "./immersion-xp";
import { chooseQuests, pickReroll, questProgress, questsToSettle, voletsByGap, type QuestChoiceInput, type QuestLine } from "./quests";
import { weekStart } from "./ring";
import { resolveGameSettings } from "./settings";

const line = (reason: string, day = "2026-11-25", amount = 2): QuestLine => ({ reason, day, amount });
const input = (over: Partial<QuestChoiceInput> = {}): QuestChoiceInput => ({
  userId: "u1", period: "day", periodStart: "2026-11-27", recentLines: [], recentQuestIds: [],
  usedReasons: ["shadowing.sentence", "roleplay.completed", "unit.complete"], accountAgeDays: 30, ...over,
});

describe("questProgress", () => {
  const range = { from: "2026-11-23", through: "2026-11-29" };
  it("counts the lines of the period and caps at the target", () => {
    const lines = ["reading.understood", "reading.understood_well", "reading.understood"].map((r) => line(r));
    expect(questProgress({ measure: { kind: "count", reasons: ["reading.understood", "reading.understood_well"] }, target: 2 }, lines, range)).toBe(2);
  });
  it("ignores quest, immersion and out-of-period lines", () => {
    const lines = [line("quest.daily"), line("immersion.declared"), line("session.complete", "2026-11-30")];
    expect(questProgress({ measure: { kind: "count", reasons: ["session.complete"] }, target: 1 }, lines, range)).toBe(0);
  });
  it("counts distinct days and distinct volets", () => {
    const lines = [line("session.complete", "2026-11-23"), line("session.complete", "2026-11-23"), line("session.complete", "2026-11-24")];
    expect(questProgress({ measure: { kind: "days", reason: "session.complete" }, target: 4 }, lines, range)).toBe(2);
    const volets = [line("review.production"), line("reading.understood"), line("session.complete"), line("fluency.pass"), line("production.corrected")];
    expect(questProgress({ measure: { kind: "volets" }, target: 4 }, volets, range)).toBe(4);
  });
});

describe("questsToSettle", () => {
  const a = { id: "a", questId: "read_2", period: "day" as const, periodStart: "2026-11-25", target: 2, completedAt: null };
  it("lists reached quests only and never a finished one", () => {
    const lines = [line("reading.understood"), line("reading.understood")];
    expect(questsToSettle([a, { ...a, id: "b", completedAt: "x" }, { ...a, id: "c", periodStart: "2026-11-24" }], lines)).toEqual(["a"]);
    expect(questsToSettle([a], [line("reading.understood")])).toEqual([]);
  });
});

describe("chooseQuests", () => {
  it("is deterministic", () => {
    expect(chooseQuests(input())).toEqual(chooseQuests(input()));
  });
  it("targets the volets with the biggest gap", () => {
    const lines = [line("review.production", "2026-11-20", 80), line("reading.understood", "2026-11-20", 20)];
    const order = voletsByGap(lines, "s");
    expect(order.at(-1)).toBe("study");
    const chosen = chooseQuests(input({ recentLines: lines }));
    expect(chosen.map((c) => c.slot)).toEqual([1, 2, 3]);
    expect(["session_1", "unit_1"]).toContain(chosen[2]!.questId);
    expect(chosen[0]!.questId).not.toMatch(/recall|reconquest|error_of_day|read/);
  });
  it("excludes quests of the last 3 days and unused oral quests", () => {
    for (let i = 0; i < 20; i++) {
      const ids = chooseQuests(input({ userId: `u${i}`, recentQuestIds: ["session_1"], usedReasons: [] })).map((c) => c.questId);
      // The regularity slot falls back to the recent quest rather than staying empty.
      expect(ids.slice(0, 2)).not.toContain("session_1");
      expect(ids).not.toContain("shadowing_10");
      expect(ids).not.toContain("unit_1");
    }
  });
  it("gives a new account the fixed daily trio and no weekly quest", () => {
    expect(chooseQuests(input({ accountAgeDays: 2 })).map((c) => c.questId)).toEqual(["session_1", "read_2", "recall_production_10"]);
    expect(chooseQuests(input({ accountAgeDays: null })).map((c) => c.questId)).toEqual(["session_1", "read_2", "recall_production_10"]);
    expect(chooseQuests(input({ period: "week", periodStart: "2026-11-23", accountAgeDays: 3 }))).toEqual([]);
  });
  it("gives a week two volet quests and a regularity one", () => {
    const chosen = chooseQuests(input({ period: "week", periodStart: "2026-11-23" }));
    expect(chosen).toHaveLength(3);
    expect(["session_4_days_week", "four_volets_week"]).toContain(chosen[2]!.questId);
  });
});

describe("pickReroll", () => {
  it("stays in the volet when it can, and never returns a quest of the day", () => {
    const next = pickReroll(input(), "read_2", ["read_2", "recall_production_10", "session_1"]);
    expect(["read_well", "dictation_5"]).toContain(next);
  });
  it("falls back to any volet", () => {
    const today = ["session_1", "read_2", "recall_production_10"];
    const next = pickReroll(input(), "session_1", today);
    expect(next).not.toBeNull();
    expect(today).not.toContain(next);
  });
});

describe("weekStart", () => {
  it("is the Monday", () => {
    expect(weekStart("2026-11-27")).toBe("2026-11-23");
    expect(weekStart("2026-11-23")).toBe("2026-11-23");
    expect(weekStart("2026-11-29")).toBe("2026-11-23");
  });
});

describe("immersion XP", () => {
  it("is 1 per 10 minutes, 6 at most", () => {
    expect([9, 10, 59, 60, 61, 600].map(immersionDayXp)).toEqual([0, 1, 5, 6, 6, 6]);
  });
  it("closes a day from the 4th day on", () => {
    expect(isImmersionDayClosed("2026-11-24", "2026-11-27")).toBe(false);
    expect(isImmersionDayClosed("2026-11-23", "2026-11-27")).toBe(true);
    expect(immersionCloseThrough("2026-11-27")).toBe("2026-11-23");
  });
});

describe("game settings of the social mechanics", () => {
  it("has the defaults of the spec", () => {
    const s = resolveGameSettings(null);
    expect([s.quests.enabled, s.immersionXp.enabled, s.badges.enabled, s.league.enabled, s.friends.enabled]).toEqual([true, true, true, false, false]);
  });
});
