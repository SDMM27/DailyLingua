import { completePlacementInput, placementBankSchema } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { isPlacementLanguage, itBank, PLACEMENT_LANGUAGES, placementBankOf, ruBank } from ".";

describe("placement banks", () => {
  it.each([["ru", ruBank], ["it", itBank]] as const)("%s has a valid bank of its own language", (code, bank) => {
    expect(placementBankSchema.safeParse(bank).success).toBe(true);
    expect(bank.language).toBe(code);
    expect(bank.items.every((item) => item.id.startsWith(`${code}-`))).toBe(true);
  });

  it("is served for the languages that offer the test and for no other", () => {
    expect(PLACEMENT_LANGUAGES).toEqual(["ru", "it"]);
    expect(placementBankOf("ru")).toBe(ruBank);
    expect(placementBankOf("it")).toBe(itBank);
    expect(placementBankOf("es")).toBeNull();
    expect(isPlacementLanguage("it")).toBe(true);
    expect(isPlacementLanguage("fr")).toBe(false);
  });
});

describe("completePlacementInput", () => {
  const valid = { language: "it", startLevel: "A2", answers: [{ itemId: "it-a2-1", choice: null }], chosenLevel: "B1" };

  it("accepts a finished test and refuses what is not one", () => {
    expect(completePlacementInput.safeParse(valid).success).toBe(true);
    expect(completePlacementInput.safeParse({ ...valid, answers: [] }).success).toBe(false);
    expect(completePlacementInput.safeParse({ ...valid, startLevel: "A0" }).success).toBe(false);
    expect(completePlacementInput.safeParse({ ...valid, answers: Array.from({ length: 31 }, () => valid.answers[0]) }).success).toBe(false);
    expect(completePlacementInput.safeParse({ ...valid, answers: [{ itemId: "it-a2-1", choice: 4 }] }).success).toBe(false);
    expect(completePlacementInput.safeParse({ ...valid, estimate: "C2" }).success).toBe(false);
  });
});
