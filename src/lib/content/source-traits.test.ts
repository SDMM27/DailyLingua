import { describe, expect, it } from "vitest";
import { SOURCE_CATALOG } from "./catalog";
import { sourceTraitLabels, sourceTraits } from "./source-traits";

describe("sourceTraits", () => {
  it("reads the traits of a catalogue source from its key", () => {
    const french = SOURCE_CATALOG.find((s) => s.instructionLanguage === "fr");
    expect(french).toBeDefined();
    expect(sourceTraits(french!.key).instructionLanguage).toBe("fr");
    const kids = SOURCE_CATALOG.find((s) => s.audience === "children");
    expect(sourceTraits(kids!.key).audience).toBe("children");
  });

  it("has no traits for a plain source, an unknown key or no key", () => {
    expect(sourceTraits("meduza")).toEqual({});
    expect(sourceTraits("nope")).toEqual({});
    expect(sourceTraits(undefined)).toEqual({});
    expect(sourceTraitLabels(null)).toEqual([]);
  });

  it("labels each trait in French", () => {
    for (const s of SOURCE_CATALOG) {
      const labels = sourceTraitLabels(s.key);
      expect(labels.includes("Expliqué en français"), s.key).toBe(s.instructionLanguage === "fr");
      expect(labels.includes("Expliqué en anglais"), s.key).toBe(s.instructionLanguage === "en");
      expect(labels.includes("Jeunesse"), s.key).toBe(s.audience === "children");
    }
  });
});
