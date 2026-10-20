import { XMLParser } from "fast-xml-parser";

/** A feed entry, as raw as the feed gives it (HTML and entities included). */
export interface RawFeedItem {
  title: string;
  link: string | null;
  guid: string | null;
  /** HTML or text teaser. Full-text fields (`content:encoded`, Atom `content`) are only a fallback. */
  description: string | null;
  /** True when `description` came from a full-text field: it must be cut down even more carefully. */
  descriptionIsFullText: boolean;
  publishedAt: Date | null;
  author: string | null;
  categories: string[];
  /** itunes:duration as given. */
  duration: string | null;
  /** First audio/video attachment (RSS `<enclosure>`, Atom `link rel="enclosure"`); not checked here. */
  enclosure: { url: string; type: string | null } | null;
}

export interface ParsedFeed {
  format: "rss" | "atom" | "rdf";
  title: string | null;
  items: RawFeedItem[];
}

export class FeedParseError extends Error {
  override name = "FeedParseError";
}

/** Feeds are untrusted input: no DTD, so no entity expansion attack. */
const DOCTYPE = /<!DOCTYPE/i;

const ARRAY_PATHS = new Set([
  "rss.channel.item",
  "rss.channel.item.category",
  "rss.channel.item.enclosure",
  "feed.entry",
  "feed.entry.link",
  "feed.entry.category",
  "feed.entry.author",
  "rdf:RDF.item",
  "rdf:RDF.item.dc:subject",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
  isArray: (_name, jpath) => ARRAY_PATHS.has(String(jpath)),
});

type Node = Record<string, unknown>;

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Text of an element that may be a string, a number or an object with attributes. */
function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return text(value[0]);
  if (isNode(value)) return text(value["#text"]);
  return null;
}

function first(...values: unknown[]): string | null {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }
  return null;
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function categories(values: unknown[]): string[] {
  return values
    .map((c) => (isNode(c) ? first(c["#text"], c["@_term"], c["@_label"]) : text(c)))
    .filter((c): c is string => c !== null);
}

function rssEnclosure(item: Node): RawFeedItem["enclosure"] {
  const enclosure = asArray(item.enclosure).filter(isNode).find((e) => text(e["@_url"]));
  return enclosure ? { url: text(enclosure["@_url"])!, type: text(enclosure["@_type"]) } : null;
}

function rssItem(item: Node): RawFeedItem {
  const guid = item.guid;
  const guidText = text(guid);
  const guidIsLink = isNode(guid) ? guid["@_isPermaLink"] !== "false" : true;
  const summary = first(item.description);
  const fullText = first(item["content:encoded"]);
  return {
    title: first(item.title) ?? "",
    link: first(item.link) ?? (guidIsLink && guidText?.startsWith("http") ? guidText : null),
    guid: guidText,
    description: summary ?? fullText,
    descriptionIsFullText: summary === null && fullText !== null,
    publishedAt: parseDate(first(item.pubDate, item["dc:date"])),
    author: first(item["dc:creator"], item.author, item["itunes:author"]),
    categories: categories(asArray(item.category)),
    duration: first(item["itunes:duration"]),
    enclosure: rssEnclosure(item),
  };
}

function atomLink(entry: Node): string | null {
  const links = asArray(entry.link).filter(isNode);
  const alternate =
    links.find((l) => l["@_rel"] === "alternate" && (!l["@_type"] || l["@_type"] === "text/html")) ??
    links.find((l) => l["@_rel"] === undefined) ??
    links.find((l) => l["@_rel"] === "alternate");
  return alternate ? text(alternate["@_href"]) : null;
}

function atomEnclosure(entry: Node): RawFeedItem["enclosure"] {
  const link = asArray(entry.link).filter(isNode).find((l) => l["@_rel"] === "enclosure" && text(l["@_href"]));
  return link ? { url: text(link["@_href"])!, type: text(link["@_type"]) } : null;
}

function atomEntry(entry: Node): RawFeedItem {
  // YouTube feeds carry the description in `media:group/media:description` (Media RSS).
  const mediaGroup = asArray(entry["media:group"]).find(isNode);
  const summary = first(entry.summary, mediaGroup?.["media:description"]);
  const fullText = first(entry.content);
  const author = asArray(entry.author).find(isNode);
  return {
    title: first(entry.title) ?? "",
    link: atomLink(entry),
    guid: first(entry.id),
    description: summary ?? fullText,
    descriptionIsFullText: summary === null && fullText !== null,
    publishedAt: parseDate(first(entry.published, entry.updated)),
    author: author ? first(author.name) : null,
    categories: categories(asArray(entry.category)),
    duration: null,
    enclosure: atomEnclosure(entry),
  };
}

function rdfItem(item: Node): RawFeedItem {
  return {
    title: first(item.title) ?? "",
    link: first(item.link, item["@_rdf:about"]),
    guid: first(item["@_rdf:about"]),
    description: first(item.description),
    descriptionIsFullText: false,
    publishedAt: parseDate(first(item["dc:date"])),
    author: first(item["dc:creator"]),
    categories: categories(asArray(item["dc:subject"])),
    duration: null,
    enclosure: null,
  };
}

/** Parses an RSS 2.0, Atom 1.0 or RSS 1.0 (RDF) document. Throws `FeedParseError` otherwise. */
export function parseFeed(xml: string): ParsedFeed {
  if (DOCTYPE.test(xml.slice(0, 2000))) throw new FeedParseError("document type declarations are not accepted");
  let doc: Node;
  try {
    doc = parser.parse(xml) as Node;
  } catch (error) {
    throw new FeedParseError(`invalid XML: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (isNode(doc.rss) && isNode(doc.rss.channel)) {
    const channel = doc.rss.channel;
    return {
      format: "rss",
      title: first(channel.title),
      items: asArray(channel.item).filter(isNode).map(rssItem),
    };
  }
  if (isNode(doc.feed)) {
    return {
      format: "atom",
      title: first(doc.feed.title),
      items: asArray(doc.feed.entry).filter(isNode).map(atomEntry),
    };
  }
  const rdf = doc["rdf:RDF"];
  if (isNode(rdf)) {
    return {
      format: "rdf",
      title: isNode(rdf.channel) ? first(rdf.channel.title) : null,
      items: asArray(rdf.item).filter(isNode).map(rdfItem),
    };
  }
  throw new FeedParseError("not an RSS, Atom or RDF feed");
}
