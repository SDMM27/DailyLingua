/**
 * Language × level coverage of the catalogue, one matrix per content type (articles, videos, podcasts).
 *
 *   npm run content:coverage
 *   npm run content:coverage -- --type podcast
 *
 * First matrix of each type: how many sources of the catalogue can yield each level (no network).
 * Second one, when NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set: active contents of
 * that type per language and level in the database. Empty cells are shown as « · ».
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { SOURCE_CATALOG } from "@/lib/content/catalog";
import { catalogCoverage, emptyMatrix, renderMatrix } from "@/lib/content/coverage";
import type { Language } from "@/lib/domain/languages";
import type { CefrLevel, ContentType } from "@/lib/schemas/common";
import type { Database } from "@/lib/supabase/database.types";

const TYPES: { type: ContentType; sources: string; contents: string }[] = [
  { type: "article", sources: "Sources d’articles", contents: "Articles actifs" },
  { type: "video", sources: "Chaînes vidéo", contents: "Vidéos actives" },
  { type: "podcast", sources: "Podcasts", contents: "Épisodes actifs" },
];

const { values } = parseArgs({ options: { type: { type: "string" } } });
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
