/**
 * Language × level coverage of the catalogue, one matrix per content type (articles, videos, podcasts).
 *
 *   npm run content:coverage
 *   npm run content:coverage -- --type podcast
 *   npm run content:coverage -- --topics              domain × level, per language, from the database
 *   npm run content:coverage -- --topics --language ru
 *
 * First matrix of each type: how many sources of the catalogue can yield each level (no network).
 * Second one, when NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set: active contents of
 * that type per language and level in the database. Empty cells are shown as « · ».
 *
 * With --topics: only the database part, as one domain × level matrix per language (active contents
 * whose link is not broken, all types together) and the number of contents not classified yet.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { SOURCE_CATALOG } from "@/lib/content/catalog";
import { catalogCoverage, emptyMatrix, renderMatrix, renderTopicMatrix, topicCoverage } from "@/lib/content/coverage";
import { LANGUAGE_CODES, type Language } from "@/lib/domain/languages";
import type { CefrLevel, ContentType } from "@/lib/schemas/common";
import type { Database } from "@/lib/supabase/database.types";

const TYPES: { type: ContentType; sources: string; contents: string }[] = [
  { type: "article", sources: "Sources d’articles", contents: "Articles actifs" },
  { type: "video", sources: "Chaînes vidéo", contents: "Vidéos actives" },
  { type: "podcast", sources: "Podcasts", contents: "Épisodes actifs" },
];

const { values } = parseArgs({
  options: { type: { type: "string" }, topics: { type: "boolean", default: false }, language: { type: "string" } },
});
const selected = TYPES.filter((t) => !values.type || t.type === values.type);
if (selected.length === 0) {
  console.error(`Type inconnu : ${values.type} (attendu : ${TYPES.map((t) => t.type).join(", ")})`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const client =
  url && serviceKey
    ? createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
if (!client) {
  console.log("Base non configurée (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) : matrices des contenus ignorées.\n");
}

if (values.topics) {
  if (!client) {
    console.error("Base non configurée (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
    process.exit(1);
  }
  const languages = values.language ? LANGUAGE_CODES.filter((l) => l === values.language) : LANGUAGE_CODES;
  if (languages.length === 0) {
    console.error(`Langue inconnue : ${values.language}`);
    process.exit(1);
  }
  const rows: { language: Language; difficulty: CefrLevel; topics: string[] | null }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("contents")
      .select("language, difficulty, topics, sources!inner ( active )")
      .eq("sources.active", true)
      .neq("url_status", "broken")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(`\nSupabase (contenus) : ${error.message}`);
      process.exit(1);
    }
    for (const row of data) {
      rows.push({ language: row.language as Language, difficulty: row.difficulty as CefrLevel, topics: row.topics });
    }
    if (data.length < PAGE) break;
  }
  for (const language of languages) {
    const { matrix, unclassified } = topicCoverage(rows, language);
    console.log(`${language} : domaine × niveau (${unclassified} contenus pas encore classés)\n`);
    console.log(renderTopicMatrix(matrix));
    console.log("");
  }
  process.exit(0);
}

for (const { type, sources, contents } of selected) {
  console.log(`${sources} du catalogue (par langue × niveau)\n`);
  console.log(renderMatrix(catalogCoverage(SOURCE_CATALOG, type)));
  if (!client) {
    console.log("");
    continue;
  }

  const matrix = emptyMatrix();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("contents")
      .select("language, difficulty, sources!inner ( active )")
      .eq("content_type", type)
      .eq("sources.active", true)
      .neq("url_status", "broken")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(`\nSupabase (contenus) : ${error.message}`);
      process.exit(1);
    }
    for (const row of data) matrix[row.language as Language][row.difficulty as CefrLevel] += 1;
    if (data.length < PAGE) break;
  }
  console.log(`\n${contents} en base (par langue × niveau)\n`);
  console.log(renderMatrix(matrix));
  console.log("");
}
