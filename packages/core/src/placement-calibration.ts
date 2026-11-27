import { cefrLevels, placementPayloadSchema, type CefrLevel, type PlacementResultRow } from "@dailylingua/schemas";
import { LEVEL_SCALE_MAX } from "./levels";

export const PLACEMENT_TYPES = ["grammar", "vocabulary", "reading"] as const;
export type PlacementType = (typeof PLACEMENT_TYPES)[number];
export const PLACEMENT_APP_SKILLS = ["reading", "listening", "writing", "speaking"] as const;
export type PlacementAppSkill = (typeof PLACEMENT_APP_SKILLS)[number];

type PlacementCalibrationItem = { id: string; level: CefrLevel; skill: PlacementType; answer: number };

/** What the calibration needs of a bank: the version and, per question, its level, type and right answer. */
export interface PlacementCalibrationBank {
  version: string;
  items: PlacementCalibrationItem[];
}

export interface PlacementObservation {
  account: string;
  itemId: string;
  correct: boolean;
}

export interface PlacementThresholds {
  minObservations: number;
  minAccounts: number;
}
export const PLACEMENT_THRESHOLDS: PlacementThresholds = { minObservations: 30, minAccounts: 10 };

/** Questions a type needs at every level of a bank for the test to measure the matching skill. */
const MIN_MEASURED_ITEMS_PER_LEVEL = 2;
/** Among the skills of the progress board, the test only measures reading. */
const SKILL_TYPE: Partial<Record<PlacementAppSkill, PlacementType>> = { reading: "reading" };

export function placementCoverage(items: Pick<PlacementCalibrationItem, "level" | "skill">[]) {
  const cells = cefrLevels.flatMap((level) =>
    PLACEMENT_TYPES.map((type) => ({
      level,
      type,
      items: items.filter((item) => item.level === level && item.skill === type).length,
    })),
  );
  const skills = PLACEMENT_APP_SKILLS.map((skill) => {
    const type = SKILL_TYPE[skill];
    const measured = type !== undefined
      && cells.filter((cell) => cell.type === type).every((cell) => cell.items >= MIN_MEASURED_ITEMS_PER_LEVEL);
    return { skill, measured };
  });
  return { cells, skills };
}

/** Wilson score interval at 95 % for `successes` out of `n`; `null` without observation. */
export function wilson95(successes: number, n: number): [number, number] | null {
  if (n === 0) return null;
  const z = 1.96;
  const p = successes / n;
  const denominator = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator;
  return [Math.max(0, centre - margin), Math.min(1, centre + margin)];
}

/**
 * Difficulty of each question (share of right answers, Wilson interval) once it has enough
 * observations from enough accounts; a cell is calibrated when all its questions are, a type is
 * adaptive when its six levels are.
 */
export function calibratePlacementItems(
  items: PlacementCalibrationItem[],
  observations: PlacementObservation[],
  thresholds: PlacementThresholds = PLACEMENT_THRESHOLDS,
) {
  const byItem = new Map<string, PlacementObservation[]>();
  for (const observation of observations) {
    const list = byItem.get(observation.itemId);
    if (list) list.push(observation);
    else byItem.set(observation.itemId, [observation]);
  }
  const calibratedItems = items.map((item) => {
    const seen = byItem.get(item.id) ?? [];
    const n = seen.length;
    const accounts = new Set(seen.map(({ account }) => account)).size;
    const correct = seen.filter((observation) => observation.correct).length;
    return {
      id: item.id,
      level: item.level,
      type: item.skill,
      n,
      accounts,
      pCorrect: n === 0 ? null : correct / n,
      wilson95: wilson95(correct, n),
      calibrated: n >= thresholds.minObservations && accounts >= thresholds.minAccounts,
    };
  });
  const cells = cefrLevels.flatMap((level) =>
    PLACEMENT_TYPES.map((type) => {
      const inCell = calibratedItems.filter((item) => item.level === level && item.type === type);
      return {
        level,
        type,
        items: inCell.length,
        calibratedItems: inCell.filter((item) => item.calibrated).length,
        calibrated: inCell.length > 0 && inCell.every((item) => item.calibrated),
      };
    }),
  );
  const adaptive = Object.fromEntries(
    PLACEMENT_TYPES.map((type) => [type, cells.filter((cell) => cell.type === type).every((cell) => cell.calibrated)]),
  ) as Record<PlacementType, boolean>;
  const status = PLACEMENT_TYPES.every((type) => adaptive[type]) ? "calibré" : "calibrage insuffisant";
  return { items: calibratedItems, cells, adaptive, status };
}

/**
 * Observations of one bank from `assessment_result` rows: completed placement tests taken on the
 * bank's version, one test per account (the oldest), first answer per question, "I don't know"
 * counted wrong, unknown questions ignored. Other tests, including malformed payloads, are counted
 * as ignored.
 */
export function placementObservations(bank: PlacementCalibrationBank, results: PlacementResultRow[]) {
  const answers = new Map(bank.items.map((item) => [item.id, item.answer]));
  const candidates = results
    .filter((row) => row.kind === "placement")
    .toSorted((a, b) => Date.parse(a.taken_at) - Date.parse(b.taken_at));
  const observations: PlacementObservation[] = [];
  const accounts = new Set<string>();
  let testsUsed = 0;
  let testsIgnored = 0;
  for (const row of candidates) {
    const payload = placementPayloadSchema.safeParse(row.payload);
    if (!payload.success || payload.data.bank_version !== bank.version) {
      testsIgnored += 1;
      continue;
    }
    if (accounts.has(row.user_id)) continue;
    accounts.add(row.user_id);
    testsUsed += 1;
    const seen = new Set<string>();
    for (const { itemId, choice } of payload.data.answers) {
      const answer = answers.get(itemId);
      if (answer === undefined || seen.has(itemId)) continue;
      seen.add(itemId);
      observations.push({ account: row.user_id, itemId, correct: choice !== null && choice === answer });
    }
  }
  return { observations, testsUsed, testsIgnored };
}

/** Distance between an assessment and the continuous estimate on the 0–7 scale; the target is half a level. */
export function assessmentGap(assessmentValue: number, continuousValue: number) {
  const gap = Math.abs(assessmentValue - continuousValue);
  return { gap, withinHalfLevel: gap <= 0.5 };
}

export interface SkillMeasure {
  at: string;
  value: number;
}

export interface ProjectionOptions {
  horizonDays: number;
  minMeasures?: number;
  minSpanDays?: number;
}

const DAY_MS = 86_400_000;

/**
 * Range of a skill `horizonDays` after its last measure, from comparable measures of one series
 * (same language, same kind of measure). `null` when there are too few measures or they span too
 * few days. Linear least-squares trend, widened by the largest residual (at least half a level
 * each side) and bounded to the scale.
 */
export function projectSkillRange(measures: SkillMeasure[], options: ProjectionOptions) {
  const { horizonDays, minMeasures = 3, minSpanDays = 60 } = options;
  const points = measures
    .map(({ at, value }) => ({ t: Date.parse(at) / DAY_MS, value }))
    .filter(({ t }) => !Number.isNaN(t))
    .toSorted((a, b) => a.t - b.t);
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || points.length < minMeasures || last.t - first.t < minSpanDays) return null;
  const meanT = points.reduce((sum, { t }) => sum + t, 0) / points.length;
  const meanV = points.reduce((sum, { value }) => sum + value, 0) / points.length;
  const variance = points.reduce((sum, { t }) => sum + (t - meanT) ** 2, 0);
  if (variance === 0) return null;
  const slope = points.reduce((sum, { t, value }) => sum + (t - meanT) * (value - meanV), 0) / variance;
  const trend = (t: number) => meanV + slope * (t - meanT);
  const spread = Math.max(0.5, ...points.map(({ t, value }) => Math.abs(value - trend(t))));
  const centre = trend(last.t + horizonDays);
  const clamp = (value: number) => Math.min(LEVEL_SCALE_MAX, Math.max(0, value));
  return { low: clamp(centre - spread), high: clamp(centre + spread), centre: clamp(centre) };
}
