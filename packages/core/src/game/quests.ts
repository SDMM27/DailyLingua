import type { DateKey } from "@dailylingua/schemas";
import { addDays } from "../dates";
import { RULE_VOLET } from "./rules";

/**
 * Quests (`j7-social.md` lot 1). Every quest is measured in `xp_ledger` lines of its period (`quest.*` and `immersion.*`
 * lines never count), so progress is verifiable and recomputable. Everything here is pure: the server hands in the
 * lines and the settings, nothing reads a clock or a store.
 */
export const QUEST_CATALOG_VERSION = "quests.v1";

export const QUEST_DAILY_XP = 10;
export const QUEST_WEEKLY_XP = 40;

/** Strands a quest belongs to: the four XP volets, plus regularity (`session.complete`) and discovery (`unit.complete`). */
export type QuestVolet = "study" | "input" | "output" | "fluency" | "regularity" | "discovery";
export type QuestPeriod = "day" | "week";
type Measure = { kind: "count"; reasons: readonly string[] } | { kind: "days"; reason: string } | { kind: "volets" };

export interface QuestDef {
  id: string;
  volet: QuestVolet;
  period: QuestPeriod;
  measure: Measure;
  target: number;
  /** Needs the learner to use a function that can be unavailable (microphone, units): left out when never used in 30 days. */
  needsUsage?: string;
}

const count = (...reasons: string[]): Measure => ({ kind: "count", reasons });
const READING = ["reading.understood", "reading.understood_well"];
const REWRITE = ["rewrite.sentence", "rewrite.sentence_native"];

export const QUEST_CATALOG: readonly QuestDef[] = [
  { id: "read_2", volet: "input", period: "day", measure: count(...READING), target: 2 },
  { id: "read_well", volet: "input", period: "day", measure: count("reading.understood_well"), target: 1 },
  { id: "dictation_5", volet: "input", period: "day", measure: count("dictation.sentence"), target: 5 },
  { id: "produce_1", volet: "output", period: "day", measure: count("production.corrected"), target: 1 },
  { id: "rewrite_2", volet: "output", period: "day", measure: count(...REWRITE), target: 2 },
  { id: "recall_production_10", volet: "study", period: "day", measure: count("review.production"), target: 10 },
  { id: "reconquest_3", volet: "study", period: "day", measure: count("review.bonus.reconquest"), target: 3 },
  { id: "error_of_day", volet: "study", period: "day", measure: count("error_of_day.reworked"), target: 1 },
  { id: "fluency_2", volet: "fluency", period: "day", measure: count("fluency.pass"), target: 2 },
  { id: "shadowing_10", volet: "fluency", period: "day", measure: count("shadowing.sentence"), target: 10, needsUsage: "shadowing.sentence" },
  { id: "session_1", volet: "regularity", period: "day", measure: count("session.complete"), target: 1 },
  { id: "unit_1", volet: "discovery", period: "day", measure: count("unit.complete"), target: 1, needsUsage: "unit.complete" },
  { id: "read_5_week", volet: "input", period: "week", measure: count(...READING), target: 5 },
  { id: "produce_4_week", volet: "output", period: "week", measure: count("production.corrected"), target: 4 },
  { id: "roleplay_week", volet: "output", period: "week", measure: count("roleplay.completed"), target: 1, needsUsage: "roleplay.completed" },
  { id: "recall_production_40_week", volet: "study", period: "week", measure: count("review.production"), target: 40 },
  { id: "fluency_4_week", volet: "fluency", period: "week", measure: count("fluency.pass"), target: 4 },
  { id: "session_4_days_week", volet: "regularity", period: "week", measure: { kind: "days", reason: "session.complete" }, target: 4 },
  { id: "four_volets_week", volet: "regularity", period: "week", measure: { kind: "volets" }, target: 4 },
];

const BY_ID = new Map(QUEST_CATALOG.map((quest) => [quest.id, quest]));
export const questById = (id: string): QuestDef | undefined => BY_ID.get(id);

/** Ids of the reasons a quest may need to find in the last 30 days (`QuestDef.needsUsage`). */
export const QUEST_USAGE_REASONS = ["shadowing.sentence", "roleplay.completed", "unit.complete"] as const;

/** An XP line as the quests see it. */
export interface QuestLine {
  reason: string;
  amount: number;
  day: DateKey;
}

const isOwnLine = (reason: string) => reason.startsWith("quest.") || reason.startsWith("immersion.");

/** First and last day (inclusive) of the period of a quest that starts on `periodStart`. */
export function periodRange(period: QuestPeriod, periodStart: DateKey): { from: DateKey; through: DateKey } {
  return { from: periodStart, through: period === "day" ? periodStart : addDays(periodStart, 6) };
}

/** Progress of a quest over the lines of its period (lines outside the period or of `quest.*`/`immersion.*` are ignored), not above the target. */
export function questProgress(quest: Pick<QuestDef, "measure" | "target">, lines: readonly QuestLine[], range: { from: DateKey; through: DateKey }): number {
  const inRange = lines.filter((line) => line.day >= range.from && line.day <= range.through && !isOwnLine(line.reason));
  const { measure } = quest;
  let value = 0;
  if (measure.kind === "count") {
    const reasons = new Set(measure.reasons);
    value = inRange.filter((line) => reasons.has(line.reason)).length;
  } else if (measure.kind === "days") {
    value = new Set(inRange.filter((line) => line.reason === measure.reason).map((line) => line.day)).size;
  } else {
    value = new Set(inRange.map((line) => RULE_VOLET[line.reason as keyof typeof RULE_VOLET] ?? null).filter((volet) => volet !== null)).size;
  }
  return Math.min(value, quest.target);
}

export interface QuestAssignmentLike {
  id: string;
  questId: string;
  period: QuestPeriod;
  periodStart: DateKey;
  target: number;
  completedAt: string | null;
}

/** Ids of the unfinished quests whose target the lines reach: the ones to settle. Idempotent (a finished quest is never listed). */
export function questsToSettle(assignments: readonly QuestAssignmentLike[], lines: readonly QuestLine[]): string[] {
  const done: string[] = [];
  for (const assignment of assignments) {
    if (assignment.completedAt !== null) continue;
    const quest = questById(assignment.questId);
    if (!quest) continue;
    if (questProgress({ measure: quest.measure, target: assignment.target }, lines, periodRange(assignment.period, assignment.periodStart)) >= assignment.target) {
      done.push(assignment.id);
    }
  }
  return done;
}

// Choice ----------------------------------------------------------------------------------------------------------------

/** Everything the choice depends on. */
export interface QuestChoiceInput {
  userId: string;
  period: QuestPeriod;
  periodStart: DateKey;
  /** XP lines of the 14 days before the period. */
  recentLines: readonly QuestLine[];
  /** Quest ids assigned in the 3 days before (days only). */
  recentQuestIds: readonly string[];
  /** Reasons (among `QUEST_USAGE_REASONS`) that have at least one line in the last 30 days. */
  usedReasons: readonly string[];
  /** Whole days since the first XP line; `null` when there is none yet. */
  accountAgeDays: number | null;
}

export interface ChosenQuest {
  questId: string;
  slot: 1 | 2 | 3;
  target: number;
}

const NEW_ACCOUNT_DAYS = 7;
const NEW_ACCOUNT_DAILY = ["session_1", "read_2", "recall_production_10"] as const;
const BALANCED_SHARE = 0.25;
const XP_VOLETS = ["study", "input", "output", "fluency"] as const;

/** Deterministic 32-bit hash (FNV-1a) of a string. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Items in a seeded, stable order (sort by hash of seed and item). */
function seededOrder<T>(items: readonly T[], seed: string, key: (item: T) => string): T[] {
  return [...items].sort((a, b) => hash(`${seed}|${key(a)}`) - hash(`${seed}|${key(b)}`) || key(a).localeCompare(key(b)));
}

/** XP volets from the most behind (gap to a 25 % share over the lines) to the least; ties broken by the seed. */
export function voletsByGap(lines: readonly QuestLine[], seed: string): (typeof XP_VOLETS)[number][] {
  const totals = new Map<string, number>(XP_VOLETS.map((volet) => [volet, 0]));
  let all = 0;
  for (const line of lines) {
    if (isOwnLine(line.reason)) continue;
    const volet = RULE_VOLET[line.reason as keyof typeof RULE_VOLET];
    if (!volet) continue;
    totals.set(volet, (totals.get(volet) ?? 0) + line.amount);
    all += line.amount;
  }
  const gap = (volet: string) => BALANCED_SHARE - (all === 0 ? 0 : (totals.get(volet) ?? 0) / all);
  return seededOrder(XP_VOLETS, seed, (volet) => volet).sort((a, b) => gap(b) - gap(a));
}

function available(input: QuestChoiceInput, quest: QuestDef, ignoreRecent: boolean): boolean {
  if (quest.period !== input.period) return false;
  if (quest.needsUsage && !input.usedReasons.includes(quest.needsUsage)) return false;
  if (!ignoreRecent && input.period === "day" && input.recentQuestIds.includes(quest.id)) return false;
  return true;
}

function pickIn(input: QuestChoiceInput, volets: readonly QuestVolet[], taken: ReadonlySet<string>, seed: string, ignoreRecent = false): QuestDef | null {
  const candidates = QUEST_CATALOG.filter((quest) => volets.includes(quest.volet) && !taken.has(quest.id) && available(input, quest, ignoreRecent));
  return seededOrder(candidates, seed, (quest) => quest.id)[0] ?? null;
}

const toChosen = (quest: QuestDef, slot: 1 | 2 | 3): ChosenQuest => ({ questId: quest.id, slot, target: quest.target });

/**
 * The quests of a day or a week: pure and deterministic (seed = user + period). A day gets three, a week three once the
 * account is a week old (none the first week).
 */
export function chooseQuests(input: QuestChoiceInput): ChosenQuest[] {
  const seed = `${input.userId}|${input.period}|${input.periodStart}`;
  const isNew = input.accountAgeDays === null || input.accountAgeDays < NEW_ACCOUNT_DAYS;
  if (input.period === "week" && isNew) return [];
  if (input.period === "day" && isNew) return NEW_ACCOUNT_DAILY.map((id, index) => ({ questId: id, slot: (index + 1) as 1 | 2 | 3, target: questById(id)!.target }));

  const order = voletsByGap(input.recentLines, seed);
  const taken = new Set<string>();
  const chosen: ChosenQuest[] = [];
  const usedVolets = new Set<string>();
  for (const slot of [1, 2] as const) {
    for (const volet of order) {
      if (usedVolets.has(volet)) continue;
      const quest = pickIn(input, [volet], taken, `${seed}|${slot}`);
      if (!quest) continue;
      usedVolets.add(volet);
      taken.add(quest.id);
      chosen.push(toChosen(quest, slot));
      break;
    }
  }
  const third = input.period === "day" ? (["regularity", "discovery"] as const) : (["regularity"] as const);
  const quest = pickIn(input, third, taken, `${seed}|3`) ?? pickIn(input, third, taken, `${seed}|3`, true);
  if (quest) chosen.push(toChosen(quest, 3));
  return chosen;
}

/**
 * A replacement for an unfinished daily quest: another quest of the same volet, or of any volet when none is left.
 * `todayIds` are the quests already on the day. Null when nothing else is available.
 */
export function pickReroll(input: QuestChoiceInput, current: string, todayIds: readonly string[]): ChosenQuest["questId"] | null {
  const seed = `${input.userId}|reroll|${input.periodStart}|${current}`;
  const volet = questById(current)?.volet;
  const taken = new Set([...todayIds, current]);
  const same = volet ? pickIn(input, [volet], taken, seed) : null;
  const any = same ?? pickIn(input, ["study", "input", "output", "fluency", "regularity", "discovery"], taken, seed);
  return any?.id ?? null;
}
