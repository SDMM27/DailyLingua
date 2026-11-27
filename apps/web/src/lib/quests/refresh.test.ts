import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-11-27T12:00:00Z");

interface Assignment { id: string; period: "day" | "week"; periodStart: string; slot: number; questId: string; target: number; catalogVersion: string; rerolledFrom: string | null; completedAt: string | null }

let settings: unknown = {};
let lines: { reason: string; day: string; amount: number }[] = [];
let assignments: Assignment[] = [];
const closeCalls: string[] = [];
const completed: string[] = [];

vi.mock("@dailylingua/data", () => ({
  getGameContext: async () => ({ timeZone: "Europe/Paris", gameSettings: settings }),
  closeImmersionDays: async (_: unknown, __: string, through: string) => (closeCalls.push(through), 0),
  listQuestLedgerLines: async () => lines,
  listQuestAssignments: async () => assignments,
  getFirstXpDay: async () => (lines[0]?.day ?? null),
  listUsedReasons: async () => [],
  insertQuestAssignments: async (_: unknown, __: string, quests: Omit<Assignment, "id" | "rerolledFrom" | "completedAt">[]) => {
    for (const quest of quests) {
      if (!assignments.some((a) => a.period === quest.period && a.periodStart === quest.periodStart && a.slot === quest.slot)) {
        assignments.push({ ...quest, id: `a-${assignments.length}`, rerolledFrom: null, completedAt: null });
      }
    }
  },
  completeQuest: async (_: unknown, id: string) => {
    const row = assignments.find((a) => a.id === id)!;
    if (row.completedAt) return false;
    row.completedAt = NOW.toISOString();
    completed.push(id);
    return true;
  },
}));

const { refreshGameState } = await import("./refresh");
const service = {} as never;

beforeEach(() => {
  settings = {};
  lines = [{ reason: "session.complete", day: "2026-11-01", amount: 10 }];
  assignments = [];
  closeCalls.length = 0;
  completed.length = 0;
});

describe("refreshGameState", () => {
  it("closes the immersion days up to 4 days back and creates three quests of the day", async () => {
    const result = await refreshGameState(service, USER, NOW);
    expect(closeCalls).toEqual(["2026-11-23"]);
    expect(result.quests?.day).toHaveLength(3);
    expect(result.quests?.week).toHaveLength(3);
    expect(result.quests?.canReroll).toBe(true);
  });

  it("is idempotent: a second run creates and settles nothing more", async () => {
    await refreshGameState(service, USER, NOW);
    const count = assignments.length;
    await refreshGameState(service, USER, NOW);
    expect(assignments).toHaveLength(count);
    expect(completed).toEqual([]);
  });

  it("settles a quest whose target is reached, once", async () => {
    await refreshGameState(service, USER, NOW);
    const first = assignments.find((a) => a.period === "day")!;
    const reasons: Record<string, string> = { session_1: "session.complete", read_2: "reading.understood", recall_production_10: "review.production" };
    const reason = reasons[first.questId];
    if (!reason) return;
    lines = [...lines, ...Array.from({ length: first.target }, () => ({ reason, day: "2026-11-27", amount: 2 }))];
    const result = await refreshGameState(service, USER, NOW);
    expect(completed).toContain(first.id);
    expect(result.quests?.day.find((q) => q.id === first.id)).toMatchObject({ done: true });
    await refreshGameState(service, USER, NOW);
    expect(completed.filter((id) => id === first.id)).toHaveLength(1);
  });

  it("shows no quest and creates none when the switch is off, but still closes immersion days", async () => {
    settings = { quests: { enabled: false } };
    const result = await refreshGameState(service, USER, NOW);
    expect(result.quests).toBeNull();
    expect(assignments).toEqual([]);
    expect(closeCalls).toHaveLength(1);
  });

  it("gives no weekly quest to an account younger than a week", async () => {
    lines = [{ reason: "session.complete", day: "2026-11-25", amount: 10 }];
    const result = await refreshGameState(service, USER, NOW);
    expect(result.quests?.week).toEqual([]);
    expect(result.quests?.day.map((q) => q.questId)).toEqual(["session_1", "read_2", "recall_production_10"]);
  });
});
