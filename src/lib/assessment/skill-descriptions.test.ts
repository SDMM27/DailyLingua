import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES, languageInfo } from "@/lib/domain/languages";
import { CEFR_LEVELS } from "@/lib/schemas/common";
import { ASSESSMENT_SKILLS, SKILL_DESCRIPTIONS, SKILL_NAMES } from "./skill-descriptions";

describe("skill descriptions", () => {
  it("has one sentence per skill and level, addressed to the learner", () => {
    expect(ASSESSMENT_SKILLS).toHaveLength(4);
    for (const skill of ASSESSMENT_SKILLS) {
      expect(SKILL_NAMES[skill]).not.toBe("");
      for (const level of CEFR_LEVELS) {
        const sentence = SKILL_DESCRIPTIONS[skill][level];
        expect(sentence, `${skill} ${level}`).toMatch(/^Tu /);
        expect(sentence).toMatch(/\.$/);
        expect(sentence).not.toContain("'");
      }
    }
  });

  it("never names a language: the same sentences serve every language", () => {
    const names = LANGUAGE_CODES.flatMap((code) => [languageInfo(code).nameFr, languageInfo(code).nativeName]);
    const all = ASSESSMENT_SKILLS.flatMap((skill) => CEFR_LEVELS.map((level) => SKILL_DESCRIPTIONS[skill][level]));
    for (const sentence of all) {
      for (const name of names) expect(sentence.toLowerCase()).not.toContain(name.toLowerCase());
    }
  });
});
