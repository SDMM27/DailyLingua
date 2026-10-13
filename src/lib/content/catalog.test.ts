import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES } from "@/lib/domain/languages";
import { SOURCE_CATALOG } from "./catalog";
import { parseCatalog } from "./ingest";
import { readContentLicensePolicy } from "./policy";
import { isAllowedHost } from "./text";

const sources = parseCatalog(SOURCE_CATALOG);

/** Same canonical form as public.normalize_url for a homepage (no query string in the catalogue). */
function canonical(url: string): string {
  const u = new URL(url);
  return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, "")}${u.search}`.toLowerCase();
}

describe("source catalogue", () => {
  it("is valid", () => {
    expect(sources.length).toBe(SOURCE_CATALOG.length);
  });

  it("has unique keys and unique homepages (the database matches sources on the homepage)", () => {
    expect(new Set(sources.map((s) => s.key)).size).toBe(sources.length);
    expect(new Set(sources.map((s) => canonical(s.homepageUrl))).size).toBe(sources.length);
  });

  it("gives every language of the registry at least one source", () => {
    const covered = new Set(sources.map((s) => s.language));
    expect(LANGUAGE_CODES.filter((code) => !covered.has(code))).toEqual([]);
  });

  it("puts each homepage on one of the source's own hosts", () => {
    for (const s of sources) {
      expect(isAllowedHost(new URL(s.homepageUrl).hostname, s.hosts), s.key).toBe(true);
    }
  });

  it("never claims commercial use for an all-rights-reserved source", () => {
    for (const s of sources.filter((s) => s.license.kind === "all-rights-reserved")) {
      expect(s.license.commercialUse, s.key).toBe(false);
    }
  });

  it("records when each licence was checked, never in the future", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const s of sources) expect(s.license.verifiedOn <= today, s.key).toBe(true);
  });

  it("keeps at least one source per language usable under the commercial policy for the main languages", () => {
    const commercial = new Set(sources.filter((s) => s.license.commercialUse).map((s) => s.language));
    expect([...commercial].sort()).toEqual(expect.arrayContaining(["en", "es", "it", "ru"]));
  });
});

describe("readContentLicensePolicy", () => {
  it("defaults to 'all' and accepts 'commercial'", () => {
    expect(readContentLicensePolicy({})).toBe("all");
    expect(readContentLicensePolicy({ CONTENT_LICENSE_POLICY: " " })).toBe("all");
    expect(readContentLicensePolicy({ CONTENT_LICENSE_POLICY: "commercial" })).toBe("commercial");
  });

  it("fails loudly on an unknown value instead of widening the policy", () => {
    expect(() => readContentLicensePolicy({ CONTENT_LICENSE_POLICY: "commercail" })).toThrow(/invalide/);
  });
});
