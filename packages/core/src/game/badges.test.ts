import { describe, expect, it } from "vitest";
import { awardBadges, nextSteps, type BadgeFacts, type LanguageBadgeFacts } from "./badges";

const lang = (over: Partial<LanguageBadgeFacts> = {}): LanguageBadgeFacts => ({
  language: "it", knownWords: 0, skillLevels: {}, textsRead: 0, textsReadWell: 0, dictationsHigh: 0, rewrites: 0, shadowings: 0, roleplays: 0, ...over,
});
const facts = (over: Partial<LanguageBadgeFacts> = {}, practiceHours = 0, extra: LanguageBadgeFacts[] = []): BadgeFacts => ({ languages: [lang(over), ...extra], practiceHours });
const ids = (awards: { badgeId: string; language: string | null }[]) => awards.map((a) => `${a.badgeId}@${a.language ?? "-"}`).sort();

describe("awardBadges", () => {
  it("awards nothing without facts", () => {
    expect(awardBadges(facts(), [])).toEqual([]);
  });

  it("awards every threshold reached, and only those", () => {
    expect(ids(awardBadges(facts({ knownWords: 260 }), []))).toEqual(["words_100@it", "words_250@it"]);
    expect(ids(awardBadges(facts({ textsRead: 10, textsReadWell: 1 }), []))).toEqual(["reading_10@it", "reading_first_well@it"]);
    expect(ids(awardBadges(facts({ rewrites: 50, shadowings: 99, roleplays: 1, dictationsHigh: 1 }), []))).toEqual(["dictation_first_high@it", "rewrite_50@it", "roleplay_first@it"]);
  });

  it("awards skill levels from the start of the band, per skill", () => {
    expect(ids(awardBadges(facts({ skillLevels: { reading: 2.0, speaking: 0.9 } }), []))).toEqual(["level_reading_a1@it", "level_reading_a2@it"]);
  });

  it("keeps the practice badge outside any language", () => {
    expect(ids(awardBadges(facts({}, 50), []))).toEqual(["practice_10h@-", "practice_50h@-"]);
  });

  it("is scoped by language", () => {
    const both = facts({ knownWords: 100 }, 0, [lang({ language: "ru", knownWords: 90 })]);
    expect(ids(awardBadges(both, []))).toEqual(["words_100@it"]);
    expect(ids(awardBadges(both, [{ badgeId: "words_100", language: "ru" }]))).toEqual(["words_100@it"]);
  });

  it("is idempotent and final: held badges are not returned and a fact that drops removes nothing", () => {
    const held = awardBadges(facts({ knownWords: 100 }), []).map(({ badgeId, language }) => ({ badgeId, language }));
    expect(awardBadges(facts({ knownWords: 100 }), held)).toEqual([]);
    expect(awardBadges(facts({ knownWords: 40 }), held)).toEqual([]);
  });
});

describe("nextSteps", () => {
  it("gives the next milestone of each family", () => {
    const steps = nextSteps(lang({ knownWords: 182, textsRead: 12, rewrites: 3, shadowings: 100 }), 12);
    expect(steps.map((s) => [s.family, s.target, s.current])).toEqual([["words", 250, 182], ["reading", 50, 12], ["rewrite", 50, 3], ["practice", 50, 12]]);
  });
  it("leaves out a complete family", () => {
    expect(nextSteps(lang({ textsRead: 200 }), 500).map((s) => s.family)).toEqual(["words", "rewrite", "shadowing"]);
  });
});
