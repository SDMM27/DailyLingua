import type { DateKey } from "@dailylingua/schemas";
import { appSchema, type AppClient } from "./client";
import { toDataError } from "./errors";
import { fetchAll, unwrapRows } from "./query";

/** A row of `quest_assignment`, camelCase. */
export interface QuestAssignmentRow {
  id: string;
  period: "day" | "week";
  periodStart: DateKey;
  slot: number;
  questId: string;
  target: number;
  catalogVersion: string;
  rerolledFrom: string | null;
  completedAt: string | null;
}

export interface NewQuestAssignment {
  period: "day" | "week";
  periodStart: DateKey;
  slot: number;
  questId: string;
  target: number;
  catalogVersion: string;
}

/** A line of the XP ledger as the quests read it. */
export interface QuestLedgerLine {
  reason: string;
  day: DateKey;
  amount: number;
}

const COLUMNS = "id, period, period_start, slot, quest_id, target, catalog_version, rerolled_from, completed_at";
const toRow = (row: {
  id: string; period: string; period_start: string; slot: number; quest_id: string; target: number;
  catalog_version: string; rerolled_from: string | null; completed_at: string | null;
}): QuestAssignmentRow => ({
  id: row.id, period: row.period as "day" | "week", periodStart: row.period_start, slot: row.slot, questId: row.quest_id,
  target: row.target, catalogVersion: row.catalog_version, rerolledFrom: row.rerolled_from, completedAt: row.completed_at,
});

/** The learner's quests that start on or after `from`, oldest first. Reading works with either client; the user filter is always set. */
export async function listQuestAssignments(client: AppClient, userId: string, from: DateKey): Promise<QuestAssignmentRow[]> {
  const rows = unwrapRows(await appSchema(client).from("quest_assignment").select(COLUMNS)
    .eq("user_id", userId).gte("period_start", from).order("period_start").order("slot").limit(200));
  return rows.map(toRow);
}

/** Creates the missing quests; a quest already there for a (period, start, slot) is left alone. Service client. */
export async function insertQuestAssignments(client: AppClient, userId: string, quests: readonly NewQuestAssignment[]): Promise<void> {
  if (quests.length === 0) return;
  const { error } = await appSchema(client).from("quest_assignment").upsert(
    quests.map((q) => ({
      user_id: userId, period: q.period, period_start: q.periodStart, slot: q.slot, quest_id: q.questId,
      target: q.target, catalog_version: q.catalogVersion,
    })),
    { onConflict: "user_id,period,period_start,slot", ignoreDuplicates: true },
  );
  if (error) throw toDataError(error);
}

/** The XP lines of the learner from `from` to `through`. Service client (reads only the three columns). */
export async function listQuestLedgerLines(client: AppClient, userId: string, from: DateKey, through: DateKey): Promise<QuestLedgerLine[]> {
  const rows = await fetchAll((start, end) => appSchema(client).from("xp_ledger").select("id, reason, day, amount")
    .eq("user_id", userId).gte("day", from).lte("day", through).order("id").range(start, end));
  return rows.map((row) => ({ reason: row.reason, day: row.day, amount: row.amount }));
}

/** Which of `reasons` have at least one line of the learner from `from` on. Service client. */
export async function listUsedReasons(client: AppClient, userId: string, reasons: readonly string[], from: DateKey): Promise<string[]> {
  const found = new Set<string>();
  for (const reason of reasons) {
    const rows = unwrapRows(await appSchema(client).from("xp_ledger").select("id")
      .eq("user_id", userId).eq("reason", reason).gte("day", from).limit(1));
    if (rows.length > 0) found.add(reason);
  }
  return [...found];
}

/** Day of the learner's first XP line, or null. Service client. */
export async function getFirstXpDay(client: AppClient, userId: string): Promise<DateKey | null> {
  const rows = unwrapRows(await appSchema(client).from("xp_ledger").select("day").eq("user_id", userId).order("day").limit(1));
  return rows[0]?.day ?? null;
}

/** Marks a quest done and credits it (`app.complete_quest`); true when this call credited it. Service client. */
export async function completeQuest(client: AppClient, assignmentId: string): Promise<boolean> {
  const { data, error } = await appSchema(client).rpc("complete_quest", { p_assignment: assignmentId });
  if (error) throw toDataError(error);
  return data === true;
}

/** Replaces an unfinished daily quest (`app.reroll_quest`); false when it was refused. Service client. */
export async function rerollQuest(client: AppClient, userId: string, assignmentId: string, questId: string, target: number, catalogVersion: string): Promise<boolean> {
  const { data, error } = await appSchema(client).rpc("reroll_quest", {
    p_user: userId, p_assignment: assignmentId, p_quest_id: questId, p_target: target, p_catalog: catalogVersion,
  });
  if (error) throw toDataError(error);
  return data === true;
}

/** Closes the immersion days up to `through` and credits their XP (`app.close_immersion_days`); the number of days closed. Service client. */
export async function closeImmersionDays(client: AppClient, userId: string, through: DateKey): Promise<number> {
  const { data, error } = await appSchema(client).rpc("close_immersion_days", { p_user: userId, p_through: through });
  if (error) throw toDataError(error);
  return data ?? 0;
}

/** The closed immersion days from `from` to `through`, with their XP. */
export async function listImmersionClosed(client: AppClient, userId: string, from: DateKey, through: DateKey): Promise<{ day: DateKey; minutes: number; xp: number }[]> {
  const rows = unwrapRows(await appSchema(client).from("immersion_close").select("day, minutes, xp")
    .eq("user_id", userId).gte("day", from).lte("day", through).order("day"));
  return rows.map((row) => ({ day: row.day, minutes: row.minutes, xp: row.xp }));
}

/** Whether a day is in `immersion_close` for the learner (closed whatever the time zone says). Service client. */
export async function isImmersionDayRecorded(client: AppClient, userId: string, day: DateKey): Promise<boolean> {
  const rows = unwrapRows(await appSchema(client).from("immersion_close").select("day").eq("user_id", userId).eq("day", day).limit(1));
  return rows.length > 0;
}

/** Time zone and stored game settings of a learner, or null without a profile. Service client, filtered on the user. */
export async function getGameContext(client: AppClient, userId: string): Promise<{ timeZone: string; gameSettings: unknown } | null> {
  const rows = unwrapRows(await appSchema(client).from("profile").select("time_zone, game_settings").eq("user_id", userId).limit(1));
  const row = rows[0];
  return row ? { timeZone: row.time_zone, gameSettings: row.game_settings } : null;
}
