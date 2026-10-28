/**
 * Fetches the RSS / Atom feeds of the catalogue into Supabase, then checks new links.
 *
 *   npm run content:ingest                      all sources
 *   npm run content:ingest -- --source meduza   one or more sources (repeatable)
 *   npm run content:ingest -- --no-links        skip link checks
 *
 * Then classifies the new contents by domain (Claude), unless CONTENT_TOPICS=off or no key is set;
 * `npm run content:topics` does that part alone.
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env.local).
 * The daily job (/api/cron/ingest, phase 6) runs the same `ingest()`.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { SOURCE_CATALOG } from "@/lib/content/catalog";
import { ingest } from "@/lib/content/ingest";
import { readContentLicensePolicy } from "@/lib/content/policy";
import { createSupabaseContentStore } from "@/lib/content/supabase-store";
import { classifyPendingContents } from "@/lib/content/topics";
import { readContentTopicsConfig } from "@/lib/generation/config";
import { createClaudeTopicClassifier } from "@/lib/generation/content-topics";
import type { Database } from "@/lib/supabase/database.types";

const { values } = parseArgs({
  options: {
    source: { type: "string", multiple: true },
    "no-links": { type: "boolean", default: false },
  },
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (voir .env.example).");
  process.exit(1);
}

const unknown = (values.source ?? []).filter((key) => !SOURCE_CATALOG.some((s) => s.key === key));
if (unknown.length > 0) {
  console.error(`Source(s) inconnue(s) : ${unknown.join(", ")}`);
  process.exit(1);
}

const client = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const policy = readContentLicensePolicy();
const started = Date.now();
const store = createSupabaseContentStore(client);
const report = await ingest(SOURCE_CATALOG, store, {
  policy,
  only: values.source,
  linkChecks: values["no-links"] ? 0 : undefined,
});

console.log(`Politique de licence : ${policy}\n`);
console.table(
  report.sources.map((s) => ({
    source: s.key,
    statut: s.status,
    "items du flux": s.fetched,
    retenus: s.kept,
    nouveaux: s.inserted,
    écartés: Object.entries(s.rejected)
      .map(([reason, count]) => `${reason}:${count}`)
      .join(" "),
    erreur: s.error ?? "",
  })),
);
console.log("Liens vérifiés :", report.links);
const topicsConfig = readContentTopicsConfig();
if (topicsConfig.enabled) {
  const topics = await classifyPendingContents(
    store,
    createClaudeTopicClassifier({ apiKeys: topicsConfig.apiKeys, model: topicsConfig.model }),
  );
  console.log(`Thèmes : ${topics.classified} contenus classés, ${topics.failedBatches} lots en échec.`);
} else {
  console.log("Thèmes : classement désactivé (pas de clé Anthropic, ou CONTENT_TOPICS=off).");
}
const failed = report.sources.filter((s) => s.status === "error").length;
const inserted = report.sources.reduce((total, s) => total + s.inserted, 0);
console.log(`\n${inserted} nouveaux contenus, ${failed} flux en erreur, ${((Date.now() - started) / 1000).toFixed(1)} s.`);
process.exitCode = failed > 0 ? 2 : 0;
