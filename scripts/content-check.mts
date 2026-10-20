/**
 * Checks the catalogue without touching the database: every feed must answer and parse, its items
 * must point to the source's own site, the newest item must be recent, and the homepage, licence
 * and terms pages must answer. Run it before adding or changing a source.
 *
 *   npm run content:check
 *   npm run content:check -- --source meduza --verbose
 */
import { parseArgs } from "node:util";
import { SOURCE_CATALOG } from "@/lib/content/catalog";
import { parseFeed } from "@/lib/content/feed-parser";
import { USER_AGENT, checkLink, fetchFeed } from "@/lib/content/http";
import { parseCatalog } from "@/lib/content/ingest";
import { normalizeFeed } from "@/lib/content/normalize";

const { values } = parseArgs({
  options: {
    source: { type: "string", multiple: true },
    verbose: { type: "boolean", default: false },
  },
});

/** A source whose newest item is older than this is reported as stale. */
const STALE_AFTER_DAYS = 21;
const now = new Date();
const sources = parseCatalog(SOURCE_CATALOG).filter((s) => !values.source || values.source.includes(s.key));

/** Status of a page that is not on the source's content hosts (licence deed, terms PDF...). */
async function pageStatus(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "user-agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    await response.body?.cancel();
    return response.ok ? "ok" : `HTTP ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

interface Row {
  source: string;
  langue: string;
  flux: string;
  items: number;
  valides: number;
  "plus récent": string;
  "lien test": string;
  pages: string;
  problèmes: string;
}

const rows: Row[] = [];
for (const source of sources) {
  const problems: string[] = [];
  const row: Row = {
    source: source.key,
    langue: source.language,
    flux: "ok",
    items: 0,
    valides: 0,
    "plus récent": "",
    "lien test": "",
    pages: "",
    problèmes: "",
  };
  try {
    const feed = parseFeed(await fetchFeed(source.feedUrl));
    const { drafts, rejected } = normalizeFeed(feed.items, source, now, 50);
    row.items = feed.items.length;
    row.valides = drafts.length;
    const newest = drafts.find((d) => d.publishedAt)?.publishedAt;
    row["plus récent"] = newest ? newest.toISOString().slice(0, 10) : "sans date";
    const reasons = Object.entries(rejected).map(([reason, count]) => `${reason}: ${count}`).join(", ");
    if (drafts.length === 0) problems.push(`aucun item valide${reasons ? ` (${reasons})` : ""}`);
    if (newest && now.getTime() - newest.getTime() > STALE_AFTER_DAYS * 86_400_000) problems.push("flux inactif");
    if (rejected["foreign-host"]) problems.push(`${rejected["foreign-host"]} lien(s) hors domaine`);
    if (drafts[0]) {
      const link = await checkLink(drafts[0].url, source.hosts);
      row["lien test"] = link.status ?? `incertain (${link.httpStatus ?? "délai"})`;
      if (link.status === "broken") problems.push("lien cassé");
    }
    if (values.verbose) {
      for (const d of drafts.slice(0, 3)) {
        console.log(`\n[${source.key}] ${d.title}\n  ${d.url}\n  ${d.durationMinutes} min · ${d.summary}`);
      }
    }
  } catch (error) {
    row.flux = "ERREUR";
    problems.push(error instanceof Error ? error.message : String(error));
  }

  const pages = await Promise.all(
    [
      ["accueil", source.homepageUrl],
      ["conditions", source.license.termsUrl],
      ["licence", source.license.url],
    ].map(async ([label, url]) => (url ? `${label}:${await pageStatus(url)}` : null)),
  );
  row.pages = pages.filter(Boolean).join(" ");
  for (const page of pages) if (page && !page.endsWith(":ok")) problems.push(page);
  row.problèmes = problems.join(" ; ");
  rows.push(row);
}

console.table(rows);
const failing = rows.filter((r) => r.problèmes);
console.log(`\n${rows.length} sources vérifiées, ${failing.length} avec des problèmes.`);
process.exitCode = failing.some((r) => r.flux === "ERREUR" || r.valides === 0) ? 1 : 0;
