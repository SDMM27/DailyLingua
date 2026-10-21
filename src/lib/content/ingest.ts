import {
  sourceDefinitionSchema,
  type ContentLicensePolicy,
  type ParsedSourceDefinition,
  type SourceDefinition,
} from "@/lib/schemas/content";
import { parseFeed } from "./feed-parser";
import { checkLink, fetchFeed, type FetchLike, type LinkCheck } from "./http";
import { normalizeFeed, type ContentDraft, type RejectReason } from "./normalize";

/** Where ingested content goes. Implemented on Supabase (service role) and in memory for tests. */
export interface ContentStore {
  /** Creates or updates the sources (matched by homepage), returns their ids by key. */
  syncSources(sources: ParsedSourceDefinition[], active: (source: ParsedSourceDefinition) => boolean): Promise<Map<string, string>>;
  /** Inserts the drafts whose URL is not known yet; returns how many were new. */
  insertContents(sourceId: string, drafts: ContentDraft[]): Promise<number>;
  recordFetch(sourceId: string, result: { ok: true; itemCount: number } | { ok: false; error: string }): Promise<void>;
  /** Contents never checked (or inconclusive more than a day ago), oldest first. */
  listUncheckedLinks(limit: number): Promise<{ id: string; url: string; sourceKey: string | null }[]>;
  /** Records a check; `null` (inconclusive) only stamps the check time so it waits a day. */
  setLinkStatus(id: string, status: LinkCheck["status"]): Promise<void>;
}

export interface IngestOptions {
  policy: ContentLicensePolicy;
  /** Only these source keys (all when omitted). */
  only?: string[];
  /** Items kept per feed and per run. */
  itemsPerSource?: number;
  /** Link checks per run (0 disables them). */
  linkChecks?: number;
  fetch?: FetchLike;
  now?: Date;
}

export interface SourceReport {
  key: string;
  status: "ok" | "error" | "skipped-policy";
  fetched: number;
  kept: number;
  inserted: number;
  rejected: Partial<Record<RejectReason, number>>;
  error?: string;
}

export interface IngestReport {
  sources: SourceReport[];
  links: { checked: number; ok: number; redirected: number; broken: number; inconclusive: number };
}

/** Whether a source may be used under the licence policy. */
export function isSourceAllowed(source: Pick<ParsedSourceDefinition, "license">, policy: ContentLicensePolicy): boolean {
  return policy === "all" || source.license.commercialUse;
}

/** Validates the catalogue; throws with every problem listed. */
export function parseCatalog(catalog: SourceDefinition[]): ParsedSourceDefinition[] {
  return catalog.map((source, index) => {
    const parsed = sourceDefinitionSchema.safeParse(source);
    if (!parsed.success) {
      throw new Error(`Source #${index} (${source.key}) invalide : ${parsed.error.message}`);
    }
    return parsed.data;
  });
}

/** Runs `task` over `items`, `concurrency` at a time. */
async function pool<T>(items: T[], concurrency: number, task: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await task(item);
    }
  });
  await Promise.all(workers);
}

/**
 * Fetches every feed of the catalogue, stores new items, then checks the links that were never
 * checked. One failing feed never stops the others: its error is recorded on the source.
 */
export async function ingest(catalog: SourceDefinition[], store: ContentStore, options: IngestOptions): Promise<IngestReport> {
  const { policy, itemsPerSource = 15, linkChecks = 60, fetch: fetchImpl = fetch } = options;
  const now = options.now ?? new Date();
  const sources = parseCatalog(catalog);
  const selected = options.only ? sources.filter((s) => options.only!.includes(s.key)) : sources;

  const ids = await store.syncSources(sources, (s) => isSourceAllowed(s, policy));

  const reports: SourceReport[] = [];
  await pool(selected, 4, async (source) => {
    const report: SourceReport = { key: source.key, status: "ok", fetched: 0, kept: 0, inserted: 0, rejected: {} };
    reports.push(report);
    const sourceId = ids.get(source.key);
    if (!sourceId) throw new Error(`source ${source.key} absente après synchronisation`);
    if (!isSourceAllowed(source, policy)) {
      report.status = "skipped-policy";
      return;
    }
    try {
      const feed = parseFeed(await fetchFeed(source.feedUrl, fetchImpl));
      const { drafts, rejected } = normalizeFeed(feed.items, source, now, itemsPerSource);
      report.fetched = feed.items.length;
      report.kept = drafts.length;
      report.rejected = rejected;
      report.inserted = await store.insertContents(sourceId, drafts);
      await store.recordFetch(sourceId, { ok: true, itemCount: feed.items.length });
    } catch (error) {
      report.status = "error";
      report.error = error instanceof Error ? error.message : String(error);
      await store.recordFetch(sourceId, { ok: false, error: report.error.slice(0, 500) });
    }
  });

  const links = { checked: 0, ok: 0, redirected: 0, broken: 0, inconclusive: 0 };
  if (linkChecks > 0) {
    // A podcast episode may be linked to its audio file (no page of its own): its hosts count too.
    const hostsByKey = new Map(sources.map((s) => [s.key, [...s.hosts, ...(s.audioHosts ?? [])]]));
    const pending = await store.listUncheckedLinks(linkChecks);
    await pool(pending, 4, async ({ id, url, sourceKey }) => {
      const hosts = sourceKey ? hostsByKey.get(sourceKey) : undefined;
      // Contents of a source that left the catalogue are not checked: we no longer trust its hosts.
      if (!hosts) return;
      const result = await checkLink(url, hosts, fetchImpl);
      links.checked++;
      links[result.status ?? "inconclusive"]++;
      await store.setLinkStatus(id, result.status);
    });
  }

  reports.sort((a, b) => a.key.localeCompare(b.key));
  return { sources: reports, links };
}
