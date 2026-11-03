import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createMockRepository } = await import("./repository");

describe("demo repository listContents", () => {
  const repo = createMockRepository();

  it("exposes at least four different domains", async () => {
    const items = await repo.listContents(["it", "ru"], 50);
    expect(new Set(items.flatMap((c) => c.topics)).size).toBeGreaterThanOrEqual(4);
  });

  it("keeps contents sharing a requested domain", async () => {
    const items = await repo.listContents(["it", "ru"], 50, { topics: ["sciences"] });
    expect(items.length).toBeGreaterThan(0);
    for (const c of items) expect(c.topics).toContain("sciences");
  });

  it("treats several domains as an union and an empty list as no filter", async () => {
    const all = await repo.listContents(["it", "ru"], 50);
    const union = await repo.listContents(["it", "ru"], 50, { topics: ["sciences", "histoire"] });
    expect(union.length).toBeGreaterThan(1);
    expect(union.every((c) => c.topics.some((t) => t === "sciences" || t === "histoire"))).toBe(true);
    expect(await repo.listContents(["it", "ru"], 50, { topics: [] })).toHaveLength(all.length);
  });

  it("combines domains with types", async () => {
    const articles = await repo.listContents(["it", "ru"], 50, { types: ["article"], topics: ["voyage"] });
    expect(articles.every((c) => c.type === "article" && c.topics.includes("voyage"))).toBe(true);
    const videos = await repo.listContents(["it", "ru"], 50, { types: ["video"], topics: ["voyage"] });
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.every((c) => c.type === "video")).toBe(true);
    expect(await repo.listContents(["it", "ru"], 50, { types: ["podcast"], topics: ["voyage"] })).toEqual([]);
  });
});

describe("demo repository assessments", () => {
  const repo = createMockRepository();

  it("has no assessment and refuses to write", async () => {
    expect(await repo.getCurrentAssessment("it")).toBeNull();
    expect(await repo.listAssessments()).toEqual([]);
    await expect(repo.startAssessment("it", "it-b1-1")).rejects.toThrow("Mode démonstration");
    await expect(repo.applyAssessmentLevel("id", "B1")).rejects.toThrow("Mode démonstration");
  });
});
