import "server-only";

import { createAiGateway, createAnthropicClient, type AiGateway } from "@dailylingua/ai";
import { learningDay } from "@dailylingua/core";
import { createAiStore, type AppClient } from "@dailylingua/data";

export function createExpressionAi(client: AppClient): AiGateway | null {
  if (process.env.EXPRESSION_AI !== "on") return null;
  const apiKeys = [process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_API_KEY_FALLBACK]
    .flatMap((key) => key?.trim() ? [key.trim()] : []);
  if (apiKeys.length === 0) return null;
  return createAiGateway({
    client: createAnthropicClient({ apiKeys }),
    store: createAiStore(client),
    monthlyBudgetUsd: 10,
    dayOf: learningDay,
    timeoutMs: 30_000,
  });
}
