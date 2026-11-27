import type { DateKey } from "@dailylingua/schemas";
import { appSchema, type AppClient } from "./client";
import { toDataError } from "./errors";
import { sessionMinutes } from "./immersion";
import { fetchAll, unwrapRows } from "./query";

/** What `badge_award` holds for one badge. */
export interface BadgeAwardRow {
  badgeId: string;
  language: string | null;
  awardedAt: string;
}

/** Facts measured for one language (the shape of `LanguageBadgeFacts` in the core). */
export interface BadgeLanguageFacts {
  language: string;
  knownWords: number;
  skillLevels: Partial<Record<"reading" | "listening" | "writing" | "speaking", number>>;
  textsRead: number;
  textsReadWell: number;
  dictationsHigh: number;
  rewrites: number;
  shadowings: number;
  roleplays: number;
}

/** Estimates proven by an assessment or by practice. A declared, legacy or placement level earns no badge: the placement test is deliberately generous and is taken on day one, so it marks no level crossed. */
const PROVEN_SOURCES = ["assessment", "estimated"];
/** Stability (days) from which a card counts as a known word. */
const KNOWN_STABILITY_DAYS = 21;

/** The badges of the learner, latest first. Works with either client; the user filter is always set. */
export async function listBadgeAwards(client: AppClient, userId: string): Promise<BadgeAwardRow[]> {
  const rows = unwrapRows(await appSchema(client).from("badge_award").select("badge_id, language, awarded_at")
    .eq("user_id", userId).order("awarded_at", { ascending: false }).limit(500));
  return rows.map((row) => ({ badgeId: row.badge_id, language: row.language, awardedAt: row.awarded_at }));
}

/** Records the badges the server decided (`app.award_badges`); the number of new rows. Service client. */
export async function recordBadges(client: AppClient, userId: string, awards: readonly { badgeId: string; language: string | null; meta: Record<string, unknown> }[]): Promise<number> {
  if (awards.length === 0) return 0;
  const { data, error } = await appSchema(client).rpc("award_badges", {
    p_user: userId,
    p_awards: awards.map((award) => ({ badge_id: award.badgeId, language: award.language, meta: award.meta })) as never,
  });
  if (error) throw toDataError(error);
  return data ?? 0;
}

/** The languages the learner is enrolled in (active or not). Service client. */
export async function listEnrolledLanguages(client: AppClient, userId: string): Promise<string[]> {
  const rows = unwrapRows(await appSchema(client).from("enrollment").select("language").eq("user_id", userId));
  return rows.map((row) => row.language);
}

async function countLines(client: AppClient, userId: string, language: string, reasons: string[], amount?: number): Promise<number> {
  let query = appSchema(client).from("xp_ledger").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("language", language).in("reason", reasons);
  if (amount !== undefined) query = query.eq("amount", amount);
  const result = await query;
  if (result.error) throw toDataError(result.error);
  return result.count ?? 0;
}

/** Facts of one language, read only. Works with either client; every read is filtered on the user. */
export async function getBadgeLanguageFacts(client: AppClient, userId: string, language: string): Promise<BadgeLanguageFacts> {
  const db = appSchema(client);
  const [words, estimates, textsRead, textsReadWell, dictationsHigh, rewrites, shadowings, roleplays] = await Promise.all([
    db.from("card").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("language", language)
      .in("kind", ["word", "chunk"]).neq("state", "suspended").gte("stability", KNOWN_STABILITY_DAYS),
    db.from("skill_estimate").select("skill, level_value").eq("user_id", userId).eq("language", language).in("source", PROVEN_SOURCES),
    countLines(client, userId, language, ["reading.understood", "reading.understood_well"]),
    countLines(client, userId, language, ["reading.understood_well"]),
    countLines(client, userId, language, ["dictation.sentence"], 2),
    countLines(client, userId, language, ["rewrite.sentence", "rewrite.sentence_native"]),
    countLines(client, userId, language, ["shadowing.sentence"]),
    countLines(client, userId, language, ["roleplay.completed"]),
  ]);
  if (words.error) throw toDataError(words.error);
  const skillLevels: BadgeLanguageFacts["skillLevels"] = {};
  for (const row of unwrapRows(estimates)) skillLevels[row.skill as keyof BadgeLanguageFacts["skillLevels"]] = Number(row.level_value);
  return { language, knownWords: words.count ?? 0, skillLevels, textsRead, textsReadWell, dictationsHigh, rewrites, shadowings, roleplays };
}

/** Hours of verified practice, all languages: the completed sessions, each capped at 60 minutes. Works with either client. */
export async function getPracticeHours(client: AppClient, userId: string, through?: DateKey): Promise<number> {
  const rows = await fetchAll((from, to) => {
    let query = appSchema(client).from("session").select("id, started_at, completed_at")
      .eq("user_id", userId).eq("status", "completed");
    if (through) query = query.lte("day", through);
    return query.order("id").range(from, to);
  });
  return rows.reduce((sum, row) => sum + sessionMinutes(row.started_at, row.completed_at), 0) / 60;
}
