import { describe, expect, it } from "vitest";
import type { ParsedSourceDefinition, SourceDefinition } from "@/lib/schemas/content";
import type { FetchLike } from "./http";
import { ingest, isSourceAllowed, type ContentStore } from "./ingest";
import type { ContentDraft } from "./normalize";

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

/** In-memory store with the same deduplication rule as the database (one row per URL). */
function memoryStore() {
  const sources = new Map<string, { id: string; active: boolean; fetch?: unknown }>();
  const contents = new Map<string, { id: string; sourceKey: string; status: string | null; checked: boolean }>();
  const store: ContentStore = {
    async syncSources(list: ParsedSourceDefinition[], active) {
      for (const s of list) sources.set(s.key, { id: `id-${s.key}`, active: active(s) });
      return new Map(list.map((s) => [s.key, `id-${s.key}`]));
    },
    async insertContents(sourceId, drafts: ContentDraft[]) {
      let inserted = 0;
      for (const d of drafts) {
        if (contents.has(d.url)) continue;
        contents.set(d.url, { id: `c${contents.size}`, sourceKey: d.sourceKey, status: "unchecked", checked: false });
        inserted++;
      }
      return inserted;
    },
    async recordFetch(sourceId, result) {
      const entry = [...sources.values()].find((s) => s.id === sourceId);
      if (entry) entry.fetch = result;
    },
    async listUncheckedLinks(limit) {
      return [...contents.entries()]
        .filter(([, c]) => c.status === "unchecked" && !c.checked)
        .slice(0, limit)
        .map(([url, c]) => ({ id: c.id, url, sourceKey: c.sourceKey }));
    },
    async setLinkStatus(id, status) {
      const entry = [...contents.values()].find((c) => c.id === id);
      if (!entry) return;
      entry.checked = true;
      if (status) entry.status = status;
    },
  };
  return { store, sources, contents };
}

/** Feeds of "open" (2 items) and "closed" (1 item); "down" fails; every page answers 200. */
const fakeWeb: FetchLike = async (url, init) => {
  if (url === "https://open.example.it/feed") return new Response(rss("open", ["a", "b"]));
  if (url === "https://closed.example.it/feed") return new Response(rss("closed", ["x"]));
  if (url === "https://down.example.it/feed") return new Response("", { status: 500 });
  if (init?.method === "HEAD") return new Response(null, { status: 200 });
  throw new Error(`unexpected ${url}`);
};

const CATALOG = [definition("open", true), definition("closed", false), definition("down", true)];

describe("ingest", () => {
  it("stores new items, records failures without stopping, then checks links", async () => {
    const { store, sources, contents } = memoryStore();
    const report = await ingest(CATALOG, store, { policy: "all", fetch: fakeWeb, now: NOW });

    expect(report.sources.map((s) => [s.key, s.status, s.inserted])).toEqual([
      ["closed", "ok", 1],
      ["down", "error", 0],
      ["open", "ok", 2],
    ]);
    expect(report.sources.find((s) => s.key === "down")?.error).toBe("HTTP 500");
    expect(sources.get("down")?.fetch).toEqual({ ok: false, error: "HTTP 500" });
    expect(sources.get("open")?.fetch).toEqual({ ok: true, itemCount: 2 });
    expect(report.links).toEqual({ checked: 3, ok: 3, redirected: 0, broken: 0, inconclusive: 0 });
    expect([...contents.values()].every((c) => c.status === "ok")).toBe(true);
  });

  it("is idempotent: a second run inserts nothing", async () => {
    const { store } = memoryStore();
    await ingest(CATALOG, store, { policy: "all", fetch: fakeWeb, now: NOW });
    const second = await ingest(CATALOG, store, { policy: "all", fetch: fakeWeb, now: NOW });
    expect(second.sources.reduce((n, s) => n + s.inserted, 0)).toBe(0);
  });

  it("under the commercial policy, skips and deactivates sources that do not allow it", async () => {
    const { store, sources, contents } = memoryStore();
    const report = await ingest(CATALOG, store, { policy: "commercial", fetch: fakeWeb, now: NOW, linkChecks: 0 });
    expect(report.sources.find((s) => s.key === "closed")?.status).toBe("skipped-policy");
    expect(sources.get("closed")?.active).toBe(false);
    expect(sources.get("open")?.active).toBe(true);
    expect([...contents.values()].map((c) => c.sourceKey)).toEqual(["open", "open"]);
  });

  it("can be limited to some sources", async () => {
    const { store } = memoryStore();
    const report = await ingest(CATALOG, store, { policy: "all", only: ["open"], fetch: fakeWeb, now: NOW, linkChecks: 0 });
    expect(report.sources.map((s) => s.key)).toEqual(["open"]);
  });

  it("rejects an invalid catalogue before fetching anything", async () => {
    const { store } = memoryStore();
    const invalid = [{ ...definition("open", true), feedUrl: "http://open.example.it/feed" }];
    await expect(ingest(invalid, store, { policy: "all", fetch: fakeWeb })).rejects.toThrow(/open/);
  });
});

describe("isSourceAllowed", () => {
  it("allows everything under 'all' and only commercial-use sources under 'commercial'", () => {
    const closed = { license: { commercialUse: false } } as ParsedSourceDefinition;
    const open = { license: { commercialUse: true } } as ParsedSourceDefinition;
    expect(isSourceAllowed(closed, "all")).toBe(true);
    expect(isSourceAllowed(closed, "commercial")).toBe(false);
    expect(isSourceAllowed(open, "commercial")).toBe(true);
  });
});
