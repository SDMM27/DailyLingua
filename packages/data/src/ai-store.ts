import type { AiStore } from "@dailylingua/ai";
import { appSchema, type AppClient } from "./client";
import { DataError, toDataError, type RawDatabaseError } from "./errors";

/**
 * The `app.*` functions of the AI quota and cost migration (20261114000100_app_ai_quota.sql), typed
 * here because `database.app.types.ts` does not contain them yet. Once it is regenerated, delete this
 * block and let `appSchema(client).rpc` type the calls.
 */
interface AiRpcs {
  claim_quota: {
    Args: { p_user_id: string; p_kind: string; p_limit: number; p_day: string };
    Returns: boolean;
  };
  release_quota: {
    Args: { p_user_id: string; p_kind: string; p_day: string };
    Returns: undefined;
  };
  record_ai_call: {
    Args: {
      p_purpose: string;
      p_model: string;
      p_prompt_version: string;
      p_input_tokens: number;
      p_output_tokens: number;
      p_cache_read_tokens: number;
      p_cache_write_tokens: number;
      p_batch: boolean;
      p_cost_usd: number;
      p_user_id: string | null;
      p_status: string;
    };
    /** Id of the new `app.ai_call` row. */
    Returns: number;
  };
  ai_spend_month: {
    Args: { p_at: string };
    /** Dollars. */
    Returns: number | string;
  };
}

type RpcName = keyof AiRpcs;

/** The service-role client and its `rpc`, widened to the functions above. */
async function rpc<N extends RpcName>(
  client: AppClient,
  name: N,
  args: AiRpcs[N]["Args"],
): Promise<AiRpcs[N]["Returns"] | null> {
  const schema = appSchema(client) as unknown as {
    rpc(name: string, args: object): PromiseLike<{ data: unknown; error: RawDatabaseError | null }>;
  };
  const { data, error } = await schema.rpc(name, args);
  if (error) throw toDataError(error);
  return data as AiRpcs[N]["Returns"] | null;
}

/**
 * `AiStore` of the AI gateway over the `app` functions that only the service role may call. The
 * client must be a **service** client (built by the app, which owns the key): with any other client
 * every call is refused by the database and raises `DataError("unauthenticated")`. This package
 * creates no client and reads no environment variable.
 */
export function createAiStore(client: AppClient): AiStore {
  return {
    async claimQuota({ userId, kind, limit, day }) {
      const claimed = await rpc(client, "claim_quota", { p_user_id: userId, p_kind: kind, p_limit: limit, p_day: day });
      if (typeof claimed !== "boolean") throw new DataError("unknown");
      return claimed;
    },

    async releaseQuota({ userId, kind, day }) {
      await rpc(client, "release_quota", { p_user_id: userId, p_kind: kind, p_day: day });
    },

    async recordCall(record) {
      await rpc(client, "record_ai_call", {
        p_purpose: record.purpose,
        p_model: record.model,
        p_prompt_version: record.promptVersion,
        p_input_tokens: record.inputTokens,
        p_output_tokens: record.outputTokens,
        p_cache_read_tokens: record.cacheReadTokens,
        p_cache_write_tokens: record.cacheWriteTokens,
        p_batch: record.batch,
        p_cost_usd: record.costUsd,
        p_user_id: record.userId,
        p_status: record.status,
      });
    },

    async monthSpendUsd(at) {
      const spend = await rpc(client, "ai_spend_month", { p_at: at.toISOString() });
      // `numeric` may come back as a string; null means no call this month.
      const dollars = Number(spend ?? 0);
      if (!Number.isFinite(dollars)) throw new DataError("unknown");
      return dollars;
    },
  };
}
