import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { AiError } from "./errors";
import { DEFAULT_MODEL } from "./models";
import { jsonSchemaFormat, type JsonSchemaFormat } from "./output-format";
import { costUsd, isPricedModel, type TokenUsage } from "./pricing";
import { AI_PURPOSES, type AiPurpose, type PurposeSpec } from "./purposes";
import type { AiCallRecord, AiCallStatus, AiStore, QuotaRef } from "./store";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** A block of instructions; `cache_control` marks the end of a prefix the API may reuse. */
export interface AiSystemBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

/** The request this package sends: `messages.create` of the SDK, reduced to the fields it uses. */
export interface AiRequest {
  model: string;
  max_tokens: number;
  system: string | AiSystemBlock[];
  messages: AiMessage[];
  output_config: { format: JsonSchemaFormat; effort: Effort };
}

/** The part of the response this package reads. */
export interface AiResponse {
  content: { type: string; text?: string }[];
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  };
}

/** The part of the SDK client used here, so tests can inject a fake (and `Anthropic` fits it). */
export interface AiClient {
  messages: {
    create(params: AiRequest, options?: { timeout?: number; maxRetries?: number }): Promise<AiResponse>;
  };
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiCallInput<T> {
  purpose: AiPurpose;
  /** Version of the prompt, logged with the call so a cost or quality change can be traced to it. */
  promptVersion: string;
  /** Instructions only. Never put a learner's text in here: it goes in `messages`. */
  system: string;
  /** Everything that comes from a user (text to correct, answers, history), as separate messages. */
  messages: AiMessage[];
  /** The answer is parsed and validated with this schema before it is handed back. */
  schema: ZodType<T>;
  /** The learner the call is made for; null for shared generation (no quota applies). */
  userId: string | null;
  /** Default "medium", the default of Haiku 5.5, set explicitly so a change of default cannot move the bill. */
  effort?: Effort;
}

export interface AiCallResult<T> {
  output: T;
  model: string;
  promptVersion: string;
  usage: Required<TokenUsage>;
  costUsd: number;
  /** The month's spend reached 80 % of the budget (the circuit breaker opens at 100 %). */
  budgetWarning: boolean;
}

export interface AiGateway {
  call<T>(input: AiCallInput<T>): Promise<AiCallResult<T>>;
}

export interface AiGatewayOptions {
  client: AiClient;
  store: AiStore;
  /** Monthly budget in dollars (10 euros in the design). */
  monthlyBudgetUsd: number;
  /** Default `DEFAULT_MODEL`. Must have a price in `MODEL_PRICES`. */
  model?: string;
  now?: () => Date;
  /** Per attempt. Default 30 s: the learner is waiting on the screen. */
  timeoutMs?: number;
  /** Pause before the single retry. Default 500 ms. */
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Called when the store fails while releasing a quota or logging a call (the call itself goes on). */
  onStoreError?: (error: unknown, operation: "releaseQuota" | "recordCall") => void;
}

/** Share of the monthly budget from which `budgetWarning` is raised. */
export const BUDGET_WARNING_RATIO = 0.8;

/**
 * Instructions at least this long are marked for the prompt cache. Haiku 5.5 caches prefixes of 512
 * tokens or more (shorter ones are silently not cached, at no extra cost); the 2000 characters here
 * are about that, with the Haiku 5.5 tokenizer, in the languages of the app.
 */
export const CACHE_MIN_SYSTEM_CHARS = 2000;

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_DELAY_MS = 500;

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

function isTimeout(error: unknown): boolean {
  return error instanceof Anthropic.APIConnectionTimeoutError;
}

/** Worth one more try: a timeout, a dropped connection, an overloaded or rate-limited server. */
function isRetryable(error: unknown): boolean {
  if (isTimeout(error) || error instanceof Anthropic.APIConnectionError) return true;
  const status = statusOf(error);
  return status !== undefined && (status === 408 || status === 409 || status === 429 || status >= 500);
}

function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  return new AiError(isTimeout(error) ? "timeout" : "provider_error", { cause: error });
}

function textOf(response: AiResponse): string {
  return response.content.map((block) => (block.type === "text" ? (block.text ?? "") : "")).join("");
}

function usageOf(response: AiResponse): Required<TokenUsage> {
  return {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
  };
}

const NO_USAGE: Required<TokenUsage> = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

/**
 * The single place that calls the model. For one call, in order:
 *
 * 1. circuit breaker: with the month's spend at or over the budget, a non-essential purpose is
 *    refused (`budget_exhausted`) before anything is spent; from 80 % the result carries `budgetWarning`;
 * 2. quota: one unit is claimed before the call (`quota_exceeded` when the day's limit is reached)
 *    and given back if the call fails before it is billed (provider error or timeout);
 * 3. call: Haiku 5.5 by default, long instructions marked for the prompt cache, a timeout and a single retry;
 * 4. validation: the answer must parse and satisfy the Zod schema (`invalid_output` otherwise; such a
 *    call was billed, so it keeps its quota unit);
 * 5. log: `recordCall` runs for every call that reached the provider, success or failure, with the
 *    tokens the API reported and the cost computed from them.
 *
 * Errors carry stable codes (`AiError`); a provider's message never leaves this module.
 */
export function createAiGateway(options: AiGatewayOptions): AiGateway {
  const { client, store, monthlyBudgetUsd } = options;
  const model = options.model ?? DEFAULT_MODEL;
  if (!isPricedModel(model)) throw new Error(`No price for model "${model}": add it to MODEL_PRICES first.`);
  const now = options.now ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  async function send(request: AiRequest): Promise<AiResponse> {
    for (let attempt = 0; ; attempt++) {
      try {
        // The SDK's own retries are off: the single retry is this loop's, so it is counted once.
        return await client.messages.create(request, { timeout: timeoutMs, maxRetries: 0 });
      } catch (error) {
        if (attempt >= 1 || !isRetryable(error)) throw error;
        await sleep(retryDelayMs);
      }
    }
  }

  /** The log and the quota release must not turn a finished call into a failure. */
  async function bestEffort(operation: "releaseQuota" | "recordCall", run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (error) {
      options.onStoreError?.(error, operation);
    }
  }

  async function call<T>(input: AiCallInput<T>): Promise<AiCallResult<T>> {
    const spec: PurposeSpec = AI_PURPOSES[input.purpose];
    const at = now();

    const spend = await store.monthSpendUsd(at);
    if (spend >= monthlyBudgetUsd && !spec.essential) throw new AiError("budget_exhausted");
    const budgetWarning = spend >= monthlyBudgetUsd * BUDGET_WARNING_RATIO;

    let quota: QuotaRef | null = null;
    if (input.userId !== null && spec.quotaKind !== null && spec.dailyLimit !== null) {
      quota = { userId: input.userId, kind: spec.quotaKind, day: at.toISOString().slice(0, 10) };
      if (!(await store.claimQuota({ ...quota, limit: spec.dailyLimit }))) throw new AiError("quota_exceeded");
    }

    const record = (status: AiCallStatus, usage: Required<TokenUsage>) =>
      bestEffort("recordCall", () => {
        const entry: AiCallRecord = {
          purpose: input.purpose,
          model,
          promptVersion: input.promptVersion,
          ...usage,
          batch: false,
          costUsd: costUsd(model, usage),
          userId: input.userId,
          status,
        };
        return store.recordCall(entry);
      });

    const request: AiRequest = {
      model,
      max_tokens: spec.maxOutputTokens,
      system:
        input.system.length >= CACHE_MIN_SYSTEM_CHARS
          ? [{ type: "text", text: input.system, cache_control: { type: "ephemeral" } }]
          : input.system,
      messages: input.messages,
      output_config: { format: jsonSchemaFormat(input.schema), effort: input.effort ?? "medium" },
    };

    let response: AiResponse;
    try {
      response = await send(request);
    } catch (error) {
      if (quota) {
        const toRelease = quota;
        await bestEffort("releaseQuota", () => store.releaseQuota(toRelease));
      }
      await record("error", NO_USAGE);
      throw toAiError(error);
    }

    const usage = usageOf(response);
    const cost = costUsd(model, usage);

    if (response.stop_reason === "refusal") {
      await record("refused", usage);
      throw new AiError("invalid_output");
    }
    // A truncated answer (max_tokens) is not valid JSON, or not the whole object: it fails below.
    let parsed: unknown;
    try {
      parsed = response.stop_reason === "max_tokens" ? undefined : JSON.parse(textOf(response));
    } catch {
      parsed = undefined;
    }
    const checked = parsed === undefined ? null : input.schema.safeParse(parsed);
    if (!checked?.success) {
      await record("error", usage);
      throw new AiError("invalid_output");
    }

    await record("ok", usage);
    return { output: checked.data, model, promptVersion: input.promptVersion, usage, costUsd: cost, budgetWarning };
  }

  return { call };
}
