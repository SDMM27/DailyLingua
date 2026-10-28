import { SOURCE_CATALOG } from "@/lib/content/catalog";
import type { FetchLike } from "@/lib/content/http";
import { ingest, type ContentStore, type IngestReport } from "@/lib/content/ingest";
import { classifyPendingContents, type ContentTopicStore, type TopicClassifier } from "@/lib/content/topics";
import type { ContentLicensePolicy, SourceDefinition } from "@/lib/schemas/content";

export interface IngestJobInput {
  store: ContentStore;
  policy: ContentLicensePolicy;
  /** Default: the built-in catalogue. */
  catalog?: SourceDefinition[];
  fetch?: FetchLike;
  linkChecks?: number;
  now?: Date;
  /** Classifies by domain the contents still without one, after the ingestion. Absent: skipped. */
  topics?: { store: ContentTopicStore; classifier: TopicClassifier; limit?: number };
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
    topicsClassified: number;
    topicsFailedBatches: number;
  };
}

/** Runs the ingestion and summarizes it in counters; partial when at least one feed failed. */
export async function runIngestJob(input: IngestJobInput): Promise<IngestJobResult> {
  const { store, policy, catalog = SOURCE_CATALOG, fetch, linkChecks, now, topics } = input;
  const report = await ingest(catalog, store, { policy, fetch, linkChecks, now });

  // A failed batch only leaves its contents for the next run: it does not make the job partial.
  const classified = topics
    ? await classifyPendingContents(topics.store, topics.classifier, { limit: topics.limit })
    : { classified: 0, failedBatches: 0 };

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
    topicsClassified: classified.classified,
    topicsFailedBatches: classified.failedBatches,
  };
  return { status: stats.sourcesError > 0 ? "partial" : "ok", report, stats };
}
