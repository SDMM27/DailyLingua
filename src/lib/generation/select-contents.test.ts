import { describe, expect, it } from "vitest";
import type { CandidateContent } from "@/lib/schemas/generation";
import { rankCandidates, targetLevel, type RankOptions } from "./select-contents";

const NOW = new Date("2026-10-13T12:00:00Z");

function candidate(id: string, overrides: Partial<CandidateContent> = {}): CandidateContent {
  return {
    id,
    type: "article",
    title: `Titre ${id}`,
    summary: "Résumé",
    sourceName: "Source",
    difficulty: "B1",
    durationMinutes: 5,
    categories: [],
    publishedAt: "2026-10-13T08:00:00Z",
    ...overrides,
  };
}

const base: RankOptions = {
  level: "B1",
  difficulty: "matched",
  contentTypes: ["article"],
  minutes: 20,
  excludeIds: new Set<string>(),
  now: NOW,
};

const ids = (list: CandidateContent[]) => list.map((c) => c.id);

describe("targetLevel", () => {
  it("shifts by difficulty mode", () => {
    expect(targetLevel("B1", "comfortable")).toBe("A2");
    expect(targetLevel("B1", "matched")).toBe("B1");
    expect(targetLevel("B1", "challenge")).toBe("B2");
  });

  it("clamps at both ends", () => {
    expect(targetLevel("A1", "comfortable")).toBe("A1");
    expect(targetLevel("C2", "challenge")).toBe("C2");
  });
});

describe("rankCandidates", () => {
  it("prefers the level that fits the difficulty mode", () => {
    const list = [candidate("a", { difficulty: "A2" }), candidate("b", { difficulty: "B1" }), candidate("c", { difficulty: "B2" })];
    expect(ids(rankCandidates(list, base))[0]).toBe("b");
    expect(ids(rankCandidates(list, { ...base, difficulty: "challenge" }))[0]).toBe("c");
    expect(ids(rankCandidates(list, { ...base, difficulty: "comfortable" }))[0]).toBe("a");
  });

  it("prefers a wanted type", () => {
    const list = [candidate("a", { type: "podcast" }), candidate("b", { type: "article" })];
    expect(ids(rankCandidates(list, base))).toEqual(["b", "a"]);
  });

  it("prefers contents short enough for the time", () => {
    const list = [candidate("long", { durationMinutes: 30 }), candidate("short", { durationMinutes: 8 })];
    expect(ids(rankCandidates(list, base))).toEqual(["short", "long"]);
  });

  it("prefers fresh contents, with unknown dates counted as old", () => {
    const list = [
      candidate("undated", { publishedAt: null }),
      candidate("old", { publishedAt: "2026-09-01T00:00:00Z" }),
      candidate("fresh", { publishedAt: "2026-10-13T10:00:00Z" }),
    ];
    expect(ids(rankCandidates(list, base))[0]).toBe("fresh");
    expect(ids(rankCandidates(list, base)).at(-1)).not.toBe("fresh");
  });

  it("excludes used ids", () => {
    const list = [candidate("a"), candidate("b")];
    expect(ids(rankCandidates(list, { ...base, excludeIds: new Set(["a"]) }))).toEqual(["b"]);
  });

  it("breaks ties by date then id, whatever the input order", () => {
    const sameScore = { publishedAt: "2026-09-01T00:00:00Z" };
    const list = [candidate("b", sameScore), candidate("a", sameScore), candidate("c", { publishedAt: "2026-09-02T00:00:00Z" })];
    const expected = ["c", "a", "b"];
    expect(ids(rankCandidates(list, base))).toEqual(expected);
    expect(ids(rankCandidates([...list].reverse(), base))).toEqual(expected);
  });

  it("keeps the best `limit` (5 by default)", () => {
    const list = Array.from({ length: 8 }, (_, i) => candidate(`c${i}`));
    expect(rankCandidates(list, base)).toHaveLength(5);
    expect(rankCandidates(list, { ...base, limit: 2 })).toHaveLength(2);
  });
});
