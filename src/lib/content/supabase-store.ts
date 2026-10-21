import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedSourceDefinition } from "@/lib/schemas/content";
import type { Database } from "@/lib/supabase/database.types";
import type { ContentStore } from "./ingest";

type Client = SupabaseClient<Database>;
type SourceInsert = Database["public"]["Tables"]["sources"]["Insert"];

/** An inconclusive link check is retried after this delay. */
const RECHECK_AFTER_MS = 24 * 60 * 60 * 1000;

function fail(what: string, error: { message: string }): never {
  throw new Error(`Supabase (${what}) : ${error.message}`);
}

/**
 * Content store on Supabase. `client` must use the service role key: sources and contents are
 * shared tables that signed-in users can only read (RLS, migration 5).
 */
export function createSupabaseContentStore(client: Client): ContentStore {
  return {
    async syncSources(sources, active) {
      const rows: SourceInsert[] = sources.map((s: ParsedSourceDefinition) => ({
        key: s.key,
        name: s.name,
        language: s.language,
        homepage_url: s.homepageUrl,
        feed_url: s.feedUrl,
        content_type: s.contentType,
        license_kind: s.license.kind,
        license_name: s.license.name,
        license_url: s.license.url ?? null,
        terms_url: s.license.termsUrl,
        commercial_use: s.license.commercialUse,
        attribution: s.license.attribution ?? null,
        license_verified_on: s.license.verifiedOn,
        access: s.access,
        active: active(s),
      }));
      // Matched on the homepage so the sources created by hand (demo seed) are adopted, not duplicated.
      const { data, error } = await client
        .from("sources")
        .upsert(rows, { onConflict: "homepage_url_normalized" })
        .select("id, key");
      if (error) fail("sources", error);

      // A source removed from the catalogue stays (its contents are referenced) but is no longer used.
      const keys = sources.map((s) => s.key);
      const { error: retireError } = await client
        .from("sources")
        .update({ active: false })
        .not("key", "is", null)
        .not("key", "in", `(${keys.join(",")})`);
      if (retireError) fail("sources retirées", retireError);

      return new Map(data.filter((row) => row.key !== null).map((row) => [row.key!, row.id]));
    },

    async insertContents(sourceId, drafts) {
      if (drafts.length === 0) return 0;
      const { data, error } = await client
        .from("contents")
        .upsert(
          drafts.map((d) => ({
            source_id: sourceId,
            language: d.language,
            content_type: d.contentType,
            title: d.title,
            url: d.url,
            difficulty: d.difficulty,
            duration_minutes: d.durationMinutes,
            summary: d.summary,
            author: d.author,
            categories: d.categories,
            published_at: d.publishedAt?.toISOString() ?? null,
            audio_url: d.audioUrl,
            transcript_available: false,
          })),
          // Known URLs are left untouched: a content may already be used by a mission.
          { onConflict: "url_normalized", ignoreDuplicates: true },
        )
        .select("id");
      if (error) fail("contenus", error);
      return data.length;
    },

    async recordFetch(sourceId, result) {
      const now = new Date().toISOString();
      const { error } = await client
        .from("sources")
        .update(
          result.ok
            ? { last_fetched_at: now, last_fetch_status: "ok", last_fetch_error: null, last_item_count: result.itemCount }
            : { last_fetch_status: "error", last_fetch_error: result.error },
        )
        .eq("id", sourceId);
      if (error) fail("statut de la source", error);
    },

    async listUncheckedLinks(limit) {
      const retryBefore = new Date(Date.now() - RECHECK_AFTER_MS).toISOString();
      const { data, error } = await client
        .from("contents")
        .select("id, url, sources!inner ( key )")
        .eq("url_status", "unchecked")
        // Only contents of catalogue sources: their hosts are known, so redirects can be judged.
        .not("sources.key", "is", null)
        .or(`url_checked_at.is.null,url_checked_at.lt.${retryBefore}`)
        .order("fetched_at", { ascending: true })
        .limit(limit);
      if (error) fail("liens à vérifier", error);
      return data.map((row) => ({ id: row.id, url: row.url, sourceKey: row.sources?.key ?? null }));
    },

    async setLinkStatus(id, status) {
      const { error } = await client
        .from("contents")
        .update({ url_checked_at: new Date().toISOString(), ...(status ? { url_status: status } : {}) })
        .eq("id", id);
      if (error) fail("statut du lien", error);
    },
  };
}
