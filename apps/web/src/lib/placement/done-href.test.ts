import { describe, expect, it } from "vitest";
import { placementDoneHref } from "./done-href";

describe("placementDoneHref", () => {
  it("goes to the path of the primary language", () => {
    expect(placementDoneHref("it", [{ language: "it" }, { language: "ru" }])).toBe("/parcours/it");
  });

  it("goes to the progress page of a secondary language, which has no path page", () => {
    expect(placementDoneHref("ru", [{ language: "it" }, { language: "ru" }])).toBe("/progress?lang=ru");
  });
});
