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
    enclosure: null,
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
      audioUrl: null,
      topics: null,
    });
  });

  it("gives the draft the source's fixed domains, and none to classify otherwise", () => {
    expect(draftOf(normalizeItem(item(), source({ defaultTopics: ["sciences", "histoire"] }), NOW)).topics).toEqual([
      "sciences",
      "histoire",
    ]);
    expect(draftOf(normalizeItem(item(), source(), NOW)).topics).toBeNull();
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

  it("uses the source's own age limit when it has one", () => {
    const videos = source({ maxAgeDays: 180 });
    const old = new Date(NOW.getTime() - (MAX_ITEM_AGE_DAYS + 100) * 86_400_000);
    expect(draftOf(normalizeItem(item({ publishedAt: old }), videos, NOW)).publishedAt).toEqual(old);
    const tooOld = new Date(NOW.getTime() - 181 * 86_400_000);
    expect(normalizeItem(item({ publishedAt: tooOld }), videos, NOW)).toEqual({ ok: false, reason: "too-old" });
    const short = source({ maxAgeDays: 7 });
    const tenDays = new Date(NOW.getTime() - 10 * 86_400_000);
    expect(normalizeItem(item({ publishedAt: tenDays }), short, NOW)).toEqual({ ok: false, reason: "too-old" });
  });

  it("reads the level from the title, first matching rule first, else the source's level", () => {
    const labelled = source({
      difficulty: "B1",
      levelRules: [
        { pattern: /\bA2\b/, difficulty: "A2" },
        { pattern: /\bB2\b/i, difficulty: "B2" },
      ],
    });
    const level = (title: string) => draftOf(normalizeItem(item({ title }), labelled, NOW)).difficulty;
    expect(level("Storia breve (A2 B2)")).toBe("A2");
    expect(level("Discorso avanzato b2")).toBe("B2");
    expect(level("Un video qualunque")).toBe("B1");
    expect(draftOf(normalizeItem(item(), source(), NOW)).difficulty).toBe("B2");
  });

  it("does not let a global rule keep state from one title to the next", () => {
    const labelled = source({ levelRules: [{ pattern: /A2/g, difficulty: "A2" }] });
    for (let i = 0; i < 3; i++) {
      expect(draftOf(normalizeItem(item({ title: "Episodio A2" }), labelled, NOW)).difficulty).toBe("A2");
    }
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

describe("normalizeItem — YouTube", () => {
  const channel = source({
    key: "test-channel",
    language: "de",
    homepageUrl: "https://www.youtube.com/channel/UCbxb2fqe9oNgglAoYqsYOtQ",
    feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCbxb2fqe9oNgglAoYqsYOtQ",
    contentType: "video",
    defaultMinutes: 12,
    hosts: ["youtube.com"],
    itemFormat: "youtube",
  });
  const video = (overrides: Partial<RawFeedItem> = {}) =>
    item({
      title: "Was machst du am Wochenende?",
      link: "https://www.youtube.com/watch?v=abcdEFGhi_1",
      description: "Wir fragen Leute auf der Straße.\nUnd sie antworten.\n\nMehr: https://example.com/x\nFolge uns!",
      ...overrides,
    });

  it("keeps the watch link, the channel's duration and the description up to the first link", () => {
    const draft = draftOf(normalizeItem(video(), channel, NOW));
    expect(draft.url).toBe("https://www.youtube.com/watch?v=abcdEFGhi_1");
    expect(draft.contentType).toBe("video");
    expect(draft.durationMinutes).toBe(12);
    expect(draft.summary).toBe("Wir fragen Leute auf der Straße. Und sie antworten.");
  });

  it("normalizes the link to https://www.youtube.com/watch?v=<id>, dropping other parameters", () => {
    const draft = draftOf(
      normalizeItem(
        video({ link: "http://m.youtube.com/watch?feature=share&v=abcdEFGhi_1&utm_source=rss&t=30s#top" }),
        source({ ...channel, hosts: ["youtube.com"] }),
        NOW,
      ),
    );
    expect(draft.url).toBe("https://www.youtube.com/watch?v=abcdEFGhi_1");
  });

  it("rejects Shorts and links that cannot be played", () => {
    expect(normalizeItem(video({ link: "https://www.youtube.com/shorts/abcdEFGhi_1" }), channel, NOW)).toEqual({
      ok: false,
      reason: "short",
    });
    expect(normalizeItem(video({ link: "https://www.youtube.com/watch?v=tooshort" }), channel, NOW)).toEqual({
      ok: false,
      reason: "no-link",
    });
    expect(normalizeItem(video({ link: "https://www.youtube.com/@EasyGerman" }), channel, NOW)).toEqual({
      ok: false,
      reason: "no-link",
    });
  });

  it("rejects live streams and their replays, but not the word « live » in a sentence", () => {
    for (const title of ["🔴 Peppa Pig en direct", "[LIVE] 뉴스 특보", "Lofi German 24/7", "Easy German LIVE Q&A"]) {
      expect(normalizeItem(video({ title }), channel, NOW)).toEqual({ ok: false, reason: "live" });
    }
    expect(normalizeItem(video({ title: "How Germans live in small flats" }), channel, NOW).ok).toBe(true);
  });

  it("keeps only the titles matching the channel's filter", () => {
    const filtered = source({ ...channel, titleFilter: /grec moderne/i });
    expect(normalizeItem(video({ title: "Grec Moderne A1 - Leçon 1" }), filtered, NOW).ok).toBe(true);
    expect(normalizeItem(video({ title: "Μαθαίνω γαλλικά A1" }), filtered, NOW)).toEqual({ ok: false, reason: "off-topic" });
  });

  it("stops the teaser at a separator line, whatever the dashes or underscores", () => {
    expect(draftOf(normalizeItem(video({ description: "Intro du jour.\n---\nAbonne-toi" }), channel, NOW)).summary).toBe("Intro du jour.");
    expect(draftOf(normalizeItem(video({ description: "Intro du jour.\n_____\nAbonne-toi" }), channel, NOW)).summary).toBe("Intro du jour.");
  });

  it("stops at a bare www. link too", () => {
    expect(draftOf(normalizeItem(video({ description: "Intro.\nBesuch www.example.com\nSuite" }), channel, NOW)).summary).toBe("Intro.");
  });

  it("falls back to the title when the description starts with a link or is missing", () => {
    expect(draftOf(normalizeItem(video({ description: "https://example.com\nIntro" }), channel, NOW)).summary).toBe(
      "Was machst du am Wochenende?",
    );
    expect(draftOf(normalizeItem(video({ description: null }), channel, NOW)).summary).toBe("Was machst du am Wochenende?");
  });

  it("does not apply the YouTube rules to other formats", () => {
    const result = normalizeItem(video({ link: "https://www.example.it/shorts/x" }), source(), NOW);
    expect(result.ok).toBe(true);
  });
});

describe("normalizeItem — podcast audio", () => {
  const podcast = (overrides: Partial<SourceDefinition> = {}) =>
    source({
      key: "test-podcast",
      contentType: "podcast",
      homepageUrl: "https://www.example.it/podcast",
      hosts: ["example.it"],
      audioHosts: ["cdn.example.net"],
      ...overrides,
    });
  const episode = (overrides: Partial<RawFeedItem> = {}) =>
    item({
      link: "https://www.example.it/podcast/episodio-1",
      enclosure: { url: "https://media.cdn.example.net/ep1.mp3?token=a", type: "audio/mpeg" },
      ...overrides,
    });

  it("keeps an https audio enclosure on an audio host", () => {
    const draft = draftOf(normalizeItem(episode(), podcast(), NOW));
    expect(draft.audioUrl).toBe("https://media.cdn.example.net/ep1.mp3?token=a");
    expect(draft.url).toBe("https://www.example.it/podcast/episodio-1");
  });

  it("accepts a missing or generic type when the file extension is audio", () => {
    const enclosure = (url: string, type: string | null) => ({ url, type });
    const audio = (e: RawFeedItem["enclosure"]) => draftOf(normalizeItem(episode({ enclosure: e }), podcast(), NOW)).audioUrl;
    expect(audio(enclosure("https://cdn.example.net/a.m4a", null))).toBe("https://cdn.example.net/a.m4a");
    expect(audio(enclosure("https://cdn.example.net/a.opus", "application/octet-stream"))).toBe("https://cdn.example.net/a.opus");
    expect(audio(enclosure("https://cdn.example.net/a.bin", null))).toBeNull();
  });

  it("refuses http, a foreign host and video without rejecting the episode", () => {
    for (const enclosure of [
      { url: "http://cdn.example.net/ep1.mp3", type: "audio/mpeg" },
      { url: "https://evil.example.org/ep1.mp3", type: "audio/mpeg" },
      { url: "https://cdn.example.net/ep1.mp4", type: "video/mp4" },
      { url: "not a url", type: "audio/mpeg" },
    ]) {
      const draft = draftOf(normalizeItem(episode({ enclosure }), podcast(), NOW));
      expect(draft.audioUrl).toBeNull();
      expect(draft.url).toBe("https://www.example.it/podcast/episodio-1");
    }
  });

  it("refuses an audio URL longer than 2000 characters", () => {
    const enclosure = { url: `https://cdn.example.net/ep1.mp3?t=${"a".repeat(2000)}`, type: "audio/mpeg" };
    expect(draftOf(normalizeItem(episode({ enclosure }), podcast(), NOW)).audioUrl).toBeNull();
  });

  it("ignores enclosures when the source has no audioHosts, and for articles", () => {
    expect(draftOf(normalizeItem(episode(), podcast({ audioHosts: undefined }), NOW)).audioUrl).toBeNull();
    expect(draftOf(normalizeItem(episode(), source({ audioHosts: ["cdn.example.net"] }), NOW)).audioUrl).toBeNull();
  });

  it("uses the audio file as the link when the item has none or links to the show's homepage", () => {
    const audio = "https://media.cdn.example.net/ep1.mp3?token=a";
    expect(draftOf(normalizeItem(episode({ link: null }), podcast(), NOW)).url).toBe(audio);
    expect(draftOf(normalizeItem(episode({ link: "https://example.it/podcast/" }), podcast(), NOW)).url).toBe(audio);
    // The fallback does not need the audio host to be among `hosts`.
    expect(draftOf(normalizeItem(episode({ link: null }), podcast({ hosts: ["example.it"] }), NOW)).audioUrl).toBe(audio);
  });

  it("still rejects an item without link and without accepted audio, or with a foreign link", () => {
    expect(normalizeItem(episode({ link: null, enclosure: null }), podcast(), NOW)).toEqual({ ok: false, reason: "no-link" });
    expect(normalizeItem(episode({ link: "https://other.example.org/x" }), podcast(), NOW)).toEqual({
      ok: false,
      reason: "foreign-host",
    });
  });
});
