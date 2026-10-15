import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES } from "@/lib/domain/languages";
import { checkPlacementBank } from "../check-bank";
import { PLACEMENT_BANKS } from ".";

describe("placement banks", () => {
  it.each(LANGUAGE_CODES)("%s has a valid bank", (code) => {
    expect(PLACEMENT_BANKS[code]).toBeDefined();
    expect(checkPlacementBank(code, PLACEMENT_BANKS[code])).toEqual([]);
  });

  it("question ids are unique across all banks", () => {
    const ids = Object.values(PLACEMENT_BANKS).flatMap((bank) =>
      [...bank.variants.everyday, ...bank.variants.professional].map((item) => item.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
