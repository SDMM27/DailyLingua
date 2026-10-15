import { describe, expect, it } from "vitest";
import { LANGUAGE_REGISTRY } from "./languages";
import { STRESS_MARK, stripStress } from "./stress";

describe("stripStress", () => {
  it("removes the stress marks and keeps the letters", () => {
    expect(stripStress(`сло${STRESS_MARK}во`)).toBe("слово");
    expect(stripStress("по большо́му счёту")).toBe("по большому счёту");
  });

  it("keeps letters that carry their own diacritic", () => {
    expect(stripStress("счёт")).toBe("счёт");
    expect(stripStress("é")).toBe("é");
  });
});

describe("languages that mark stress", () => {
  it("are Russian and Ukrainian", () => {
    const codes = Object.values(LANGUAGE_REGISTRY)
      .filter((l) => "markStress" in l)
      .map((l) => l.code);
    expect(codes).toEqual(["ru", "uk"]);
  });
});
