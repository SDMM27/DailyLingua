import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "@/lib/content/http";
import type { ContentStore } from "@/lib/content/ingest";
import type { ContentTopicStore, TopicClassifier } from "@/lib/content/topics";
import type { SourceDefinition } from "@/lib/schemas/content";
import { runIngestJob } from "./ingest-job";

const NOW = new Date("2026-10-13T12:00:00Z");

function definition(key: string, commercialUse: boolean): SourceDefinition {
  return {
    key,
    name: key,
    language: "it",
    homepageUrl: `https://${key}.example.it/`,
    feedUrl: `https://${key}.example.it/feed`,
    contentType: "article",
    difficulty: "B1",
    defaultMinutes: 5,
    hosts: [`${key}.example.it`],
    license: commercialUse
      ? {
          kind: "cc-by",
          name: "CC BY 4.0",
          url: "https://creativecommons.org/licenses/by/4.0/",
          termsUrl: `https://${key}.example.it/terms`,
          commercialUse: true,
          verifiedOn: "2026-10-13",
          note: "test",
        }
      : {
          kind: "all-rights-reserved",
          name: "Tous droits réservés",
          termsUrl: `https://${key}.example.it/terms`,
          commercialUse: false,
          verifiedOn: "2026-10-13",
          note: "test",
        },
  };
}

function rss(key: string, paths: string[]): string {
  const items = paths
    .map(
      (p) =>
        `<item><title>Articolo ${p}</title><link>https://${key}.example.it/${p}</link><pubDate>Tue, 13 Oct 2026 08:00:00 GMT</pubDate></item>`,
    )
    .join("");
  return `<rss version="2.0"><channel><title>${key}</title>${items}</channel></rss>`;
}

function memoryStore(): ContentStore {
  const contents = new Map<string, { id: string; sourceKey: string; checked: boolean }>();
  return {
    async syncSources(list) {
      return new Map(list.map((s) => [s.key, `id-${s.key}`]));
    },
    async insertContents(_sourceId, drafts) {
      let inserted = 0;
      for (const d of drafts) {
        if (contents.has(d.url)) continue;
        contents.set(d.url, { id: `c${contents.size}`, sourceKey: d.sourceKey, checked: false });
        inserted++;
      }
      return inserted;
    },
    async recordFetch() {},
    async listUncheckedLinks(limit) {
      return [...contents.entries()]
        .filter(([, c]) => !c.checked)
        .slice(0, limit)
        .map(([url, c]) => ({ id: c.id, url, sourceKey: c.sourceKey }));
    },
    async setLinkStatus(id) {
      for (const c of contents.values()) if (c.id === id) c.checked = true;
    },
  };
}

const fakeWeb: FetchLike = async (url, init) => {
  if (url === "https://open.example.it/feed") return new Response(rss("open", ["a", "b"]));
  if (url === "https://closed.example.it/feed") return new Response(rss("closed", ["x"]));
  if (url === "https://down.example.it/feed") return new Response("", { status: 500 });
  if (init?.method === "HEAD") return new Response(null, { status: 200 });
  throw new Error(`unexpected ${url}`);
};

function topicStore(count: number): ContentTopicStore & { saved: Map<string, string[]> } {
  const saved = new Map<string, string[]>();
  return {
    saved,
    listUnclassifiedContents: vi.fn(async (limit: number) =>
      Array.from({ length: Math.min(count, limit) }, (_, i) => ({ id: `t${i}`, language: "it" as const, title: `T${i}`, summary: `S${i}` })),
    ),
    setContentTopics: vi.fn(async (updates) => {
      for (const { id, topics } of updates) saved.set(id, topics);
    }),
    applySourceTopics: vi.fn(async () => 0),
  };
}

describe("runIngestJob", () => {
  it("is partial when a feed fails, with counters", async () => {
    const result = await runIngestJob({
      store: memoryStore(),
      policy: "all",
      catalog: [definition("open", true), definition("closed", false), definition("down", true)],
      fetch: fakeWeb,
      now: NOW,
    });
    expect(result.status).toBe("partial");
    expect(result.stats).toEqual({
      sources: 3,
      sourcesOk: 2,
      sourcesError: 1,
      sourcesSkipped: 0,
      inserted: 3,
      linksChecked: 3,
      linksBroken: 0,
      topicsClassified: 0,
      topicsFailedBatches: 0,
    });
    expect(result.report.sources).toHaveLength(3);
  });

  it("is ok when every feed works, counting policy-skipped sources apart", async () => {
    const result = await runIngestJob({
      store: memoryStore(),
      policy: "commercial",
      catalog: [definition("open", true), definition("closed", false)],
      fetch: fakeWeb,
      now: NOW,
      linkChecks: 0,
    });
    expect(result.status).toBe("ok");
    expect(result.stats).toMatchObject({ sources: 2, sourcesOk: 1, sourcesError: 0, sourcesSkipped: 1, inserted: 2, linksChecked: 0 });
  });
  it("classifies the contents without domain after the ingestion, and counts them", async () => {
    const store = topicStore(25);
    const classify = vi.fn(async (items: unknown[]) => items.map(() => ["société"] as ("société")[]));
    const classifier: TopicClassifier = { classify };
    const result = await runIngestJob({
      store: memoryStore(),
      policy: "all",
      catalog: [definition("open", true)],
      fetch: fakeWeb,
      now: NOW,
      topics: { store, classifier },
    });
    expect(result.status).toBe("ok");
    expect(result.stats).toMatchObject({ topicsClassified: 25, topicsFailedBatches: 0 });
    expect(classify).toHaveBeenCalledTimes(2);
    expect(store.saved.size).toBe(25);
  });

  it("stays ok when a classification batch fails, and reports it", async () => {
    const classifier: TopicClassifier = {
      classify: vi.fn(async () => {
        throw new Error("model down");
      }),
    };
    const result = await runIngestJob({
      store: memoryStore(),
      policy: "all",
      catalog: [definition("open", true)],
      fetch: fakeWeb,
      now: NOW,
      topics: { store: topicStore(5), classifier },
    });
    expect(result.status).toBe("ok");
    expect(result.stats).toMatchObject({ topicsClassified: 0, topicsFailedBatches: 1 });
  });
});
