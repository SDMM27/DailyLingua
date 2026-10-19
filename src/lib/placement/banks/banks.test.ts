import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES } from "@/lib/domain/languages";
import { CEFR_LEVELS } from "@/lib/schemas/common";
import { PLACEMENT_ITEMS_PER_LEVEL } from "@/lib/schemas/placement";
import { checkPlacementBank } from "../check-bank";
import { PLACEMENT_BANKS, placementItems } from ".";

describe("placement banks", () => {
  it.each(LANGUAGE_CODES)("%s has a valid bank", (code) => {
    expect(PLACEMENT_BANKS[code]).toBeDefined();
    expect(checkPlacementBank(code, PLACEMENT_BANKS[code])).toEqual([]);
  });

  it("question ids are unique across all banks", () => {
    const ids = LANGUAGE_CODES.flatMap((code) => placementItems(code).map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(LANGUAGE_CODES)("%s gives the engine a flat list with a full block at every level", (code) => {
    const items = placementItems(code);
    for (const level of CEFR_LEVELS) {
      expect(items.filter((item) => item.level === level).length).toBeGreaterThanOrEqual(PLACEMENT_ITEMS_PER_LEVEL);
    }
  });
});
