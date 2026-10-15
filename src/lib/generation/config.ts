export const DEFAULT_MISSION_MODEL = "claude-haiku-5-5";

export type GenerationConfig = { provider: "claude"; apiKey: string; model: string } | { provider: "template" };

/**
 * ANTHROPIC_API_KEY, MISSION_GENERATOR ("claude" | "template") and MISSION_MODEL. Without an
 * explicit generator, Claude is used as soon as a key is set. Asking for Claude without a key, or
 * a wrong value, fails loudly rather than silently falling back to the template.
 */
export function readGenerationConfig(
  source: Record<string, string | undefined> = process.env,
): GenerationConfig {
  const apiKey = source.ANTHROPIC_API_KEY?.trim() ?? "";
  const requested = source.MISSION_GENERATOR?.trim() || (apiKey ? "claude" : "template");
  if (requested === "template") return { provider: "template" };
  if (requested !== "claude") {
    throw new Error(`MISSION_GENERATOR invalide : « ${requested} » (valeurs : claude, template).`);
  }
  if (!apiKey) throw new Error("MISSION_GENERATOR=claude demande ANTHROPIC_API_KEY (voir .env.example).");
  return { provider: "claude", apiKey, model: source.MISSION_MODEL?.trim() || DEFAULT_MISSION_MODEL };
}
