import type { SupabaseClient } from "@supabase/supabase-js";
import { languageSchema, type CefrLevel, type Language } from "@/lib/schemas/common";
import { assessmentAnswersSchema, assessmentResultsSchema, type AssessmentAnswers, type AssessmentResults } from "@/lib/schemas/assessment";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** Thrown when the assessment does not exist, is not the user's, or is already graded (SQLSTATE P0002). */
export class AssessmentNotFoundError extends Error {
  constructor() {
    super("Bilan introuvable ou déjà corrigé.");
    this.name = "AssessmentNotFoundError";
  }
}

export interface CompleteGradingInput {
  assessmentId: string;
  userId: string;
  /** The answers that were graded: stored with the result, whatever was saved since. */
  answers: AssessmentAnswers;
  results: AssessmentResults;
  /** Applied to the user's language when not null. */
  productionLevel: CefrLevel | null;
  /** Null when the model was not called (only the declared speaking level was recorded). */
  model: string | null;
  promptVersion: string | null;
  usage: { inputTokens: number; outputTokens: number } | null;
}

/** An assessment as the grading sees it, whatever its status. */
export interface AssessmentToGrade {
  language: Language;
  dossierId: string;
  status: "in_progress" | "graded";
  /** As stored; validated by the service. */
  answers: unknown;
  listeningPlays: number;
  results: AssessmentResults | null;
}

export interface AssessmentGradingStore {
  /** The assessment of `userId`, or null when it does not exist or belongs to someone else. */
  loadForGrading(userId: string, assessmentId: string): Promise<AssessmentToGrade | null>;
  /** Counts one grading attempt; the new count, or null when the assessment or the day has none left. */
  claimGrading(assessmentId: string, userId: string): Promise<number | null>;
  /** Stores the results and the production level in one transaction. */
  completeGrading(input: CompleteGradingInput): Promise<void>;
}

/**
 * Grading store on Supabase. `client` must use the service role key: the claim and complete
 * functions are not callable by signed-in users.
 */
export function createSupabaseAssessmentStore(client: Client): AssessmentGradingStore {
  return {
    async claimGrading(assessmentId, userId) {
      const { data, error } = await client.rpc("claim_assessment_grading", {
        p_assessment_id: assessmentId,
        p_user_id: userId,
      });
      if (error?.code === "P0002") throw new AssessmentNotFoundError();
      if (error) throw new Error(`Supabase (tentative de correction du bilan) : ${error.message}`);
      return data ?? null;
    },

    async loadForGrading(userId, assessmentId) {
      const { data, error } = await client
        .from("assessments")
        .select("language, dossier_id, status, answers, listening_plays, results")
        .eq("id", assessmentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(`Supabase (bilan à corriger) : ${error.message}`);
      if (!data) return null;
      return {
        language: languageSchema.parse(data.language),
        dossierId: data.dossier_id,
        status: data.status === "graded" ? "graded" : "in_progress",
        answers: data.answers,
        listeningPlays: data.listening_plays,
        results: data.results ? assessmentResultsSchema.parse(data.results) : null,
      };
    },

    async completeGrading(input) {
      const { error } = await client.rpc("complete_assessment_grading", {
        p_assessment_id: input.assessmentId,
        p_user_id: input.userId,
        p_answers: assessmentAnswersSchema.parse(input.answers),
        p_results: assessmentResultsSchema.parse(input.results),
        p_production_level: input.productionLevel,
        p_model: input.model,
        p_prompt_version: input.promptVersion,
        p_input_tokens: input.usage?.inputTokens ?? null,
        p_output_tokens: input.usage?.outputTokens ?? null,
      });
      if (error?.code === "P0002") throw new AssessmentNotFoundError();
      if (error) throw new Error(`Supabase (enregistrement du bilan) : ${error.message}`);
    },
  };
}
