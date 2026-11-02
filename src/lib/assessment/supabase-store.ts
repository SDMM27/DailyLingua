import type { SupabaseClient } from "@supabase/supabase-js";
import type { CefrLevel } from "@/lib/schemas/common";
import { assessmentResultsSchema, type AssessmentResults } from "@/lib/schemas/assessment";
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
  results: AssessmentResults;
  /** Applied to the user's language when not null. */
  productionLevel: CefrLevel | null;
  model: string;
  promptVersion: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface AssessmentGradingStore {
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

    async completeGrading(input) {
      const { error } = await client.rpc("complete_assessment_grading", {
        p_assessment_id: input.assessmentId,
        p_user_id: input.userId,
        p_results: assessmentResultsSchema.parse(input.results),
        p_production_level: input.productionLevel,
        p_model: input.model,
        p_prompt_version: input.promptVersion,
        p_input_tokens: input.usage.inputTokens,
        p_output_tokens: input.usage.outputTokens,
      });
      if (error?.code === "P0002") throw new AssessmentNotFoundError();
      if (error) throw new Error(`Supabase (enregistrement du bilan) : ${error.message}`);
    },
  };
}
