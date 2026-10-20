import { describe, expect, it } from "vitest";
import type { PlacementItem } from "@/lib/schemas/placement";
import { checkPlacementBank } from "./check-bank";
import { buildFlatItems } from "./testing";

const bank = (items: PlacementItem[]) => ({ language: "ru", version: "2026-10-19", items });

describe("checkPlacementBank", () => {
  it("accepts a bank of 60 questions", () => {
    expect(checkPlacementBank("ru", bank(buildFlatItems("ru")))).toEqual([]);
  });

  it("refuses a bank of the wrong size", () => {
    expect(checkPlacementBank("ru", bank(buildFlatItems("ru").slice(1))).length).toBeGreaterThan(0);
  });

  it("refuses a level without 10 questions", () => {
    const items = buildFlatItems("ru");
    items[0] = { ...items[10], id: "ru-a2-1" };
    expect(checkPlacementBank("ru", bank(items)).join("\n")).toMatch(/A1 has 9|A2 has 11/);
  });

  it("refuses a wrong mix of skills", () => {
    const items = buildFlatItems("ru");
    items[0] = { ...items[0], skill: "vocabulary" };
    expect(checkPlacementBank("ru", bank(items)).join("\n")).toMatch(/A1 has 3 grammar/);
  });

  it("refuses unbalanced answer positions", () => {
    const items = buildFlatItems("ru").map((item) => ({ ...item, answer: 0 }));
    expect(checkPlacementBank("ru", bank(items)).join("\n")).toMatch(/answer positions 60\/0\/0\/0/);
  });

  it("refuses a wrong language, duplicate or malformed ids", () => {
    expect(checkPlacementBank("it", bank(buildFlatItems("ru"))).join("\n")).toMatch(/language is ru, expected it/);

    const duplicate = buildFlatItems("ru");
    duplicate[1] = { ...duplicate[1], id: duplicate[0].id };
    expect(checkPlacementBank("ru", bank(duplicate)).join("\n")).toMatch(/duplicate id ru-a1-1/);

    const badId = buildFlatItems("ru");
    badId[0] = { ...badId[0], id: "ru-e-a1-1" };
    expect(checkPlacementBank("ru", bank(badId)).join("\n")).toMatch(/items\.0\.id/);

    const otherLevel = buildFlatItems("ru");
    otherLevel[0] = { ...otherLevel[0], id: "ru-b1-1" };
    expect(checkPlacementBank("ru", bank(otherLevel)).join("\n")).toMatch(/does not match its level/);
  });

  it("refuses a prompt without exactly one gap", () => {
    const items = buildFlatItems("ru");
    items[0] = { ...items[0], prompt: "___ et ___" };
    expect(checkPlacementBank("ru", bank(items)).join("\n")).toMatch(/exactly once/);
  });
});
