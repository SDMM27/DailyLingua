import { describe, expect, it, vi } from "vitest";
import { MOCK_PREFERENCES } from "@/lib/data/mock/preferences";

vi.mock("server-only", () => ({}));

const { createSupabaseRepository } = await import("./supabase-repository");

describe("savePreferences and the production level", () => {
  it("never sends the production level to save_preferences, which keeps the stored one", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const repo = createSupabaseRepository({ rpc } as never, "user-1");
    const goals = MOCK_PREFERENCES.goals.map((g) => ({ ...g, productionLevel: "C1" as const }));
    await repo.savePreferences({ ...MOCK_PREFERENCES, goals });

    expect(rpc).toHaveBeenCalledTimes(1);
    const [name, args] = rpc.mock.calls[0] as unknown as [string, { p_goals: Record<string, unknown>[] }];
    expect(name).toBe("save_preferences");
    expect(args.p_goals.length).toBe(goals.length);
    for (const goal of args.p_goals) expect(Object.keys(goal)).not.toContain("production_level");
    expect(JSON.stringify(args)).not.toContain("production");
  });
});
