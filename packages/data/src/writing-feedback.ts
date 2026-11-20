import {
  storedSessionPlanSchema, storedWritingFeedbackSchema, type StoredWritingFeedback,
} from "@dailylingua/schemas";
import { z } from "zod";
import { appSchema, type AppClient } from "./client";
import type { Json } from "./database.app.types";
import { inChunks, unwrap } from "./query";

const claimSchema = z.enum(["claimed", "ready", "pending", "failed", "not_found"]);

const CORRECTION_COLUMNS = "id, production_id, explanation_language, feedback, created_at";

export interface CorrectionRow {
  id: string;
  productionId: string;
  explanationLanguage: string;
  createdAt: string;
  stored: StoredWritingFeedback;
}

function parseCorrection(row: {
  id: string; production_id: string; explanation_language: string; feedback: unknown; created_at: string;
}): CorrectionRow | null {
  const parsed = storedWritingFeedbackSchema.safeParse(row.feedback);
  // A historical legacy correction has the previous feedback shape and is preserved as is.
  return parsed.success
    ? { id: row.id, productionId: row.production_id, explanationLanguage: row.explanation_language, stored: parsed.data, createdAt: row.created_at }
    : null;
}

/** Returns only this learner's corrections, even when an event refers to another user's id. */
export async function readCorrections(
  client: AppClient,
  userId: string,
  refs: { correctionIds?: readonly string[]; productionIds?: readonly string[] },
): Promise<CorrectionRow[]> {
  const db = appSchema(client);
  const [byId, byProduction] = await Promise.all([
    inChunks(refs.correctionIds ?? [], (chunk) => db.from("correction").select(CORRECTION_COLUMNS).eq("user_id", userId).in("id", chunk)),
    inChunks(refs.productionIds ?? [], (chunk) => db.from("correction").select(CORRECTION_COLUMNS).eq("user_id", userId).in("production_id", chunk)),
  ]);
  return [...new Map([...byId, ...byProduction].map((row) => [row.id, row])).values()]
    .flatMap((row) => parseCorrection(row) ?? []);
}

export function createWritingFeedbackStore(client: AppClient) {
  const db = appSchema(client);
  return {
    async readContext(userId: string, productionId: string) {
      const productionResult = await db.from("production").select("id, session_id, language, text, mode, client_event_id")
        .eq("id", productionId).eq("user_id", userId).maybeSingle();
      const production = unwrap(productionResult);
      if (!production?.session_id || production.mode !== "writing" || !production.client_event_id) return null;
      const [profileResult, sessionResult, enrollmentResult, skillsResult] = await Promise.all([
        db.from("profile").select("native_language, time_zone").eq("user_id", userId).maybeSingle(),
        db.from("session").select("plan, format").eq("id", production.session_id).eq("user_id", userId).maybeSingle(),
        db.from("enrollment").select("purpose, target_level").eq("language", production.language).eq("user_id", userId).maybeSingle(),
        db.from("skill_estimate").select("skill, level_value").eq("user_id", userId).eq("language", production.language),
      ]);
      const profile = unwrap(profileResult);
      const session = unwrap(sessionResult);
      const enrollment = unwrap(enrollmentResult);
      const skillEstimates = unwrap(skillsResult) ?? [];
      if (!profile || !session) return null;
      const plan = storedSessionPlanSchema.safeParse(session.plan);
      const textId = plan.success ? plan.data.reading.textId : null;
      const textResult = textId
        ? await db.from("text").select("writing_task").eq("id", textId).eq("language", production.language).maybeSingle()
        : null;
      const text = textResult && unwrap(textResult);
      return {
        productionId,
        sessionId: production.session_id,
        format: session.format,
        language: production.language,
        text: production.text,
        task: text?.writing_task ?? null,
        nativeLanguage: profile.native_language,
        timeZone: profile.time_zone,
        targetLevel: enrollment?.target_level ?? null,
        purpose: enrollment?.purpose ?? null,
        skillEstimates: skillEstimates.map((row) => ({ language: production.language, skill: row.skill, levelValue: Number(row.level_value) })),
      };
    },

    async readCorrection(userId: string, productionId: string) {
      const result = await db.from("correction").select(CORRECTION_COLUMNS)
        .eq("production_id", productionId).eq("user_id", userId).maybeSingle();
      const row = unwrap(result);
      return row && parseCorrection(row);
    },

    async claim(userId: string, productionId: string) {
      return claimSchema.parse(unwrap(await db.rpc("claim_writing_feedback_job", {
        p_user_id: userId, p_production_id: productionId,
      })));
    },

    async release(userId: string, productionId: string) {
      unwrap(await db.from("writing_feedback_job").delete().eq("production_id", productionId).eq("user_id", userId));
    },

    async fail(userId: string, productionId: string) {
      unwrap(await db.from("writing_feedback_job").update({ failed: true }).eq("production_id", productionId).eq("user_id", userId));
    },

    async save(input: {
      userId: string; productionId: string; explanationLanguage: string; stored: StoredWritingFeedback;
      model: string; promptVersion: string; usage: { inputTokens: number; outputTokens: number };
    }): Promise<CorrectionRow> {
      const result = await db.from("correction").upsert({
        user_id: input.userId,
        production_id: input.productionId,
        explanation_language: input.explanationLanguage,
        feedback: input.stored satisfies Json,
        model: input.model,
        prompt_version: input.promptVersion,
        input_tokens: input.usage.inputTokens,
        output_tokens: input.usage.outputTokens,
      }, { onConflict: "production_id", ignoreDuplicates: true }).select(CORRECTION_COLUMNS).maybeSingle();
      const row = unwrap(result);
      const correction = row ? parseCorrection(row) : await this.readCorrection(input.userId, input.productionId);
      if (!correction) throw new Error("Invalid saved correction");
      return correction;
    },
  };
}

export type WritingFeedbackStore = ReturnType<typeof createWritingFeedbackStore>;
