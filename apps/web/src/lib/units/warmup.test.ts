import { getUnit } from "@dailylingua/content";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BILAN_ID, testBilan } from "./test-bilan";

const pending = vi.fn();
vi.mock("@dailylingua/data", () => ({ getPendingWarmups: (...args: unknown[]) => pending(...args) }));
vi.mock("@/lib/session", () => ({ getRequestClient: async () => ({}) }));

const { bilan } = testBilan();
const first = getUnit("it-a1-01-saluer")!;
vi.mock("./visibility", () => ({
  visibleUnit: (id: string) => (id === BILAN_ID ? bilan : id === "it-a1-01-saluer" ? first : undefined),
}));

const { loadDueWarmups } = await import("./warmup");

const testedAt = "2026-11-20T10:00:00Z";
const now = new Date("2026-11-22T10:00:00Z");

describe("loadDueWarmups", () => {
  beforeEach(() => pending.mockReset());

  it("offers the missed sentences of a unit once its test is a learning day old", async () => {
    const itemId = first.test.itemIds[0]!;
    pending.mockResolvedValue([{ unitId: first.id, testedAt, itemIds: [itemId] }]);
    const due = await loadDueWarmups("user", "it", "Europe/Paris", now);
    expect(due.map((entry) => [entry.unit.id, entry.itemIds])).toEqual([[first.id, [itemId]]]);
  });

  it("ignores a failed bilan: it has no warm-up", async () => {
    pending.mockResolvedValue([{ unitId: BILAN_ID, testedAt, itemIds: bilan.test.itemIds.slice(0, 3) }]);
    expect(await loadDueWarmups("user", "it", "Europe/Paris", now)).toEqual([]);
  });
});
