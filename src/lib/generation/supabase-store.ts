import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPreferences } from "@/lib/data/supabase-repository";
import type { ContentLicensePolicy } from "@/lib/schemas/content";
import { candidateContentSchema } from "@/lib/schemas/generation";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { MissionStore } from "./generate-mission";

type Client = SupabaseClient<Database>;

function fail(what: string, error: { message: string }): never {
  throw new Error(`Supabase (${what}) : ${error.message}`);
}

/**
 * Mission store on Supabase. `client` must use the service role key: the claim / complete / fail
 * functions are not callable by signed-in users, and the mission is written on their behalf.
 */
export function createSupabaseMissionStore(client: Client, options: { policy: ContentLicensePolicy }): MissionStore {
  return {
    getPreferences: (userId) => fetchPreferences(client, userId),

    async listCandidates(language, { contentTypes, access, limit }) {
      let query = client
        .from("contents")
        .select(
          `id, content_type, title, summary, difficulty, duration_minutes, categories, published_at,
           sources!inner ( name )`,
        )
        .eq("language", language)
        .neq("url_status", "broken")
        // Same filters as the content list: active feed sources only, licence policy applied.
        .eq("sources.active", true)
        .in("sources.access", [...access])
        .not("sources.key", "is", null);
      if (options.policy === "commercial") query = query.eq("sources.commercial_use", true);
      if (contentTypes && contentTypes.length > 0) query = query.in("content_type", contentTypes);
      const { data, error } = await query
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) fail("candidats", error);
      return data.map((row) =>
        candidateContentSchema.parse({
          id: row.id,
          type: row.content_type,
          title: row.title,
          summary: row.summary,
          sourceName: row.sources.name,
          difficulty: row.difficulty,
          durationMinutes: row.duration_minutes,
          categories: row.categories,
          publishedAt: row.published_at,
        }),
      );
    },

    async listUsedContentIds(userId, since) {
      const { data, error } = await client
        .from("mission_sessions")
        .select("content_id, missions!inner ( mission_date )")
        .eq("user_id", userId)
        .gte("missions.mission_date", since);
      if (error) fail("contenus déjà utilisés", error);
      return [...new Set(data.map((row) => row.content_id))];
    },

    async claim(userId, date, budgetMinutes) {
      const { data, error } = await client.rpc("claim_mission_generation", {
        p_user_id: userId,
        p_mission_date: date,
        p_budget_minutes: budgetMinutes,
      });
      if (error) fail("réservation de la mission", error);
      const row = data[0];
      if (!row) fail("réservation de la mission", { message: "aucune ligne retournée" });
      if (row.status !== "generating" && row.status !== "ready" && row.status !== "failed") {
        fail("réservation de la mission", { message: `statut inattendu « ${row.status} »` });
      }
      return { missionId: row.mission_id, status: row.status, claimed: row.claimed };
    },

    async complete(missionId, sessions, meta) {
      const { error } = await client.rpc("complete_mission_generation", {
        p_mission_id: missionId,
        p_sessions: sessions as unknown as Json, // plain data (zod-validated), only lacks an index signature
        p_meta: meta,
      });
      if (error) fail("écriture de la mission", error);
    },

    async fail(missionId, message) {
      const { error } = await client.rpc("fail_mission_generation", { p_mission_id: missionId, p_error: message });
      if (error) fail("échec de la mission", error);
    },
  };
}
