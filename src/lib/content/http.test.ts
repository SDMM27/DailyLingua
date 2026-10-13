import { describe, expect, it, vi } from "vitest";
import { FeedFetchError, MAX_FEED_BYTES, checkLink, decodeXml, fetchFeed, type FetchLike } from "./http";

type Route = { status: number; location?: string; body?: string };

/** Fake fetch answering per "METHOD url"; records every request. */
function fakeFetch(routes: Record<string, Route>) {
  const calls: string[] = [];
  const impl = vi.fn<FetchLike>(async (url, init) => {
    const key = `${init?.method ?? "GET"} ${url}`;
    calls.push(key);
    const route = routes[key] ?? routes[`* ${url}`];
    if (!route) throw new Error(`unexpected request ${key}`);
    const headers = new Headers(route.location ? { location: route.location } : {});
    return new Response(route.status === 204 || route.status === 304 || (route.status >= 300 && route.status < 400) ? null : (route.body ?? ""), {
      status: route.status,
      headers,
    });
  });
  return { impl, calls };
}

const HOSTS = ["example.com"];

describe("checkLink", () => {
  it("reports a page that answers", async () => {
    const { impl } = fakeFetch({ "HEAD https://example.com/a": { status: 200 } });
    expect(await checkLink("https://example.com/a", HOSTS, impl)).toEqual({
      status: "ok",
      httpStatus: 200,
      finalUrl: "https://example.com/a",
    });
  });

  it("confirms a failing HEAD with a GET before calling a link broken", async () => {
    const { impl } = fakeFetch({
      "HEAD https://example.com/s/1": { status: 404 },
      "GET https://example.com/s/1": { status: 200 },
    });
    expect((await checkLink("https://example.com/s/1", HOSTS, impl)).status).toBe("ok");

    const gone = fakeFetch({ "* https://example.com/gone": { status: 410 } });
    expect((await checkLink("https://example.com/gone", HOSTS, gone.impl)).status).toBe("broken");
  });

  it("follows redirects within the source's hosts", async () => {
    const { impl } = fakeFetch({
      "HEAD https://example.com/old": { status: 301, location: "/new" },
      "HEAD https://example.com/new": { status: 200 },
    });
    expect(await checkLink("https://example.com/old", HOSTS, impl)).toEqual({
      status: "redirected",
      httpStatus: 200,
      finalUrl: "https://example.com/new",
    });
  });

  it("does not count http → https or a trailing slash as a move", async () => {
    const { impl } = fakeFetch({
      "HEAD http://example.com/a": { status: 301, location: "https://www.example.com/a/" },
      "HEAD https://www.example.com/a/": { status: 200 },
    });
    expect((await checkLink("http://example.com/a", HOSTS, impl)).status).toBe("ok");
  });

  it("never follows a redirect to another site", async () => {
    const { impl, calls } = fakeFetch({
      "HEAD https://example.com/a": { status: 302, location: "https://consent.other.org/?next=a" },
    });
    expect(await checkLink("https://example.com/a", HOSTS, impl)).toEqual({
      status: "redirected",
      httpStatus: 302,
      finalUrl: "https://consent.other.org/?next=a",
    });
    expect(calls).toEqual(["HEAD https://example.com/a"]);
  });

  it("is inconclusive on bot filters, server errors and network failures", async () => {
    const blocked = fakeFetch({ "* https://example.com/a": { status: 403 } });
    expect((await checkLink("https://example.com/a", HOSTS, blocked.impl)).status).toBeNull();
    const down = fakeFetch({ "* https://example.com/a": { status: 503 } });
    expect((await checkLink("https://example.com/a", HOSTS, down.impl)).status).toBeNull();
    const failing: FetchLike = async () => {
      throw new TypeError("fetch failed");
    };
    expect(await checkLink("https://example.com/a", HOSTS, failing)).toEqual({
      status: null,
      httpStatus: null,
      finalUrl: null,
    });
  });

  it("gives up on redirect loops", async () => {
    const { impl } = fakeFetch({
      "HEAD https://example.com/a": { status: 302, location: "/b" },
      "HEAD https://example.com/b": { status: 302, location: "/a" },
    });
    expect((await checkLink("https://example.com/a", HOSTS, impl)).status).toBeNull();
  });
});

describe("fetchFeed", () => {
  it("returns the document and identifies the app", async () => {
    const { impl } = fakeFetch({ "GET https://example.com/feed": { status: 200, body: "<rss/>" } });
    expect(await fetchFeed("https://example.com/feed", impl)).toBe("<rss/>");
    const init = impl.mock.calls[0][1];
    expect(new Headers(init?.headers).get("user-agent")).toMatch(/^DailyLingua\//);
  });

  it("fails on HTTP errors and oversized documents", async () => {
    const missing = fakeFetch({ "GET https://example.com/feed": { status: 404 } });
    await expect(fetchFeed("https://example.com/feed", missing.impl)).rejects.toThrow(FeedFetchError);

    const huge = fakeFetch({ "GET https://example.com/feed": { status: 200, body: "x".repeat(MAX_FEED_BYTES + 1) } });
    await expect(fetchFeed("https://example.com/feed", huge.impl)).rejects.toThrow(/larger than/);
  });
});

describe("decodeXml", () => {
  it("uses the charset of the XML declaration when the header has none", () => {
    // "Мир" in windows-1251.
    const bytes = new Uint8Array([
      ...new TextEncoder().encode('<?xml version="1.0" encoding="windows-1251"?><t>'),
      0xcc,
      0xe8,
      0xf0,
      ...new TextEncoder().encode("</t>"),
    ]);
    expect(decodeXml(bytes, "text/xml")).toContain("<t>Мир</t>");
  });

  it("prefers the HTTP charset and falls back to UTF-8 on unknown labels", () => {
    expect(decodeXml(new TextEncoder().encode("<t>é</t>"), "text/xml; charset=utf-8")).toBe("<t>é</t>");
    expect(decodeXml(new TextEncoder().encode("<t>é</t>"), "text/xml; charset=nonsense")).toBe("<t>é</t>");
  });
});
