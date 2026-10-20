/**
 * Language × level coverage of the video sources.
 *
 *   npm run content:coverage
 *
 * First matrix: how many video channels of the catalogue can yield each level (no network).
 * Second matrix, when NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set: active video
 * contents per language and level in the database. Empty cells are shown as « · ».
 */
import { createClient } from "@supabase/supabase-js";
import { SOURCE_CATALOG } from "@/lib/content/catalog";
import { catalogVideoCoverage, emptyMatrix, renderMatrix } from "@/lib/content/coverage";
import type { Language } from "@/lib/domain/languages";
import type { CefrLevel } from "@/lib/schemas/common";
import type { Database } from "@/lib/supabase/database.types";

console.log("Chaînes vidéo du catalogue (par langue × niveau)\n");
console.log(renderMatrix(catalogVideoCoverage(SOURCE_CATALOG)));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.log("\nBase non configurée (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) : matrice des contenus ignorée.");
} else {
  const client = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const matrix = emptyMatrix();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("contents")
      .select("language, difficulty, sources!inner ( active )")
      .eq("content_type", "video")
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
  console.log("\nVidéos actives en base (par langue × niveau)\n");
  console.log(renderMatrix(matrix));
}
