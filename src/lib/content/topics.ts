import type { Language } from "@/lib/domain/languages";
import { GenerationError } from "@/lib/generation/errors";
import type { Topic } from "@/lib/schemas/preferences";

/** Contents sent to the classifier in one request. */
export const TOPIC_BATCH_SIZE = 20;

/** A content waiting for its domains. */
export interface UnclassifiedContent {
  id: string;
  language: Language;
  title: string;
  summary: string;
}

/** What the classifier reads of a content: never more than the title and the teaser. */
export type TopicClassifierItem = Pick<UnclassifiedContent, "language" | "title" | "summary">;

/**
 * Reads of a batch of contents (at most TOPIC_BATCH_SIZE) which domains each belongs to. The result
 * is aligned with the input: `null` for an item the model did not answer, `[]` for one it answered
 * « none fits ». Throws on a failure of the whole request. Implemented on Claude in
 * src/lib/generation/content-topics.ts; this side never sees the SDK.
 */
export interface TopicClassifier {
  classify(items: TopicClassifierItem[]): Promise<(Topic[] | null)[]>;
}

/** The part of the content store used to give contents their domains (`contents.topics`). */
export interface ContentTopicStore {
  /** Contents with `topics` null on an active source, link not broken, newest first. */
  listUnclassifiedContents(limit: number): Promise<UnclassifiedContent[]>;
  /** Sets the domains of each content (`[]`: classified, none fits). */
  setContentTopics(updates: { id: string; topics: Topic[] }[]): Promise<void>;
  /** Gives `topics` to the contents of a source that have none yet; returns how many were updated. */
  applySourceTopics(sourceKey: string, topics: Topic[]): Promise<number>;
}

export interface ClassifyPendingResult {
  /** Contents that got an answer (empty list included). */
  classified: number;
  /** Batches whose request failed; their contents stay unclassified and are retried next run. */
  failedBatches: number;
}

/**
 * Classifies up to `limit` unclassified contents, `concurrency` batches at a time. A failing batch is counted and
 * skipped and logged, never thrown: the ingestion must not fail because the model is down. An item the
 * model did not answer stays unclassified.
 */
export async function classifyPendingContents(
  store: ContentTopicStore,
  classifier: TopicClassifier,
  {
    limit = 200,
    concurrency = 1,
    log = () => {},
  }: { limit?: number; concurrency?: number; log?: (message: string) => void } = {},
): Promise<ClassifyPendingResult> {
  const pending = await store.listUnclassifiedContents(limit);
  const batches: UnclassifiedContent[][] = [];
  for (let from = 0; from < pending.length; from += TOPIC_BATCH_SIZE) batches.push(pending.slice(from, from + TOPIC_BATCH_SIZE));
  let classified = 0;
  let failedBatches = 0;
  let next = 0;
  async function worker() {
    while (next < batches.length) {
      const batch = batches[next++];
      await classifyBatch(batch);
    }
  }
  async function classifyBatch(batch: UnclassifiedContent[]) {
    try {
      const answers = await classifier.classify(batch.map(({ language, title, summary }) => ({ language, title, summary })));
      const updates = batch.flatMap((content, index) => {
        const topics = answers[index];
        return topics ? [{ id: content.id, topics }] : [];
      });
      if (updates.length > 0) await store.setContentTopics(updates);
      classified += updates.length;
    } catch (error) {
      failedBatches += 1;
      // Our own message only (see GenerationError): never the raw error, which may quote the contents.
      log(`topics: batch of ${batch.length} failed: ${error instanceof GenerationError ? `${error.reason}: ${error.message}` : "unexpected error"}`);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, batches.length)) }, worker));
  return { classified, failedBatches };
}
