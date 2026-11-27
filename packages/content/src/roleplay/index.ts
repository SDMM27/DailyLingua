import { cefrLevels, roleplayScenarioSchema, type CefrLevel, type RoleplayScenario } from "@dailylingua/schemas";
import { ROLEPLAY_SCENARIO_LIST } from "./scenarios";

const fits = (scenario: RoleplayScenario, level: CefrLevel) =>
  cefrLevels.indexOf(scenario.minLevel) <= cefrLevels.indexOf(level) && cefrLevels.indexOf(level) <= cefrLevels.indexOf(scenario.maxLevel);

/** What is wrong with a set of scenarios, one message each (empty when it is fine). */
export function checkRoleplayScenarios(scenarios: readonly unknown[]): string[] {
  const problems: string[] = [];
  const valid: RoleplayScenario[] = [];
  for (const [index, scenario] of scenarios.entries()) {
    const parsed = roleplayScenarioSchema.safeParse(scenario);
    if (parsed.success) valid.push(parsed.data);
    else problems.push(`scenario #${index + 1}: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  }
  const seen = new Set<string>();
  for (const { id } of valid) {
    if (seen.has(id)) problems.push(`duplicate scenario id "${id}"`);
    seen.add(id);
  }
  for (const level of cefrLevels) {
    if (!valid.some((scenario) => fits(scenario, level))) problems.push(`no scenario for level ${level}`);
  }
  return problems;
}

const problems = checkRoleplayScenarios(ROLEPLAY_SCENARIO_LIST);
if (problems.length > 0) throw new Error(`Invalid role play scenarios: ${problems.join(" | ")}`);

export const ROLEPLAY_SCENARIOS: readonly RoleplayScenario[] = ROLEPLAY_SCENARIO_LIST.map((scenario) => roleplayScenarioSchema.parse(scenario));

export function getRoleplayScenario(id: string): RoleplayScenario | undefined {
  return ROLEPLAY_SCENARIOS.find((scenario) => scenario.id === id);
}

/** The scenarios whose range contains `level`, in the order of the registry. */
export function roleplayScenarios(level: CefrLevel): RoleplayScenario[] {
  return ROLEPLAY_SCENARIOS.filter((scenario) => fits(scenario, level));
}

/**
 * Up to three scenarios for a learner at `level`, rotated by `dayIndex` (the learning day as a number) so a learner who
 * comes back tomorrow is offered something else. Deterministic: the same day and level give the same offer.
 */
export function offeredRoleplayScenarios(level: CefrLevel, dayIndex: number): RoleplayScenario[] {
  const pool = roleplayScenarios(level);
  if (pool.length <= 3) return pool;
  const start = ((dayIndex % pool.length) + pool.length) % pool.length;
  return [0, 1, 2].map((offset) => pool[(start + offset) % pool.length] as RoleplayScenario);
}
