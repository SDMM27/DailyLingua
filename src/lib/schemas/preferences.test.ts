import { describe, expect, it } from "vitest";
import { LANGUAGE_PURPOSES, languageGoalSchema } from "./preferences";

const goal = { language: "it", level: "B1", targetLevel: "B2", focus: "", weight: 1, topics: ["société"], contentTypes: ["article"] };

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
