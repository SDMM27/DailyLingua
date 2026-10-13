import { describe, expect, it } from "vitest";
import { sourceDefinitionSchema, type ParsedSourceDefinition, type SourceDefinition } from "@/lib/schemas/content";
import type { RawFeedItem } from "./feed-parser";
import { MAX_ITEM_AGE_DAYS, normalizeFeed, normalizeItem } from "./normalize";

const NOW = new Date("2026-10-13T12:00:00Z");

function source(overrides: Partial<SourceDefinition> = {}): ParsedSourceDefinition {
  return sourceDefinitionSchema.parse({
    key: "test-source",
    name: "Test",
    language: "it",
    homepageUrl: "https://www.example.it/",
    feedUrl: "https://www.example.it/feed",
    contentType: "article",
    difficulty: "B2",
    defaultMinutes: 6,
    hosts: ["example.it"],
    license: {
      kind: "all-rights-reserved",
      name: "Tous droits réservés",
      termsUrl: "https://www.example.it/termini",
      commercialUse: false,
      verifiedOn: "2026-10-13",
      note: "test",
    },
    ...overrides,
  });
}

function item(overrides: Partial<RawFeedItem> = {}): RawFeedItem {
  return {
    title: "Il ritorno dei treni notturni",
    link: "https://www.example.it/2026/10/treni?utm_source=rss",
    guid: null,
    description: "<p>Più passeggeri e nuove linee.</p>",
    descriptionIsFullText: false,
    publishedAt: new Date("2026-10-13T08:00:00Z"),
    author: null,
    categories: [],
    duration: null,
    ...overrides,
  };
}

function draftOf(result: ReturnType<typeof normalizeItem>) {
  if (!result.ok) throw new Error(`rejected: ${result.reason}`);
  return result.draft;
}

describe("normalizeItem", () => {
  it("keeps metadata and a plain-text teaser with the source's defaults", () => {
    expect(draftOf(normalizeItem(item({ author: "Anna", categories: ["Viaggi", "Viaggi", ""] }), source(), NOW))).toEqual({
      sourceKey: "test-source",
      language: "it",
      contentType: "article",
      title: "Il ritorno dei treni notturni",
      url: "https://www.example.it/2026/10/treni",
      difficulty: "B2",
      durationMinutes: 6,
      summary: "Più passeggeri e nuove linee.",
      author: "Anna",
      categories: ["Viaggi"],
      publishedAt: new Date("2026-10-13T08:00:00Z"),
    });
  });

  it("caps the teaser at 280 characters, and a full-text fallback at 200", () => {
    const long = "parola ".repeat(200);
    expect(Array.from(draftOf(normalizeItem(item({ description: long }), source(), NOW)).summary).length).toBeLessThanOrEqual(280);
    const fromFullText = draftOf(normalizeItem(item({ description: long, descriptionIsFullText: true }), source(), NOW));
    expect(Array.from(fromFullText.summary).length).toBeLessThanOrEqual(200);
  });

  it("uses a lower limit for dense scripts", () => {
    const japanese = source({ language: "ja", hosts: ["example.it"] });
    const draft = draftOf(normalizeItem(item({ description: "王国".repeat(200) }), japanese, NOW));
    expect(Array.from(draft.summary).length).toBeLessThanOrEqual(120);
  });

  it("falls back to the title when there is no description", () => {
    expect(draftOf(normalizeItem(item({ description: null }), source(), NOW)).summary).toBe("Il ritorno dei treni notturni");
  });

  it("reads the podcast duration", () => {
    expect(draftOf(normalizeItem(item({ duration: "00:12:10" }), source(), NOW)).durationMinutes).toBe(13);
  });

  it("rejects items without title or usable link", () => {
    expect(normalizeItem(item({ title: "  <b></b> " }), source(), NOW)).toEqual({ ok: false, reason: "no-title" });
    expect(normalizeItem(item({ link: null }), source(), NOW)).toEqual({ ok: false, reason: "no-link" });
    expect(normalizeItem(item({ link: "javascript:alert(1)" }), source(), NOW)).toEqual({ ok: false, reason: "no-link" });
  });

  it("rejects links outside the source's hosts", () => {
    expect(normalizeItem(item({ link: "https://ads.example.com/promo" }), source(), NOW)).toEqual({
      ok: false,
      reason: "foreign-host",
    });
    expect(draftOf(normalizeItem(item({ link: "https://video.example.it/x" }), source(), NOW)).url).toBe(
      "https://video.example.it/x",
    );
  });

  it("rejects old items and does not trust dates in the future", () => {
    const old = new Date(NOW.getTime() - (MAX_ITEM_AGE_DAYS + 1) * 86_400_000);
    expect(normalizeItem(item({ publishedAt: old }), source(), NOW)).toEqual({ ok: false, reason: "too-old" });
    const future = new Date(NOW.getTime() + 3 * 86_400_000);
    expect(draftOf(normalizeItem(item({ publishedAt: future }), source(), NOW)).publishedAt).toBeNull();
  });

  it("unwraps Wikipedia's featured article entries", () => {
    const wikipedia = source({
      language: "en",
      homepageUrl: "https://en.wikipedia.org/",
      hosts: ["en.wikipedia.org"],
      itemFormat: "wikipedia-featured",
    });
    const draft = draftOf(
      normalizeItem(
        item({
          title: "October 13 Wikipedia featured article",
          link: "https://en.wikipedia.org/wiki/Special:FeedItem/featured/20261013000000/en",
          description:
            '<div><img src="x.jpg"></div><p><b><a href="/wiki/Beauty_Revealed" title="Beauty Revealed">Beauty Revealed</a></b> is an 1828 self-portrait by <a href="/wiki/Sarah_Goodridge">Sarah Goodridge</a>.</p>',
        }),
        wikipedia,
        NOW,
      ),
    );
    expect(draft.title).toBe("Beauty Revealed");
    expect(draft.url).toBe("https://en.wikipedia.org/wiki/Beauty_Revealed");
    expect(draft.summary).toBe("Beauty Revealed is an 1828 self-portrait by Sarah Goodridge.");
  });
});

describe("normalizeFeed", () => {
  it("deduplicates by URL, keeps the most recent and counts rejections", () => {
    const { drafts, rejected } = normalizeFeed(
      [
        item({ title: "A", link: "https://www.example.it/a", publishedAt: new Date("2026-10-10T00:00:00Z") }),
        item({ title: "B", link: "https://www.example.it/b", publishedAt: new Date("2026-10-12T00:00:00Z") }),
        item({ title: "B bis", link: "https://www.example.it/b?utm_medium=rss" }),
        item({ title: "C", link: "https://www.example.it/c", publishedAt: new Date("2026-10-11T00:00:00Z") }),
        item({ title: "D", link: "https://elsewhere.example.org/d" }),
      ],
      source(),
      NOW,
      2,
    );
    expect(drafts.map((d) => d.title)).toEqual(["B", "C"]);
    expect(rejected).toEqual({ duplicate: 1, "foreign-host": 1 });
  });
});
