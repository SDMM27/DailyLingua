import {
  QUEST_CATALOG_VERSION, QUEST_USAGE_REASONS, addDays, chooseQuests, diffInDays, immersionCloseThrough, learningDay, periodRange, questById, questProgress,
  questsToSettle, resolveGameSettings, weekStart, type QuestChoiceInput, type QuestLine, type QuestPeriod,
} from "@dailylingua/core";
import {
  closeImmersionDays, completeQuest, getFirstXpDay, getGameContext, insertQuestAssignments, listQuestAssignments, listQuestLedgerLines, listUsedReasons,
  type AppClient, type QuestAssignmentRow,
} from "@dailylingua/data";
import { gameSettingsSchema } from "@dailylingua/schemas";

/** How many days of the ledger the lazy computation reads: the 14 days of the volet shares, and every open period. */
const HISTORY_DAYS = 14;
/** Quests are settled while their period still touches the days the journal accepts (server day - 3). */
const SETTLE_DAYS = 3;

export interface QuestView {
  /** Id of the `quest_assignment` row (what the reroll sends). */
  id: string;
  questId: string;
  progress: number;
  target: number;
  done: boolean;
}

export interface QuestOverview {
  day: QuestView[];
  week: QuestView[];
  /** The reroll of the day is still unused. */
  canReroll: boolean;
}

/** What `refreshGameState` found: the quests to show (null when the switch is off) and the immersion days it closed. */
export interface RefreshResult {
  quests: QuestOverview | null;
  closedImmersionDays: number;
}

/** The facts of the quest choice that do not depend on the period: the usage of oral functions and the age of the account. */
export async function choiceBase(service: AppClient, userId: string, today: string): Promise<Pick<QuestChoiceInput, "userId" | "usedReasons" | "accountAgeDays">> {
  const [firstXpDay, usedReasons] = await Promise.all([
    getFirstXpDay(service, userId),
    listUsedReasons(service, userId, QUEST_USAGE_REASONS, addDays(today, -30)),
  ]);
  return { userId, usedReasons, accountAgeDays: firstXpDay === null ? null : diffInDays(firstXpDay, today) };
}

const view = (row: QuestAssignmentRow, lines: readonly QuestLine[]): QuestView => {
  const quest = questById(row.questId);
  const progress = row.completedAt !== null ? row.target : quest ? questProgress({ measure: quest.measure, target: row.target }, lines, periodRange(row.period, row.periodStart)) : 0;
  return { id: row.id, questId: row.questId, progress, target: row.target, done: row.completedAt !== null };
};

/**
 * The lazy computation of the lot 1 mechanics for one learner (`j7-social.md`, common principles), idempotent:
 * closes the immersion days that are due, then, when the quests switch is on, creates the missing quests of the day and
 * the week and settles those whose target is reached. Service client; the caller has authenticated `userId`.
 * An error is the caller's to log (after an ingestion it never fails the ingestion).
 */
export async function refreshGameState(service: AppClient, userId: string, now: Date): Promise<RefreshResult> {
  const context = await getGameContext(service, userId);
  if (!context) return { quests: null, closedImmersionDays: 0 };
  const settings = resolveGameSettings(gameSettingsSchema.safeParse(context.gameSettings).data);
  const today = learningDay(now, context.timeZone);

  // The function itself writes nothing when the immersion XP switch is off.
  const closedImmersionDays = await closeImmersionDays(service, userId, immersionCloseThrough(today));
  if (!settings.quests.enabled) return { quests: null, closedImmersionDays };

  const monday = weekStart(today);
  const historyFrom = addDays(today, -HISTORY_DAYS);
  const [lines, existing] = await Promise.all([
    listQuestLedgerLines(service, userId, historyFrom, today),
    listQuestAssignments(service, userId, addDays(monday, -7)),
  ]);

  const missing: Record<QuestPeriod, boolean> = {
    day: existing.filter((row) => row.period === "day" && row.periodStart === today).length < 3,
    week: existing.filter((row) => row.period === "week" && row.periodStart === monday).length < 3,
  };
  if (missing.day || missing.week) {
    const base = await choiceBase(service, userId, today);
    const recentQuestIds = existing.filter((row) => row.period === "day" && row.periodStart >= addDays(today, -3) && row.periodStart < today).map((row) => row.questId);
    const fresh = (["day", "week"] as const).flatMap((period) => {
      if (!missing[period]) return [];
      const periodStart = period === "day" ? today : monday;
      const recentLines = lines.filter((line) => line.day < periodStart);
      return chooseQuests({ ...base, period, periodStart, recentLines, recentQuestIds }).map((quest) => ({
        period, periodStart, slot: quest.slot, questId: quest.questId, target: quest.target, catalogVersion: QUEST_CATALOG_VERSION,
      }));
    });
    await insertQuestAssignments(service, userId, fresh);
  }

  let rows = missing.day || missing.week ? await listQuestAssignments(service, userId, addDays(monday, -7)) : existing;
  const settleable = rows.filter((row) => periodRange(row.period, row.periodStart).through >= addDays(today, -SETTLE_DAYS));
  const toSettle = questsToSettle(settleable, lines);
  if (toSettle.length > 0) {
    for (const id of toSettle) await completeQuest(service, id);
    rows = await listQuestAssignments(service, userId, addDays(monday, -7));
  }

  const todays = rows.filter((row) => row.period === "day" && row.periodStart === today);
  return {
    quests: {
      day: todays.map((row) => view(row, lines)),
      week: rows.filter((row) => row.period === "week" && row.periodStart === monday).map((row) => view(row, lines)),
      canReroll: todays.every((row) => row.rerolledFrom === null) && todays.some((row) => row.completedAt === null),
    },
    closedImmersionDays,
  };
}
