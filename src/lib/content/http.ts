import { isAllowedHost } from "./text";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Identifies the app to publishers, as polite crawlers do. */
export const USER_AGENT = "DailyLingua/0.4 (language learning app; reads public RSS feeds)";

const FEED_TIMEOUT_MS = 20_000;
const LINK_TIMEOUT_MS = 10_000;
/** A feed larger than this is refused (the largest one in the catalogue is about 2 MB). */
export const MAX_FEED_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;

export class FeedFetchError extends Error {
  override name = "FeedFetchError";
}

async function readLimited(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (declared > maxBytes) throw new FeedFetchError(`feed too large (${declared} bytes)`);
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new FeedFetchError(`feed larger than ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decodeXml(bytes, response.headers.get("content-type"));
}

/** Decodes a feed with the charset of the HTTP header or the XML declaration (UTF-8 by default). */
export function decodeXml(bytes: Uint8Array, contentType: string | null): string {
  const fromHeader = contentType?.match(/charset=["']?([\w-]+)/i)?.[1];
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 200));
  const fromDeclaration = head.match(/<\?xml[^>]*encoding=["']([\w-]+)["']/i)?.[1];
  for (const label of [fromHeader, fromDeclaration, "utf-8"]) {
    if (!label) continue;
    try {
      return new TextDecoder(label).decode(bytes);
    } catch {
      // Unknown label: try the next one.
    }
  }
  return new TextDecoder().decode(bytes);
}

/** Downloads a feed. Throws `FeedFetchError` on HTTP errors, timeouts and oversized documents. */
export async function fetchFeed(url: string, fetchImpl: FetchLike = fetch): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
  } catch (error) {
    throw new FeedFetchError(`request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new FeedFetchError(`HTTP ${response.status}`);
  }
  return readLimited(response, MAX_FEED_BYTES);
}

/**
 * Result of a link check. `null` status = inconclusive (timeout, 403 from a bot filter, 429,
 * server error): the link keeps its previous status and is checked again later.
 */
export interface LinkCheck {
  status: "ok" | "redirected" | "broken" | null;
  httpStatus: number | null;
  finalUrl: string | null;
}

/**
 * Checks that a content's page exists, without downloading it: HEAD, confirmed by a GET when HEAD
 * fails (the body is never read). Redirects are followed only within `hosts`; a redirect
 * elsewhere (consent wall, paywall login, another site) is reported as "redirected".
 */
export async function checkLink(url: string, hosts: readonly string[], fetchImpl: FetchLike = fetch): Promise<LinkCheck> {
  let current = url;
  let redirected = false;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let response: Response;
    try {
      response = await request(current, "HEAD", fetchImpl);
      // Some servers answer HEAD with 404 or 405 for pages that exist: only a GET is trusted.
      if (response.status >= 400) {
        await response.body?.cancel().catch(() => undefined);
        response = await request(current, "GET", fetchImpl);
      }
    } catch {
      return { status: null, httpStatus: null, finalUrl: null };
    }
    await response.body?.cancel().catch(() => undefined);

    const { status } = response;
    if (status >= 300 && status < 400) {
      const location = response.headers.get("location");
      const next = location ? safeUrl(location, current) : null;
      if (!next) return { status: "broken", httpStatus: status, finalUrl: null };
      redirected ||= !sameResource(next, current);
      if (!isAllowedHost(new URL(next).hostname, hosts)) {
        return { status: "redirected", httpStatus: status, finalUrl: next };
      }
      current = next;
      continue;
    }
    if (status >= 200 && status < 300) {
      return { status: redirected ? "redirected" : "ok", httpStatus: status, finalUrl: current };
    }
    if (status === 404 || status === 410) return { status: "broken", httpStatus: status, finalUrl: current };
    return { status: null, httpStatus: status, finalUrl: current };
  }
  return { status: null, httpStatus: null, finalUrl: current };
}

function request(url: string, method: "HEAD" | "GET", fetchImpl: FetchLike): Promise<Response> {
  return fetchImpl(url, {
    method,
    headers: { "user-agent": USER_AGENT, accept: "text/html,*/*;q=0.8" },
    redirect: "manual",
    signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
  });
}

function safeUrl(location: string, base: string): string | null {
  try {
    const url = new URL(location, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** http → https and a trailing slash are not real moves. */
function sameResource(a: string, b: string): boolean {
  const key = (u: string) => {
    const url = new URL(u);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  };
  return key(a) === key(b);
}
