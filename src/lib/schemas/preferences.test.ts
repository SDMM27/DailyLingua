import { describe, expect, it } from "vitest";
import { LANGUAGE_PURPOSES, languageGoalSchema } from "./preferences";

const goal = { language: "it", level: "B1", targetLevel: "B2", focus: "", weight: 1 };

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
