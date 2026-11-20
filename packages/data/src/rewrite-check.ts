import { appSchema, type AppClient } from "./client";
import { unwrap } from "./query";

export async function readVerifiedSentences(client: AppClient, userId: string, correctionIds: readonly string[]) {
  const db = appSchema(client);
  if (correctionIds.length === 0) return {};
  const result = await db.rpc("read_verified_sentences", { p_user_id: userId, p_correction_ids: [...correctionIds] });
  const rows = unwrap(result) ?? [];
  const indices: Record<string, number[]> = {};
  for (const { correction_id, sentence_index } of rows) {
    (indices[correction_id] ??= []).push(sentence_index);
  }
  return indices;
}

export function createRewriteCheckStore(client: AppClient) {
  const db = appSchema(client);
  return {
    async claim(userId: string, eventId: string, fingerprint: string) {
      const result = await db.from("rewrite_check_job").insert({
        user_id: userId, client_event_id: eventId, fingerprint,
      });
      if (result.error?.code === "23505") {
        const stored = await db.from("rewrite_check_job").select("fingerprint, started_at, fixed_error_ids")
          .eq("user_id", userId).eq("client_event_id", eventId).single();
        const saved = unwrap(stored);
        if (!saved) throw new Error("Rewrite check reservation was lost");
        return { status: "existing" as const, ...saved };
      }
      unwrap(result);
      return { status: "claimed" as const };
    },
    async finish(userId: string, eventId: string, fixedErrorIds: string[]) {
      unwrap(await db.from("rewrite_check_job").update({ fixed_error_ids: fixedErrorIds })
        .eq("user_id", userId).eq("client_event_id", eventId).is("fixed_error_ids", null));
    },
  };
}

export async function readRewriteResult(client: AppClient, userId: string, productionId: string, eventId: string) {
  const db = appSchema(client);
  const foundCorrection = await db.from("correction").select("id")
    .eq("user_id", userId).eq("production_id", productionId).maybeSingle();
  const correction = unwrap(foundCorrection);
  if (!correction) return null;
  const foundRewrite = await db.from("rewrite").select("accepted")
    .eq("user_id", userId).eq("correction_id", correction.id)
    .eq("client_event_id", eventId).maybeSingle();
  const result = unwrap(foundRewrite);
  return typeof result?.accepted === "boolean" ? { accepted: result.accepted } : null;
}

export type RewriteCheckStore = ReturnType<typeof createRewriteCheckStore>;
