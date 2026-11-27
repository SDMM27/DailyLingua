import {
  MAX_ROLEPLAY_TURNS, ROLEPLAY_ABANDON_AFTER_MS, cefrLevelSchema, objectivesMetSchema, roleplayReviewSchema, roleplayStatusSchema, roleplayTurnSchema,
  type CefrLevel, type ObjectivesMet, type RoleplayReview, type RoleplayStatus, type RoleplayTurn,
} from "@dailylingua/schemas";
import { z } from "zod";
import { appSchema, type AppClient } from "./client";
import { DataError } from "./errors";
import type { Json } from "./database.app.types";
import { inChunks, unwrap, unwrapRows } from "./query";

/**
 * The games of the role play (`app.roleplay`, `j5-pr3-jeu-de-role.md` §4). Every function takes a SERVICE client and an
 * explicit `userId` taken from the authenticated session, never from a request body, and filters on it: a game of
 * another account is never read, updated or counted.
 */

export interface RoleplayRow {
  id: string;
  userId: string;
  language: string;
  scenarioId: string;
  level: CefrLevel;
  status: RoleplayStatus;
  turns: RoleplayTurn[];
  objectivesMet: ObjectivesMet;
  review: RoleplayReview | null;
  createdAt: string;
  finishedAt: string | null;
}

const COLUMNS = "id, user_id, language, scenario_id, level, status, turns, objectives_met, review, created_at, finished_at";

type Columns = {
  id: string; user_id: string; language: string; scenario_id: string; level: string; status: string; turns: unknown;
  objectives_met: boolean[]; review: unknown; created_at: string; finished_at: string | null;
};

const NO_OBJECTIVE: ObjectivesMet = [false, false, false];

/** A row with a status or a level this code does not recognise (written by hand) is left out. */
function toRow(row: Columns): RoleplayRow | null {
  const status = roleplayStatusSchema.safeParse(row.status);
  const level = cefrLevelSchema.safeParse(row.level);
  if (!status.success || !level.success) return null;
  const turns = z.array(roleplayTurnSchema).safeParse(row.turns);
  const objectives = objectivesMetSchema.safeParse(row.objectives_met);
  const review = row.review === null ? null : roleplayReviewSchema.safeParse(row.review);
  return {
    id: row.id,
    userId: row.user_id,
    language: row.language,
    scenarioId: row.scenario_id,
    level: level.data,
    status: status.data,
    turns: turns.success ? turns.data : [],
    objectivesMet: objectives.success ? objectives.data : NO_OBJECTIVE,
    review: review?.success ? review.data : null,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

/** Turns the learner has played in the game. */
export const learnerTurnsOf = (turns: readonly RoleplayTurn[]): number => turns.filter((turn) => turn.role === "learner").length;

/** Learner turns still allowed in the game: 0 once it is not active, has 8 turns, or has its 3 objectives. */
export const turnsLeftOf = (row: Pick<RoleplayRow, "turns" | "objectivesMet" | "status">): number =>
  row.status !== "active" || row.objectivesMet.every(Boolean) ? 0 : Math.max(0, MAX_ROLEPLAY_TURNS - learnerTurnsOf(row.turns));

export interface RoleplayLearner {
  nativeLanguage: string;
  timeZone: string;
  /** The learner studies this language (active enrollment). */
  enrolled: boolean;
  skillEstimates: { skill: string; levelValue: number }[];
}

export function createRoleplayStore(client: AppClient) {
  const db = appSchema(client);

  /** An `active` game older than 24 h becomes `abandoned`; the filters keep it to this learner's stale games. */
  async function abandonStale(userId: string, now: Date): Promise<void> {
    unwrap(await db.from("roleplay").update({ status: "abandoned" })
      .eq("user_id", userId).eq("status", "active").lt("created_at", new Date(now.getTime() - ROLEPLAY_ABANDON_AFTER_MS).toISOString()));
  }

  return {
    async readLearner(userId: string, language: string): Promise<RoleplayLearner | null> {
      const [profile, enrollment, skills] = await Promise.all([
        db.from("profile").select("native_language, time_zone").eq("user_id", userId).maybeSingle(),
        db.from("enrollment").select("language").eq("user_id", userId).eq("language", language).eq("active", true).maybeSingle(),
        db.from("skill_estimate").select("skill, level_value").eq("user_id", userId).eq("language", language),
      ]);
      const profileRow = unwrap(profile);
      if (!profileRow) return null;
      return {
        nativeLanguage: profileRow.native_language,
        timeZone: profileRow.time_zone,
        enrolled: unwrap(enrollment) !== null,
        skillEstimates: unwrapRows(skills).map((row) => ({ skill: row.skill, levelValue: Number(row.level_value) })),
      };
    },

    /** The game in progress, after turning the stale ones `abandoned`. */
    async readActive(userId: string, now: Date): Promise<RoleplayRow | null> {
      await abandonStale(userId, now);
      const row = unwrap(await db.from("roleplay").select(COLUMNS).eq("user_id", userId).eq("status", "active").maybeSingle());
      return row ? toRow(row) : null;
    },

    async read(userId: string, id: string, now: Date): Promise<RoleplayRow | null> {
      await abandonStale(userId, now);
      const row = unwrap(await db.from("roleplay").select(COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle());
      return row ? toRow(row) : null;
    },

    /** The learner's games created at or after `since`, newest first. */
    async listSince(userId: string, since: Date): Promise<RoleplayRow[]> {
      const rows = unwrapRows(await db.from("roleplay").select(COLUMNS).eq("user_id", userId)
        .gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(20));
      return rows.flatMap((row) => toRow(row) ?? []);
    },

    async readXp(userId: string, gameId: string): Promise<number> {
      const [row] = unwrapRows(await db.from("xp_ledger").select("amount")
        .eq("user_id", userId).eq("reason", "roleplay.completed").in("meta->>ref", [gameId]).limit(1));
      return row?.amount ?? 0;
    },

    /** Creates the game; `null` when the account already has an active one (the partial unique index). */
    async create(input: { userId: string; language: string; scenarioId: string; level: CefrLevel; turns: RoleplayTurn[] }): Promise<RoleplayRow | null> {
      const result = await db.from("roleplay").insert({
        user_id: input.userId, language: input.language, scenario_id: input.scenarioId, level: input.level, turns: input.turns satisfies Json,
      }).select(COLUMNS).single();
      if (result.error?.code === "23505") return null;
      const row = unwrap(result);
      const parsed = row ? toRow(row) : null;
      if (!parsed) throw new DataError("unknown");
      return parsed;
    },

    /** Replaces the turns and the objectives of an `active` game of this learner; `null` when it is not one. */
    async saveTurns(input: { userId: string; id: string; previousTurns: RoleplayTurn[]; turns: RoleplayTurn[]; objectivesMet: ObjectivesMet }): Promise<RoleplayRow | null> {
      const row = unwrap(await db.from("roleplay").update({ turns: input.turns satisfies Json, objectives_met: [...input.objectivesMet] })
        .eq("id", input.id).eq("user_id", input.userId).eq("status", "active").eq("turns", JSON.stringify(input.previousTurns))
        .select(COLUMNS).maybeSingle());
      return row ? toRow(row) : null;
    },

    /** Closes an `active` game of this learner as `finished` with its review; `null` when it is not active any more. */
    async finish(input: { userId: string; id: string; previousTurns: RoleplayTurn[]; review: RoleplayReview; objectivesMet: ObjectivesMet; now: Date }): Promise<RoleplayRow | null> {
      const row = unwrap(await db.from("roleplay").update({
        status: "finished", review: input.review satisfies Json, objectives_met: [...input.objectivesMet], finished_at: input.now.toISOString(),
      }).eq("id", input.id).eq("user_id", input.userId).eq("status", "active").eq("turns", JSON.stringify(input.previousTurns))
        .select(COLUMNS).maybeSingle());
      return row ? toRow(row) : null;
    },

    /** A game left without a single learner turn is abandoned (nothing to review, nothing to pay). */
    async abandon(userId: string, id: string, now: Date, previousTurns: RoleplayTurn[]): Promise<RoleplayRow | null> {
      const row = unwrap(await db.from("roleplay").update({ status: "abandoned", finished_at: now.toISOString() })
        .eq("id", id).eq("user_id", userId).eq("status", "active").eq("turns", JSON.stringify(previousTurns))
        .select(COLUMNS).maybeSingle());
      return row ? toRow(row) : null;
    },
  };
}

export type RoleplayStore = ReturnType<typeof createRoleplayStore>;

export interface IngestRoleplayRow {
  id: string;
  language: string;
  level: string;
  status: RoleplayStatus;
  /** The learner's turns, as stored. */
  learnerTurns: string[];
  detectedLanguage: string | null;
  /** `roleplay.completed` was already earned for this game. */
  paid: boolean;
}

/**
 * The games a batch of `roleplay_completed` events names, for `planIngest`: only this learner's (a foreign or unknown id
 * is absent, hence refused), with the proof the server holds and whether the XP was already paid.
 */
export async function readIngestRoleplays(client: AppClient, userId: string, ids: readonly string[]): Promise<IngestRoleplayRow[]> {
  if (ids.length === 0) return [];
  const db = appSchema(client);
  const [games, paid] = await Promise.all([
    inChunks(ids, (chunk) => db.from("roleplay").select(COLUMNS).eq("user_id", userId).in("id", chunk)),
    inChunks(ids, (chunk) => db.from("xp_ledger").select("meta").eq("user_id", userId).eq("reason", "roleplay.completed").in("meta->>ref", chunk)),
  ]);
  const paidIds = new Set(paid.flatMap(({ meta }) => (typeof meta === "object" && meta !== null && !Array.isArray(meta) && typeof meta.ref === "string" ? [meta.ref] : [])));
  return games.flatMap((game) => {
    const row = toRow(game);
    if (!row) return [];
    return [{
      id: row.id,
      language: row.language,
      level: row.level,
      status: row.status,
      learnerTurns: row.turns.flatMap((turn) => (turn.role === "learner" ? [turn.text] : [])),
      detectedLanguage: row.review?.detectedLanguage ?? null,
      paid: paidIds.has(row.id),
    }];
  });
}
