import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPreferences } from "@/lib/data/supabase-repository";
import type { ContentLicensePolicy } from "@/lib/schemas/content";
import { dateKeySchema, languageSchema } from "@/lib/schemas/common";
import { candidateContentSchema } from "@/lib/schemas/generation";
import type { Database, Json } from "@/lib/supabase/database.types";
import { SessionNotFoundError, SessionReplacementInProgressError, SessionReplacementLimitError } from "./errors";
import type { MissionStore } from "./generate-mission";
import { MAX_SESSION_REPLACEMENTS_PER_DAY, type SessionReplacementStore } from "./replace-session";

type Client = SupabaseClient<Database>;

function fail(what: string, error: { message: string }): never {
  throw new Error(`Supabase (${what}) : ${error.message}`);
}

/**
 * Mission store on Supabase. `client` must use the service role key: the claim / complete / fail
 * functions are not callable by signed-in users, and the mission is written on their behalf.
 */
export function createSupabaseMissionStore(
  client: Client,
  options: { policy: ContentLicensePolicy },
): MissionStore & SessionReplacementStore {
  return {
    getPreferences: (userId) => fetchPreferences(client, userId),

    async listCandidates(language, { contentTypes, declaredSourceIds, limit }) {
      // Every filter but the access one, shared by the two queries below.
      const base = () => {
        let query = client
          .from("contents")
          .select(
            `id, content_type, title, summary, difficulty, duration_minutes, categories, published_at,
             sources!inner ( name, key )`,
          )
          .eq("language", language)
          .neq("url_status", "broken")
          // Same filters as the content list: active feed sources only, licence policy applied.
          .eq("sources.active", true)
          .not("sources.key", "is", null);
        if (options.policy === "commercial") query = query.eq("sources.commercial_use", true);
        if (contentTypes && contentTypes.length > 0) query = query.in("content_type", contentTypes);
        return query.order("published_at", { ascending: false, nullsFirst: false }).limit(limit);
      };
      // Readable = free sources, plus the paid ones the user declared. Two queries rather than an
      // `or` across the embedded table, merged below.
      const queries = [base().eq("sources.access", "free")];
      if (declaredSourceIds.length > 0) queries.push(base().in("source_id", [...declaredSourceIds]));
      const results = await Promise.all(queries);
      const rows = new Map<string, NonNullable<(typeof results)[number]["data"]>[number]>();
      for (const { data, error } of results) {
        if (error) fail("candidats", error);
        for (const row of data ?? []) rows.set(row.id, row);
      }
      // Newest first, undated last: the order of each query, kept across the merge.
      const time = (value: string | null) => (value === null ? Number.NEGATIVE_INFINITY : Date.parse(value));
      const merged = [...rows.values()].sort((x, y) => time(y.published_at) - time(x.published_at)).slice(0, limit);
      return merged.map((row) =>
        candidateContentSchema.parse({
          id: row.id,
          type: row.content_type,
          title: row.title,
          summary: row.summary,
          sourceName: row.sources.name,
          sourceKey: row.sources.key,
          difficulty: row.difficulty,
          durationMinutes: row.duration_minutes,
          categories: row.categories,
          publishedAt: row.published_at,
        }),
      );
    },

    async listDeclaredSourceIds(userId) {
      const { data, error } = await client.from("user_source_access").select("source_id").eq("user_id", userId);
      if (error) fail("sources déclarées", error);
      return data.map((row) => row.source_id);
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

    async listRefusedContentIds(userId) {
      const { data, error } = await client.from("content_refusals").select("content_id").eq("user_id", userId);
      if (error) fail("contenus refusés", error);
      return data.map((row) => row.content_id);
    },

    async getSessionForReplacement(userId, sessionId) {
      const { data, error } = await client
        .from("mission_sessions")
        .select(
          "mission_id, position, language, missions!inner ( mission_date ), mission_activities ( estimated_minutes )",
        )
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) fail("session à remplacer", error);
      if (!data) return null;
      return {
        missionId: data.mission_id,
        missionDate: dateKeySchema.parse(data.missions.mission_date),
        language: languageSchema.parse(data.language),
        position: data.position,
        minutes: data.mission_activities.reduce((sum, a) => sum + a.estimated_minutes, 0),
      };
    },

    async reserveReplacement(sessionId, userId) {
      const { error } = await client.rpc("reserve_session_replacement", {
        p_session_id: sessionId,
        p_user_id: userId,
        p_max_per_day: MAX_SESSION_REPLACEMENTS_PER_DAY,
      });
      if (error?.code === "DL001") throw new SessionReplacementLimitError();
      if (error?.code === "DL002") throw new SessionReplacementInProgressError();
      if (error?.code === "P0002") throw new SessionNotFoundError();
      if (error) fail("réservation du remplacement", error);
    },

    async releaseReplacement(sessionId) {
      const { error } = await client.rpc("release_session_replacement", { p_session_id: sessionId });
      if (error) fail("libération du remplacement", error);
    },

    async replaceSession(sessionId, userId, session, meta) {
      const { error } = await client.rpc("replace_mission_session", {
        p_session_id: sessionId,
        p_user_id: userId,
        p_session: session as unknown as Json,
        p_meta: meta,
      });
      if (error?.code === "P0002") throw new SessionNotFoundError();
      if (error) fail("remplacement de la session", error);
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
