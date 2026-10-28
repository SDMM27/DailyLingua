import { describe, expect, it, vi } from "vitest";
import type { Topic } from "@/lib/schemas/preferences";
import {
  TOPIC_BATCH_SIZE,
  classifyPendingContents,
  type ContentTopicStore,
  type TopicClassifier,
  type UnclassifiedContent,
} from "./topics";

function contents(count: number): UnclassifiedContent[] {
  return Array.from({ length: count }, (_, i) => ({ id: `c${i}`, language: "it", title: `Titolo ${i}`, summary: `Sintesi ${i}` }));
}

function fakeStore(pending: UnclassifiedContent[]) {
  const saved = new Map<string, Topic[]>();
  const store: ContentTopicStore = {
    listUnclassifiedContents: vi.fn(async (limit: number) => pending.slice(0, limit)),
    setContentTopics: vi.fn(async (updates) => {
      for (const { id, topics } of updates) saved.set(id, topics);
    }),
    applySourceTopics: vi.fn(async () => 0),
  };
  return { store, saved };
}

describe("classifyPendingContents", () => {
  it("classifies in batches of 20, one request each", async () => {
    const { store, saved } = fakeStore(contents(45));
    const classify = vi.fn(async (items: { title: string }[]) => items.map(() => ["sciences"] as Topic[]));
    const result = await classifyPendingContents(store, { classify });
    expect(TOPIC_BATCH_SIZE).toBe(20);
    expect(classify.mock.calls.map(([items]) => items.length)).toEqual([20, 20, 5]);
    expect(result).toEqual({ classified: 45, failedBatches: 0 });
    expect(saved.size).toBe(45);
    expect(classify.mock.calls[0][0][0]).toEqual({ language: "it", title: "Titolo 0", summary: "Sintesi 0" });
  });

  it("asks the store for at most `limit` contents (200 by default)", async () => {
    const { store } = fakeStore([]);
    const classifier: TopicClassifier = { classify: vi.fn(async () => []) };
    await classifyPendingContents(store, classifier);
    await classifyPendingContents(store, classifier, { limit: 40 });
    expect(store.listUnclassifiedContents).toHaveBeenNthCalledWith(1, 200);
    expect(store.listUnclassifiedContents).toHaveBeenNthCalledWith(2, 40);
    expect(classifier.classify).not.toHaveBeenCalled();
  });

  it("skips and counts a failing batch, and goes on with the next ones", async () => {
    const { store, saved } = fakeStore(contents(45));
    let call = 0;
    const classify = vi.fn(async (items: unknown[]) => {
      if (++call === 2) throw new Error("boom");
      return items.map(() => ["histoire"] as Topic[]);
    });
    const result = await classifyPendingContents(store, { classify });
    expect(result).toEqual({ classified: 25, failedBatches: 1 });
    expect(saved.has("c0")).toBe(true);
    expect(saved.has("c20")).toBe(false);
    expect(saved.has("c40")).toBe(true);
  });

  it("keeps an unanswered item unclassified and saves an empty answer as classified", async () => {
    const { store, saved } = fakeStore(contents(3));
    const classify = async (): Promise<(Topic[] | null)[]> => [["sport", "société"], null, []];
    const result = await classifyPendingContents(store, { classify });
    expect(result).toEqual({ classified: 2, failedBatches: 0 });
    expect(saved.get("c0")).toEqual(["sport", "société"]);
    expect(saved.has("c1")).toBe(false);
    expect(saved.get("c2")).toEqual([]);
  });

  it("counts a batch as failed when the store cannot save it", async () => {
    const { store } = fakeStore(contents(2));
    vi.mocked(store.setContentTopics).mockRejectedValueOnce(new Error("db down"));
    const result = await classifyPendingContents(store, { classify: async (items) => items.map(() => ["sport"] as Topic[]) });
    expect(result).toEqual({ classified: 0, failedBatches: 1 });
  });
});
