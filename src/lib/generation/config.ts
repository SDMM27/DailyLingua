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

export type WritingFeedbackConfig = { enabled: true; apiKey: string; model: string } | { enabled: false };

/**
 * Review of written productions: on as soon as ANTHROPIC_API_KEY is set, unless
 * WRITING_FEEDBACK=off. WRITING_FEEDBACK_MODEL picks the model (default: the mission model).
 */
export function readWritingFeedbackConfig(
  source: Record<string, string | undefined> = process.env,
): WritingFeedbackConfig {
  const apiKey = source.ANTHROPIC_API_KEY?.trim() ?? "";
  const setting = source.WRITING_FEEDBACK?.trim() || "on";
  if (setting !== "on" && setting !== "off") {
    throw new Error(`WRITING_FEEDBACK invalide : « ${setting} » (valeurs : on, off).`);
  }
  if (setting === "off" || !apiKey) return { enabled: false };
  return { enabled: true, apiKey, model: source.WRITING_FEEDBACK_MODEL?.trim() || DEFAULT_MISSION_MODEL };
}
