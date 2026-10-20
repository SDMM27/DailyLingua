import { describe, expect, it } from "vitest";
import {
  DEFAULT_GUEST_DAILY_MISSION_CAP,
  DEFAULT_MISSION_MODEL,
  readGenerationConfig,
  readGuestDailyMissionCap,
  readVocabularyTranslationConfig,
  readWritingFeedbackConfig,
} from "./config";

describe("readGenerationConfig", () => {
  it("uses the template without a key", () => {
    expect(readGenerationConfig({})).toEqual({ provider: "template" });
    expect(readGenerationConfig({ ANTHROPIC_API_KEY: "   " })).toEqual({ provider: "template" });
  });

  it("uses Claude as soon as a key is set", () => {
    expect(readGenerationConfig({ ANTHROPIC_API_KEY: " sk-test " })).toEqual({
      provider: "claude",
      apiKey: "sk-test",
      model: DEFAULT_MISSION_MODEL,
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
      apiKey: "sk-test",
      model: DEFAULT_MISSION_MODEL,
    });
    expect(
      readWritingFeedbackConfig({ ANTHROPIC_API_KEY: "sk-test", WRITING_FEEDBACK_MODEL: "claude-sonnet-5-5" }),
    ).toMatchObject({ model: "claude-sonnet-5-5" });
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
      apiKey: "sk-test",
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
