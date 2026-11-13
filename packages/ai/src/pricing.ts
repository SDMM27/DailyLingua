import { DEFAULT_MODEL } from "./models";

/** US dollars per million tokens. */
export interface ModelPrice {
  input: number;
  output: number;
  /** Reading a prompt-cache entry. */
  cacheRead: number;
  /** Writing a prompt-cache entry (5-minute TTL, the only one this package asks for). */
  cacheWrite: number;
}

/**
 * Day these prices were read, and where. Re-check before each milestone that depends on them: a
 * provider changes its prices without notice.
 *
 * Source: the Claude API reference loaded in the session of 2026-11-13 (model table cached on
 * 2026-11-03, and its prompt-caching economics: cache reads at 0.1x the input price, 0.05x on
 * Sonnet 5.5 and Opus 5.5; 5-minute cache writes at 1.25x), which agrees with the base prices of
 * docs/plans/roadmap-plateforme.md §6.1 (checked 2026-11-05). Not read from the live price page.
 */
export const PRICES_CHECKED_ON = "2026-11-13";

/**
 * Haiku 5.5 is priced up to 100K prompt tokens ($0.50 / $2.50 beyond): no prompt of this app comes
 * near that, so the higher tier is not modelled.
 */
export const MODEL_PRICES: Readonly<Record<string, ModelPrice>> = {
  [DEFAULT_MODEL]: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

/** The Batch API charges this share of every price. */
export const BATCH_PRICE_FACTOR = 0.5;

/** Tokens reported by the API for one request (`usage`): `inputTokens` excludes the cache tokens. */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export function isPricedModel(model: string): boolean {
  return Object.hasOwn(MODEL_PRICES, model);
}

/**
 * Cost in dollars of one request, rounded to the micro-dollar (the precision of `ai_call.cost_usd`).
 * Throws on a model that has no price, rather than recording a wrong zero.
 */
export function costUsd(model: string, usage: TokenUsage, options: { batch?: boolean } = {}): number {
  const price = isPricedModel(model) ? MODEL_PRICES[model] : undefined;
  if (!price) throw new Error(`No price for model "${model}"`);
  const dollars =
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      (usage.cacheReadTokens ?? 0) * price.cacheRead +
      (usage.cacheWriteTokens ?? 0) * price.cacheWrite) /
    1_000_000;
  return Math.round(dollars * (options.batch ? BATCH_PRICE_FACTOR : 1) * 1_000_000) / 1_000_000;
}
