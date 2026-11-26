import { cefrLevels, roleplayScenarioSchema } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { ROLEPLAY_SCENARIOS, checkRoleplayScenarios, getRoleplayScenario, offeredRoleplayScenarios, roleplayScenarios } from "./index";

describe("role play scenarios", () => {
  it("has the 8 scenarios of the spec, valid, with unique ids", () => {
    expect(ROLEPLAY_SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "cafe-order", "ask-directions", "book-a-room", "at-the-pharmacy", "doctor-appointment", "return-an-item", "negotiate-rent", "defend-an-idea",
    ]);
    for (const scenario of ROLEPLAY_SCENARIOS) expect(roleplayScenarioSchema.safeParse(scenario).success, scenario.id).toBe(true);
    expect(checkRoleplayScenarios(ROLEPLAY_SCENARIOS)).toEqual([]);
  });

  it("covers every level from A1 to C2, and follows the ranges of the spec", () => {
    for (const level of cefrLevels) expect(roleplayScenarios(level).length, level).toBeGreaterThan(0);
    expect(roleplayScenarios("A1").map((s) => s.id)).toEqual(["cafe-order", "ask-directions"]);
    expect(roleplayScenarios("C2").map((s) => s.id)).toEqual(["defend-an-idea"]);
    expect(getRoleplayScenario("doctor-appointment")).toMatchObject({ minLevel: "A2", maxLevel: "B2" });
    expect(getRoleplayScenario("nope")).toBeUndefined();
  });

  it("offers at most three scenarios, the same all day, others on another day", () => {
    const offer = (day: number) => offeredRoleplayScenarios("B1", day).map((s) => s.id);
    expect(roleplayScenarios("B1").length).toBeGreaterThan(3);
    expect(offer(10)).toHaveLength(3);
    expect(offer(10)).toEqual(offer(10));
    expect(offer(11)).not.toEqual(offer(10));
    expect(offeredRoleplayScenarios("A1", 5)).toHaveLength(2);
    expect(offer(-4)).toHaveLength(3);
  });

  it("reports what is wrong: bad id, long situation, reversed levels, duplicate, missing level", () => {
    const base = ROLEPLAY_SCENARIOS[0]!;
    expect(checkRoleplayScenarios([{ ...base, id: "X" }]).join()).toContain("id");
    expect(checkRoleplayScenarios([{ ...base, situation: { fr: "x".repeat(201), en: "ok" } }]).join()).toContain("situation");
    expect(checkRoleplayScenarios([{ ...base, minLevel: "B2", maxLevel: "A1" }]).join()).toContain("maxLevel");
    expect(checkRoleplayScenarios([base, base]).join()).toContain("duplicate");
    expect(checkRoleplayScenarios([base])).toContain("no scenario for level C2");
  });
});
