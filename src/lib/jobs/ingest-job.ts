import { SOURCE_CATALOG } from "@/lib/content/catalog";
import type { FetchLike } from "@/lib/content/http";
import { ingest, type ContentStore, type IngestReport } from "@/lib/content/ingest";
import type { ContentLicensePolicy, SourceDefinition } from "@/lib/schemas/content";

export interface IngestJobInput {
  store: ContentStore;
  policy: ContentLicensePolicy;
  /** Default: the built-in catalogue. */
  catalog?: SourceDefinition[];
  fetch?: FetchLike;
  linkChecks?: number;
  now?: Date;
}

export interface IngestJobResult {
  status: "ok" | "partial";
  report: IngestReport;
  stats: {
    sources: number;
    sourcesOk: number;
    sourcesError: number;
    sourcesSkipped: number;
    inserted: number;
    linksChecked: number;
    linksBroken: number;
  };
}

/** Runs the ingestion and summarizes it in counters; partial when at least one feed failed. */
export async function runIngestJob(input: IngestJobInput): Promise<IngestJobResult> {
  const { store, policy, catalog = SOURCE_CATALOG, fetch, linkChecks, now } = input;
  const report = await ingest(catalog, store, { policy, fetch, linkChecks, now });

  const count = (status: IngestReport["sources"][number]["status"]) =>
    report.sources.filter((s) => s.status === status).length;
  const stats = {
    sources: report.sources.length,
    sourcesOk: count("ok"),
    sourcesError: count("error"),
    sourcesSkipped: count("skipped-policy"),
    inserted: report.sources.reduce((total, s) => total + s.inserted, 0),
    linksChecked: report.links.checked,
    linksBroken: report.links.broken,
  };
  return { status: stats.sourcesError > 0 ? "partial" : "ok", report, stats };
}
