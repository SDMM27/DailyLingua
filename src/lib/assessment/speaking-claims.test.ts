import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES, languageInfo } from "@/lib/domain/languages";
import { SPEAKING_CLAIMS } from "./speaking-claims";

describe("SPEAKING_CLAIMS", () => {
  it("has 8 statements, from A1 to C2, in the expected order", () => {
    expect(SPEAKING_CLAIMS.map((c) => c.level)).toEqual(["A1", "A2", "B1", "B1", "B2", "B2", "C1", "C2"]);
  });

  it("has unique ids and statements in the first person", () => {
    expect(new Set(SPEAKING_CLAIMS.map((c) => c.id)).size).toBe(8);
    for (const claim of SPEAKING_CLAIMS) expect(claim.text).toMatch(/^Je peux /);
  });

  it("names no language", () => {
    for (const code of LANGUAGE_CODES) {
      const info = languageInfo(code);
      for (const claim of SPEAKING_CLAIMS) {
        expect(claim.text.toLowerCase()).not.toContain(info.nameFr.toLowerCase());
      }
    }
  });
});
