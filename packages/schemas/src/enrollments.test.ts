import { describe, expect, it } from "vitest";
import { saveEnrollmentsInputSchema } from "./index";

describe("saveEnrollmentsInputSchema", () => {
  const fr = { language: "fr", dailyMinutes: 20 };

  it("fills the defaults", () => {
    const [item] = saveEnrollmentsInputSchema.parse([fr]);
    expect(item).toEqual({
      language: "fr",
      dailyMinutes: 20,
      days: [1, 2, 3, 4, 5, 6, 7],
      targetLevel: null,
      purpose: null,
      startLevel: null,
    });
  });

  it("accepts A0 as a start level but not as a target", () => {
    expect(saveEnrollmentsInputSchema.safeParse([{ ...fr, startLevel: "A0" }]).success).toBe(true);
    expect(saveEnrollmentsInputSchema.safeParse([{ ...fr, targetLevel: "A0" }]).success).toBe(false);
  });

  it("refuses zero or more than four languages, and a language twice", () => {
    expect(saveEnrollmentsInputSchema.safeParse([]).success).toBe(false);
    const five = ["fr", "es", "it", "de", "pt"].map((language) => ({ language, dailyMinutes: 5 }));
    expect(saveEnrollmentsInputSchema.safeParse(five).success).toBe(false);
    expect(saveEnrollmentsInputSchema.safeParse(five.slice(0, 4)).success).toBe(true);
    expect(saveEnrollmentsInputSchema.safeParse([fr, fr]).success).toBe(false);
  });

  it("refuses bad minutes, days and purpose", () => {
    expect(saveEnrollmentsInputSchema.safeParse([{ ...fr, dailyMinutes: 4 }]).success).toBe(false);
    expect(saveEnrollmentsInputSchema.safeParse([{ ...fr, days: [] }]).success).toBe(false);
    expect(saveEnrollmentsInputSchema.safeParse([{ ...fr, days: [1, 1] }]).success).toBe(false);
    expect(saveEnrollmentsInputSchema.safeParse([{ ...fr, days: [8] }]).success).toBe(false);
    expect(saveEnrollmentsInputSchema.safeParse([{ ...fr, purpose: "x".repeat(201) }]).success).toBe(false);
  });

  it("refuses more than 120 minutes on one day but allows it on different days", () => {
    const heavy = [
      { language: "fr", dailyMinutes: 70, days: [1] },
      { language: "es", dailyMinutes: 60, days: [1] },
    ];
    expect(saveEnrollmentsInputSchema.safeParse(heavy).success).toBe(false);
    expect(saveEnrollmentsInputSchema.safeParse([heavy[0], { ...heavy[1], days: [2] }]).success).toBe(true);
  });
});
