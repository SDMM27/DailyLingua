import { describe, expect, it } from "vitest";
import {
  DEFAULT_GUEST_DAILY_MISSION_CAP,
  DEFAULT_MISSION_MODEL,
  readApiKeys,
  readGenerationConfig,
  readGuestDailyMissionCap,
  readVocabularyTranslationConfig,
  readWritingFeedbackConfig,
} from "./config";

describe("readApiKeys", () => {
  it("puts the primary key first, then the fallback", () => {
    expect(readApiKeys({ ANTHROPIC_API_KEY: " a ", ANTHROPIC_API_KEY_FALLBACK: "b" })).toEqual(["a", "b"]);
  });

  it("accepts a fallback alone", () => {
    expect(readApiKeys({ ANTHROPIC_API_KEY_FALLBACK: "b" })).toEqual(["b"]);
  });

  it("drops blanks and duplicates", () => {
    expect(readApiKeys({ ANTHROPIC_API_KEY: " ", ANTHROPIC_API_KEY_FALLBACK: "" })).toEqual([]);
    expect(readApiKeys({ ANTHROPIC_API_KEY: "a", ANTHROPIC_API_KEY_FALLBACK: " a " })).toEqual(["a"]);
  });
});

describe("readGenerationConfig", () => {
  it("uses the template without a key", () => {
    expect(readGenerationConfig({})).toEqual({ provider: "template" });
    expect(readGenerationConfig({ ANTHROPIC_API_KEY: "   " })).toEqual({ provider: "template" });
  });

  it("uses Claude as soon as a key is set", () => {
    expect(readGenerationConfig({ ANTHROPIC_API_KEY: " sk-test " })).toEqual({
      provider: "claude",
      apiKeys: ["sk-test"],
      model: DEFAULT_MISSION_MODEL,
    });
  });

  it("uses Claude with a fallback key alone, and keeps both keys", () => {
    expect(readGenerationConfig({ ANTHROPIC_API_KEY_FALLBACK: "sk-b" })).toMatchObject({
      provider: "claude",
      apiKeys: ["sk-b"],
    });
    expect(readGenerationConfig({ ANTHROPIC_API_KEY: "sk-a", ANTHROPIC_API_KEY_FALLBACK: "sk-b" })).toMatchObject({
      apiKeys: ["sk-a", "sk-b"],
    });
  });

  it("honours an explicit template even with a key", () => {
    expect(readGenerationConfig({ ANTHROPIC_API_KEY: "sk-test", MISSION_GENERATOR: "template" })).toEqual({
      provider: "template",
    });
  });

  it("refuses claude without a key", () => {
    expect(() => readGenerationConfig({ MISSION_GENERATOR: "claude" })).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("refuses an unknown generator", () => {
    expect(() => readGenerationConfig({ MISSION_GENERATOR: "gpt" })).toThrow(/MISSION_GENERATOR invalide/);
  });

  it("accepts a custom model", () => {
    expect(
      readGenerationConfig({ ANTHROPIC_API_KEY: "sk-test", MISSION_MODEL: "claude-test-1" }),
    ).toMatchObject({ provider: "claude", model: "claude-test-1" });
  });
});

describe("readWritingFeedbackConfig", () => {
  it("is off without a key", () => {
    expect(readWritingFeedbackConfig({})).toEqual({ enabled: false });
  });

  it("is on with a key, with the mission model by default", () => {
    expect(readWritingFeedbackConfig({ ANTHROPIC_API_KEY: "sk-test" })).toEqual({
      enabled: true,
      apiKeys: ["sk-test"],
      model: DEFAULT_MISSION_MODEL,
    });
    expect(
      readWritingFeedbackConfig({ ANTHROPIC_API_KEY: "sk-test", WRITING_FEEDBACK_MODEL: "claude-sonnet-5-5" }),
    ).toMatchObject({ model: "claude-sonnet-5-5" });
  });

  it("is on with a fallback key alone", () => {
    expect(readWritingFeedbackConfig({ ANTHROPIC_API_KEY_FALLBACK: "sk-b" })).toMatchObject({
      enabled: true,
      apiKeys: ["sk-b"],
    });
    expect(readVocabularyTranslationConfig({ ANTHROPIC_API_KEY_FALLBACK: "sk-b" })).toMatchObject({
      enabled: true,
      apiKeys: ["sk-b"],
    });
  });

  it("can be switched off, and refuses an unknown value", () => {
    expect(readWritingFeedbackConfig({ ANTHROPIC_API_KEY: "sk-test", WRITING_FEEDBACK: "off" })).toEqual({
      enabled: false,
    });
    expect(() => readWritingFeedbackConfig({ WRITING_FEEDBACK: "maybe" })).toThrow(/WRITING_FEEDBACK invalide/);
  });
});

describe("readVocabularyTranslationConfig", () => {
  it("is off without a key, on with one (mission model by default)", () => {
    expect(readVocabularyTranslationConfig({})).toEqual({ enabled: false });
    expect(readVocabularyTranslationConfig({ ANTHROPIC_API_KEY: "sk-test" })).toEqual({
      enabled: true,
      apiKeys: ["sk-test"],
      model: DEFAULT_MISSION_MODEL,
    });
    expect(
      readVocabularyTranslationConfig({ ANTHROPIC_API_KEY: "sk-test", VOCABULARY_TRANSLATION_MODEL: "claude-sonnet-5-5" }),
    ).toMatchObject({ model: "claude-sonnet-5-5" });
  });

  it("can be switched off, and refuses an unknown value", () => {
    expect(readVocabularyTranslationConfig({ ANTHROPIC_API_KEY: "sk-test", VOCABULARY_TRANSLATION: "off" })).toEqual({
      enabled: false,
    });
    expect(() => readVocabularyTranslationConfig({ VOCABULARY_TRANSLATION: "maybe" })).toThrow(
      /VOCABULARY_TRANSLATION invalide/,
    );
  });
});

describe("readGuestDailyMissionCap", () => {
  it("has a default cap", () => {
    expect(readGuestDailyMissionCap({})).toBe(DEFAULT_GUEST_DAILY_MISSION_CAP);
    expect(readGuestDailyMissionCap({ GUEST_DAILY_MISSION_CAP: " " })).toBe(DEFAULT_GUEST_DAILY_MISSION_CAP);
  });

  it("reads a number, or off for no cap", () => {
    expect(readGuestDailyMissionCap({ GUEST_DAILY_MISSION_CAP: "50" })).toBe(50);
    expect(readGuestDailyMissionCap({ GUEST_DAILY_MISSION_CAP: "0" })).toBe(0);
    expect(readGuestDailyMissionCap({ GUEST_DAILY_MISSION_CAP: "off" })).toBeNull();
  });

  it("refuses anything else", () => {
    for (const value of ["-1", "1.5", "lots"]) {
      expect(() => readGuestDailyMissionCap({ GUEST_DAILY_MISSION_CAP: value })).toThrow(/GUEST_DAILY_MISSION_CAP/);
    }
  });
});
