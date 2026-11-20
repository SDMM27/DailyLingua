import { AiError, REWRITE_CHECK_PROMPT_VERSION, REWRITE_CHECK_SYSTEM, rewriteCheckOutputSchema, type AiGateway } from "@dailylingua/ai";
import { characterSimilarity, fingerprint, REWRITE_MIN_SIMILARITY, type IngestState } from "@dailylingua/core";
import type { RewriteCheckStore } from "@dailylingua/data";
import type { IngestBatchPayload } from "@dailylingua/schemas";

export type CheckRewrites = (input: {
  state: IngestState;
  rows: IngestBatchPayload["rewrites"];
  now: Date;
}) => Promise<IngestState["rewriteChecks"]>;

const MAX_CHECK_AGE_MS = 90_000;

export function createRewriteChecks(store: RewriteCheckStore, ai: AiGateway): CheckRewrites {
  return async ({ state, rows, now }) => {
    const checks: IngestState["rewriteChecks"] = {};
    // At most the configured quota can reach the provider, even if the batch contains more rewrites.
    const outcomes = await Promise.allSettled(rows.map(async (row) => {
      const correction = state.corrections[row.correction_id];
      const sentence = correction?.sentences[row.sentence_index];
      if (row.accepted || state.verifiedSentences?.[row.correction_id]?.includes(row.sentence_index)
        || !sentence?.errors.length || !correction || !state.productions[correction.productionId]?.feedbackEligible
        || characterSimilarity(correction.language, sentence.text, row.text) < REWRITE_MIN_SIMILARITY) return;

      const eventKey = fingerprint([row.correction_id, row.sentence_index, row.text]);
      const job = await store.claim(state.userId, row.client_event_id, eventKey);
      if (job.status === "existing") {
        if (job.fingerprint !== eventKey) return;
        if (job.fixed_error_ids === null && now.getTime() - Date.parse(job.started_at) < MAX_CHECK_AGE_MS) {
          throw new Error("A rewrite check is already running");
        }
        checks[row.client_event_id] = { fixedErrorIds: job.fixed_error_ids ?? [] };
        return;
      }

      const errors = sentence.errors.map(({ id, original, corrected }) => ({ id, original, corrected }));
      let fixedErrorIds: string[] = [];
      try {
        const { output } = await ai.call({
          purpose: "rewrite_check",
          promptVersion: REWRITE_CHECK_PROMPT_VERSION,
          system: REWRITE_CHECK_SYSTEM,
          schema: rewriteCheckOutputSchema,
          learner: { id: state.userId, timeZone: state.profile.timeZone },
          effort: "low",
          retryProvider: false,
          messages: [{ role: "user", content: JSON.stringify({
            language: correction.language, sentence: sentence.text, rewrite: row.text, errors,
          }) }],
        });
        const allowed = new Set(errors.map(({ id }) => id));
        fixedErrorIds = [...new Set(output.fixedErrorIds.filter((id) => allowed.has(id)))];
      } catch (error) {
        if (!(error instanceof AiError)) {
          await store.finish(state.userId, row.client_event_id, []);
          throw error;
        }
        // Quota or provider failures cannot grant verification, and a retry must not repeat an ambiguous paid call.
      }
      await store.finish(state.userId, row.client_event_id, fixedErrorIds);
      checks[row.client_event_id] = { fixedErrorIds };
    }));
    const failure = outcomes.find((outcome) => outcome.status === "rejected");
    if (failure) throw failure.reason;
    return checks;
  };
}
