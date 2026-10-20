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

/** Guest missions (all guests together) allowed per rolling 24 hours when GUEST_DAILY_MISSION_CAP is unset. */
export const DEFAULT_GUEST_DAILY_MISSION_CAP = 300;

/**
 * GUEST_DAILY_MISSION_CAP: how many missions all guests together may start per rolling 24 hours,
 * a ceiling on the model money that anonymous accounts can spend. "off" removes the cap; a wrong
 * value fails loudly. Returns null when there is no cap.
 */
export function readGuestDailyMissionCap(source: Record<string, string | undefined> = process.env): number | null {
  const raw = source.GUEST_DAILY_MISSION_CAP?.trim();
  if (!raw) return DEFAULT_GUEST_DAILY_MISSION_CAP;
  if (raw === "off") return null;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`GUEST_DAILY_MISSION_CAP invalide : « ${raw} » (un entier positif ou « off »).`);
  }
  return Number(raw);
}

export type VocabularyTranslationConfig = { enabled: true; apiKey: string; model: string } | { enabled: false };

/**
 * Automatic translation of the words a user imports: on as soon as ANTHROPIC_API_KEY is set, unless
 * VOCABULARY_TRANSLATION=off. VOCABULARY_TRANSLATION_MODEL picks the model (default: the mission model).
 */
export function readVocabularyTranslationConfig(
  source: Record<string, string | undefined> = process.env,
): VocabularyTranslationConfig {
  const apiKey = source.ANTHROPIC_API_KEY?.trim() ?? "";
  const setting = source.VOCABULARY_TRANSLATION?.trim() || "on";
  if (setting !== "on" && setting !== "off") {
    throw new Error(`VOCABULARY_TRANSLATION invalide : « ${setting} » (valeurs : on, off).`);
  }
  if (setting === "off" || !apiKey) return { enabled: false };
  return { enabled: true, apiKey, model: source.VOCABULARY_TRANSLATION_MODEL?.trim() || DEFAULT_MISSION_MODEL };
}
