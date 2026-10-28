import { describe, expect, it } from "vitest";
import { MOCK_PREFERENCES } from "@/lib/data/mock/preferences";
import { LANGUAGE_PURPOSES, languageGoalSchema, preferencesSchema } from "./preferences";

const goal = { language: "it", level: "B1", targetLevel: "B2", focus: "", weight: 10, topics: ["société"], contentTypes: ["article"] };

describe("minutes per language", () => {
  it("accepts 10 to 120 minutes", () => {
    expect(languageGoalSchema.safeParse({ ...goal, weight: 10 }).success).toBe(true);
    expect(languageGoalSchema.safeParse({ ...goal, weight: 120 }).success).toBe(true);
  });

  it("refuses 9 minutes and 125 minutes", () => {
    const low = languageGoalSchema.safeParse({ ...goal, weight: 9 });
    expect(low.error?.issues[0].message).toBe("Au moins 10 minutes par langue");
    expect(languageGoalSchema.safeParse({ ...goal, weight: 125 }).success).toBe(false);
  });

  it("refuses a day above 120 minutes in total, and accepts exactly 120", () => {
    const [ru, it] = MOCK_PREFERENCES.goals;
    const withMinutes = (a: number, b: number) =>
      preferencesSchema.safeParse({ ...MOCK_PREFERENCES, goals: [{ ...ru, weight: a }, { ...it, weight: b }] });
    const over = withMinutes(75, 50);
    expect(over.success).toBe(false);
    expect(over.error?.issues[0].message).toBe("Au plus 120 minutes par jour au total");
    expect(withMinutes(70, 50).success).toBe(true);
  });
});

describe("languageGoalSchema purpose", () => {
  it("defaults to general when absent", () => {
    expect(languageGoalSchema.parse(goal).purpose).toBe("general");
  });

  it.each(LANGUAGE_PURPOSES)("accepts %s", (purpose) => {
    expect(languageGoalSchema.parse({ ...goal, purpose }).purpose).toBe(purpose);
  });

  it("refuses an unknown purpose", () => {
    expect(languageGoalSchema.safeParse({ ...goal, purpose: "hobby" }).success).toBe(false);
  });
});

describe("languageGoalSchema topics and content types", () => {
  it("refuses a language without topic", () => {
    const result = languageGoalSchema.safeParse({ ...goal, topics: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Choisis au moins un sujet");
    expect(languageGoalSchema.safeParse({ ...goal, topics: undefined }).success).toBe(false);
  });

  it("refuses a language without content type, or with an unknown one", () => {
    const empty = languageGoalSchema.safeParse({ ...goal, contentTypes: [] });
    expect(empty.error?.issues[0].message).toBe("Choisis au moins un type de contenu");
    expect(languageGoalSchema.safeParse({ ...goal, contentTypes: ["radio"] }).success).toBe(false);
    expect(languageGoalSchema.safeParse({ ...goal, topics: ["cuisine"] }).success).toBe(false);
  });

  it("keeps the topics and formats of each language", () => {
    const parsed = languageGoalSchema.parse({ ...goal, topics: ["sport", "voyage"], contentTypes: ["video", "podcast"] });
    expect(parsed.topics).toEqual(["sport", "voyage"]);
    expect(parsed.contentTypes).toEqual(["video", "podcast"]);
  });
});

describe("preferencesSchema showStreak", () => {
  it("defaults to true when absent, so existing data still parses", () => {
    const { showStreak: _omitted, ...legacy } = MOCK_PREFERENCES;
    expect(preferencesSchema.parse(legacy).showStreak).toBe(true);
  });

  it("keeps an explicit false and refuses a non-boolean", () => {
    expect(preferencesSchema.parse({ ...MOCK_PREFERENCES, showStreak: false }).showStreak).toBe(false);
    expect(preferencesSchema.safeParse({ ...MOCK_PREFERENCES, showStreak: "non" }).success).toBe(false);
  });
});
