import { languageInfo } from "@/lib/domain/languages";
import type { CefrLevel, ContentType, Language } from "@/lib/schemas/common";
import type { ParsedSourceDefinition } from "@/lib/schemas/content";
import type { RawFeedItem } from "./feed-parser";
import {
  MAX_SUMMARY_LENGTH,
  MAX_TITLE_LENGTH,
  cleanUrl,
  htmlToText,
  isAllowedHost,
  parseDurationMinutes,
  stripBoilerplate,
  truncate,
} from "./text";
import { youtubeVideoId, youtubeWatchUrl } from "./youtube";

/** What the ingestion stores for a feed item: metadata and a short teaser, never the full text. */
export interface ContentDraft {
  sourceKey: string;
  language: Language;
  contentType: ContentType;
  title: string;
  url: string;
  difficulty: CefrLevel;
  durationMinutes: number;
  summary: string;
  author: string | null;
  categories: string[];
  publishedAt: Date | null;
}

export type RejectReason =
  | "no-title"
  | "no-link"
  | "foreign-host"
  | "short"
  | "live"
  | "off-topic"
  | "too-old"
  | "duplicate";

/** Live streams and their replays (« 🔴 LIVE », « [LIVE] », « 24/7 »): hours long, not a lesson. */
const LIVE_TITLE = /🔴|\bLIVE\b|24\/7/;

export type NormalizeResult = { ok: true; draft: ContentDraft } | { ok: false; reason: RejectReason };

/** Items older than this are ignored (podcast feeds can list a decade of episodes). */
export const MAX_ITEM_AGE_DAYS = 45;
/** A full-text fallback only gives its first sentences: stricter than the teaser limit. */
const FULL_TEXT_TEASER_LENGTH = 200;
/** Teaser limits for dense scripts (Chinese, Japanese, Korean). */
const DENSE_SUMMARY_LENGTH = 120;
const DENSE_FULL_TEXT_TEASER_LENGTH = 90;
const MAX_CATEGORIES = 8;
const MAX_CATEGORY_LENGTH = 60;
const MAX_AUTHOR_LENGTH = 200;

/** First bold link of the featured-article blurb: `<b><a href="/wiki/X" title="X">X</a></b>`. */
const WIKIPEDIA_LEAD = /<b>\s*<a\s[^>]*?href="([^"]+)"[^>]*?(?:title="([^"]*)")?[^>]*>([\s\S]*?)<\/a>\s*<\/b>/i;

/**
 * Wikipedia's featured feed wraps the day's article in an entry titled with the date and linked
 * to Special:FeedItem. The article's own title and URL are the first bold link of the summary,
 * which starts the blurb (what comes before it is image and box markup).
 */
function unwrapWikipediaFeatured(item: RawFeedItem): RawFeedItem {
  const html = item.description ?? "";
  const lead = WIKIPEDIA_LEAD.exec(html);
  if (!lead) return { ...item, link: null };
  return {
    ...item,
    title: decodeTitleAttribute(lead[2]) ?? lead[3],
    link: lead[1],
    description: html.slice(lead.index),
    descriptionIsFullText: false,
  };
}

function decodeTitleAttribute(value: string | undefined): string | null {
  return value ? htmlToText(value) || null : null;
}

/** A line that links somewhere (`http://`, `https://`, `www.`) or only draws a rule (`---`, `___`). */
const PROMO_LINE = /(?:https?:\/\/|\bwww\.)|^\s*(?:-{3,}|_{3,})\s*$/i;

/**
 * YouTube descriptions start with a few sentences about the video, then turn to promotion (links,
 * social networks, sponsors). Keeps the lines before the first line with a link or a separator.
 */
function youtubeTeaserSource(description: string): string {
  const lines = description.split(/\r\n|\r|\n/);
  const end = lines.findIndex((line) => PROMO_LINE.test(line));
  return (end === -1 ? lines : lines.slice(0, end)).join("\n");
}

/** `RegExp.test` on a copy, so a rule written with the `g` or `y` flag keeps no state between items. */
function matches(pattern: RegExp, text: string): boolean {
  return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, "")).test(text);
}

/** Turns a raw feed item into a content draft, or says why it is skipped. */
export function normalizeItem(rawItem: RawFeedItem, source: ParsedSourceDefinition, now: Date): NormalizeResult {
  const item = source.itemFormat === "wikipedia-featured" ? unwrapWikipediaFeatured(rawItem) : rawItem;
  const title = truncate(htmlToText(item.title), MAX_TITLE_LENGTH);
  if (!title) return { ok: false, reason: "no-title" };
  if (source.titleFilter && !matches(source.titleFilter, title)) return { ok: false, reason: "off-topic" };

  let url = item.link ? cleanUrl(htmlToText(item.link), source.homepageUrl) : null;
  if (!url) return { ok: false, reason: "no-link" };
  // A feed only speaks for its own site: links elsewhere (ads, partners, hijacked feeds) are dropped.
  if (!isAllowedHost(url.hostname, source.hosts)) return { ok: false, reason: "foreign-host" };
  const youtube = source.itemFormat === "youtube";
  if (youtube) {
    // Shorts are too short for an activity; anything but a plain watch link cannot be played.
    if (url.pathname.startsWith("/shorts/")) return { ok: false, reason: "short" };
    if (LIVE_TITLE.test(title)) return { ok: false, reason: "live" };
    const id = youtubeVideoId(url.toString());
    if (!id) return { ok: false, reason: "no-link" };
    url = new URL(youtubeWatchUrl(id));
  }

  // Dates in the future (time zone bugs, scheduled posts) are not trusted.
  const publishedAt = item.publishedAt && item.publishedAt.getTime() <= now.getTime() + 60 * 60 * 1000
    ? item.publishedAt
    : null;
  const maxAgeDays = source.maxAgeDays ?? MAX_ITEM_AGE_DAYS;
  if (publishedAt && now.getTime() - publishedAt.getTime() > maxAgeDays * 86_400_000) {
    return { ok: false, reason: "too-old" };
  }

  const teaserSource = item.description && youtube ? youtubeTeaserSource(item.description) : item.description;
  const description = teaserSource ? stripBoilerplate(htmlToText(teaserSource)) : "";
  const dense = languageInfo(source.language).denseScript === true;
  const teaserLength = item.descriptionIsFullText
    ? dense ? DENSE_FULL_TEXT_TEASER_LENGTH : FULL_TEXT_TEASER_LENGTH
    : dense ? DENSE_SUMMARY_LENGTH : MAX_SUMMARY_LENGTH;
  // Some feeds repeat the title as the description: no teaser is better than a duplicate.
  const summary = description && description !== title ? truncate(description, teaserLength) : title;

  const author = item.author ? truncate(htmlToText(item.author), MAX_AUTHOR_LENGTH) || null : null;
  const categories = [
    ...new Set(
      item.categories
        .map((c) => htmlToText(c))
        .filter((c) => c.length > 0 && c.length <= MAX_CATEGORY_LENGTH),
    ),
  ].slice(0, MAX_CATEGORIES);

  return {
    ok: true,
    draft: {
      sourceKey: source.key,
      language: source.language,
      contentType: source.contentType,
      title,
      url: url.toString(),
      difficulty: source.levelRules?.find((rule) => matches(rule.pattern, title))?.difficulty ?? source.difficulty,
      durationMinutes: parseDurationMinutes(item.duration ?? undefined) ?? source.defaultMinutes,
      summary,
      author,
      categories,
      publishedAt,
    },
  };
}

/** Normalizes a feed, keeps the `limit` most recent valid items, one per URL. */
export function normalizeFeed(
  items: RawFeedItem[],
  source: ParsedSourceDefinition,
  now: Date,
  limit: number,
): { drafts: ContentDraft[]; rejected: Partial<Record<RejectReason, number>> } {
  const rejected: Partial<Record<RejectReason, number>> = {};
  const byUrl = new Map<string, ContentDraft>();
  for (const item of items) {
    const result = normalizeItem(item, source, now);
    if (!result.ok) {
      rejected[result.reason] = (rejected[result.reason] ?? 0) + 1;
      continue;
    }
    if (byUrl.has(result.draft.url)) {
      rejected.duplicate = (rejected.duplicate ?? 0) + 1;
      continue;
    }
    byUrl.set(result.draft.url, result.draft);
  }
  const drafts = [...byUrl.values()]
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .slice(0, limit);
  return { drafts, rejected };
}
