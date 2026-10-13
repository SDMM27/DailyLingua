/**
 * Text helpers for feed items: feeds carry HTML fragments, entities and tracking parameters.
 * Pure functions, no DOM: they also run in the ingestion script and, later, a native app.
 */

/** Maximum length of the teaser kept for a content. Far below the database limit on purpose. */
export const MAX_SUMMARY_LENGTH = 280;
export const MAX_TITLE_LENGTH = 300;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  laquo: "«",
  raquo: "»",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bdquo: "„",
  middot: "·",
  shy: "",
  zwnj: "",
  zwj: "",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      // Invalid or control code points are dropped rather than rendered.
      if (!Number.isFinite(code) || code > 0x10ffff || (code < 0x20 && code !== 0x09 && code !== 0x0a)) return "";
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Inline elements are removed without a space ("<a>word</a>," stays "word,"); others become a space. */
const INLINE_TAG = /<\/?(a|abbr|b|bdi|bdo|cite|code|em|font|i|kbd|mark|q|s|small|span|strong|sub|sup|time|u|wbr)\b[^>]*>/gi;
const ANY_TAG = /<\/?[a-z][^>]*>/gi;

function stripTags(html: string): string {
  return html.replace(INLINE_TAG, "").replace(ANY_TAG, " ");
}

/** Plain text of an HTML fragment, on one line. */
export function htmlToText(html: string): string {
  const withoutBlocks = html
    .replace(/<(script|style|figure|figcaption|iframe|noscript)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  // A second pass removes markup that was itself escaped once more.
  return stripTags(decodeEntities(stripTags(withoutBlocks)))
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f­]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Boilerplate appended by blog engines to feed descriptions. */
const TRAILING_BOILERPLATE = [
  /\s*The post .{1,300} appeared first on .{1,200}\.?$/i,
  /\s*\[(?:…|\.\.\.|&hellip;)\]\s*$/,
  /\s*(?:Read more|Continue reading|Leggi(?: tutto)?|Weiterlesen|Читать далее|Leer más|Lees meer)\s*(?:»|›|→|\.\.\.|…)?\s*$/i,
];

export function stripBoilerplate(text: string): string {
  let result = text;
  for (const pattern of TRAILING_BOILERPLATE) result = result.replace(pattern, "");
  return result.trim();
}

/**
 * Shortens text to at most `max` characters (code points), at a word boundary when the language
 * separates words with spaces, with an ellipsis. Scripts without spaces (Chinese, Japanese) are
 * cut at a character boundary, never inside a surrogate pair.
 */
export function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  const head = chars.slice(0, max - 1).join("");
  const lastSpace = head.lastIndexOf(" ");
  const cut = lastSpace >= head.length * 0.6 ? head.slice(0, lastSpace) : head;
  return `${cut.replace(/[\s,;:.!?·–—-]+$/u, "")}…`;
}

/** Query parameters that only track the reader. */
const TRACKING_PARAM = /^(utm_[a-z_]*|fbclid|gclid|mc_cid|mc_eid|at_[a-z_]*|ocid|xtor|ns_[a-z_]*|cmpid|maca)$/i;

/**
 * The URL to store and open: http(s) only, without fragment or tracking parameters.
 * Returns null for anything else (javascript:, relative links the base cannot resolve, garbage).
 */
export function cleanUrl(raw: string, base?: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim(), base);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  }
  return url;
}

/** Whether `hostname` is one of `hosts` or a subdomain of one. */
export function isAllowedHost(hostname: string, hosts: readonly string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/** "1:02:03", "62:03", "3723" (seconds) → minutes, rounded up. Null when unreadable. */
export function parseDurationMinutes(raw: string | undefined): number | null {
  if (!raw) return null;
  const value = raw.trim();
  let seconds: number;
  if (/^\d+$/.test(value)) {
    seconds = Number(value);
  } else if (/^\d{1,3}(:\d{1,2}){1,2}$/.test(value)) {
    seconds = value.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  } else {
    return null;
  }
  if (seconds <= 0) return null;
  return Math.min(600, Math.max(1, Math.ceil(seconds / 60)));
}
