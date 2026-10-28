/**
 * Gives the contents their domains (the `TOPICS`) when the ingestion has not: Claude reads the title
 * and the teaser of each content whose `topics` is still null.
 *
 *   npm run content:topics                 one round (200 contents, newest first)
 *   npm run content:topics -- --backfill   first the fixed domains of the catalogue's sources
 *                                          (`defaultTopics`) on their existing contents, then rounds
 *                                          of 200 until nothing is left to classify
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and ANTHROPIC_API_KEY (read from
 * .env.local); fails when CONTENT_TOPICS=off. The ingestion (content:ingest, /api/cron/ingest)
 * classifies the new contents by itself.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { SOURCE_CATALOG } from "@/lib/content/catalog";
import { createSupabaseContentStore } from "@/lib/content/supabase-store";
import { classifyPendingContents } from "@/lib/content/topics";
import { readContentTopicsConfig } from "@/lib/generation/config";
import { createClaudeTopicClassifier } from "@/lib/generation/content-topics";
import type { Database } from "@/lib/supabase/database.types";

const ROUND_LIMIT = 200;

const { values } = parseArgs({ options: { backfill: { type: "boolean", default: false } } });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (voir .env.example).");
  process.exit(1);
}
const config = readContentTopicsConfig();
if (!config.enabled) {
  console.error("Classement désactivé : il faut ANTHROPIC_API_KEY et CONTENT_TOPICS différent de « off » (voir .env.example).");
  process.exit(1);
}

const client = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const store = createSupabaseContentStore(client);
const classifier = createClaudeTopicClassifier({ apiKeys: config.apiKeys, model: config.model });

if (values.backfill) {
  for (const source of SOURCE_CATALOG) {
    if (!source.defaultTopics) continue;
    const updated = await store.applySourceTopics(source.key, source.defaultTopics);
    if (updated > 0) console.log(`${source.key} : ${updated} contenus → ${source.defaultTopics.join(", ")}`);
  }
}

let classified = 0;
let failedBatches = 0;
for (let round = 1; ; round++) {
  const result = await classifyPendingContents(store, classifier, { limit: ROUND_LIMIT });
  classified += result.classified;
  failedBatches += result.failedBatches;
  console.log(`Tour ${round} : ${result.classified} contenus classés, ${result.failedBatches} lots en échec.`);
  // One round without --backfill; with it, until nothing more is classified (or only failures remain).
  if (!values.backfill || result.classified === 0) break;
}
console.log(`\n${classified} contenus classés, ${failedBatches} lots en échec.`);
process.exitCode = failedBatches > 0 ? 2 : 0;
