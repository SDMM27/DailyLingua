import "server-only";

import { createAiGateway, createAnthropicClient } from "@dailylingua/ai";
import { isTargetLanguage, learningDay } from "@dailylingua/core";
import { createAiStore, createGradedTextStore, type AppClient } from "@dailylingua/data";
import { frequencyRanks, LEVELS, THEMES, type TextLevel } from "./checks";
import { generateGradedText } from "./generate";

const MONTHLY_BUDGET_USD = 10;

function providerKeys() {
  return [process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_API_KEY_FALLBACK].flatMap((key) => key?.trim() ? [key.trim()] : []);
}

export function gradedTextGenerationEnabled() {
  return process.env.GRADED_TEXT_GENERATION === "on" && providerKeys().length > 0;
}

export async function prepareGradedText({ language, level, day, stockAvailable }: {
  language: string;
  level: string;
  day: string;
  stockAvailable(): Promise<boolean>;
}, service: () => AppClient) {
  if (!gradedTextGenerationEnabled() || !isTargetLanguage(language) || !Object.hasOwn(LEVELS, level)) return "unavailable";
  const ranks = await frequencyRanks(language);
  if (!ranks) return "unavailable";
  const dayNumber = Date.parse(day) / 86_400_000;
  const theme = THEMES[((dayNumber % THEMES.length) + THEMES.length) % THEMES.length]!;
  const client = service();
  const ai = createAiGateway({
    client: createAnthropicClient({ apiKeys: providerKeys() }),
    store: createAiStore(client),
    monthlyBudgetUsd: MONTHLY_BUDGET_USD,
    dayOf: learningDay,
    timeoutMs: 12_000,
  });
  return generateGradedText({ language, level: level as TextLevel, theme }, {
    store: createGradedTextStore(client), ai, ranks, stockAvailable,
  });
}
