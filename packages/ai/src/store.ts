/** Status of a logged call, as `app.ai_call.status` accepts it. */
export type AiCallStatus = "ok" | "error" | "refused";

/** One row of the call log. `inputTokens` excludes the prompt-cache tokens, as the API reports it. */
export interface AiCallRecord {
  purpose: string;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  batch: boolean;
  costUsd: number;
  /** Null for a call made on behalf of no learner (the shared stock). */
  userId: string | null;
  status: AiCallStatus;
}

export interface QuotaRef {
  userId: string;
  kind: string;
  /** Calendar day (UTC), `YYYY-MM-DD`. */
  day: string;
}

/**
 * What the gateway needs from the database. Implemented over Supabase by `@dailylingua/data`
 * (`createAiStore`); the gateway itself never knows how.
 */
export interface AiStore {
  /** Atomically takes one unit of the quota; false (and nothing changed) when `limit` is reached. */
  claimQuota(ref: QuotaRef & { limit: number }): Promise<boolean>;
  /** Gives one unit back (never below zero): the call failed before it was billed. */
  releaseQuota(ref: QuotaRef): Promise<void>;
  /** Appends a row to the call log. */
  recordCall(record: AiCallRecord): Promise<void>;
  /** Total cost in dollars of the calendar month (UTC) containing `at`. */
  monthSpendUsd(at: Date): Promise<number>;
}
