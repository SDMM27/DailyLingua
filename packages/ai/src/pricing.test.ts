import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL } from "./models";
import { MODEL_PRICES, PRICES_CHECKED_ON, costUsd, isPricedModel } from "./pricing";

describe("costUsd", () => {
  it("prices input and output of Haiku 5.5 per million tokens", () => {
    expect(costUsd(DEFAULT_MODEL, { inputTokens: 1_000_000, outputTokens: 0 })).toBe(0.1);
    expect(costUsd(DEFAULT_MODEL, { inputTokens: 0, outputTokens: 1_000_000 })).toBe(0.5);
  });

  it("matches the correction of a production in docs/refonte/g-budget.md (3000 in, 3000 out: about 0.0017 $)", () => {
    expect(costUsd(DEFAULT_MODEL, { inputTokens: 3000, outputTokens: 3000 })).toBe(0.0018);
  });

  it("prices cache reads at a tenth and cache writes at 1.25 times the input price", () => {
    expect(costUsd(DEFAULT_MODEL, { inputTokens: 0, outputTokens: 0, cacheReadTokens: 1_000_000 })).toBe(0.01);
    expect(costUsd(DEFAULT_MODEL, { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 1_000_000 })).toBe(0.125);
  });

  it("adds the four kinds of tokens", () => {
    const usage = { inputTokens: 500, outputTokens: 2000, cacheReadTokens: 3000, cacheWriteTokens: 4000 };
    // (500 * 0.1 + 2000 * 0.5 + 3000 * 0.01 + 4000 * 0.125) / 1e6
    expect(costUsd(DEFAULT_MODEL, usage)).toBe(0.00158);
  });

  it("halves everything in Batch mode", () => {
    const usage = { inputTokens: 3000, outputTokens: 3000 };
    expect(costUsd(DEFAULT_MODEL, usage, { batch: true })).toBe(0.0009);
  });

  it("rounds to the micro-dollar", () => {
    expect(costUsd(DEFAULT_MODEL, { inputTokens: 1, outputTokens: 1 })).toBe(0.000001);
    expect(costUsd(DEFAULT_MODEL, { inputTokens: 0, outputTokens: 0 })).toBe(0);
  });

  it("treats missing cache counts as zero", () => {
    expect(costUsd(DEFAULT_MODEL, { inputTokens: 10, outputTokens: 10 })).toBe(
      costUsd(DEFAULT_MODEL, { inputTokens: 10, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 }),
    );
  });

  it("throws on a model without a price, including inherited object keys", () => {
    expect(() => costUsd("claude-unknown", { inputTokens: 1, outputTokens: 1 })).toThrow(/No price/);
    expect(() => costUsd("toString", { inputTokens: 1, outputTokens: 1 })).toThrow(/No price/);
    expect(isPricedModel("toString")).toBe(false);
  });
});

describe("price table", () => {
  it("is dated", () => {
    expect(PRICES_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("prices the default model", () => {
    expect(MODEL_PRICES[DEFAULT_MODEL]).toEqual({ input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 });
  });
});
