import type { DateKey, StoredSessionPlan } from "@dailylingua/schemas";
import { appSchema, type AppClient } from "./client";
import { DataError } from "./errors";
import { toCardRow, toSessionRow, readItems, type CardRow, type ItemRow, type SessionRow } from "./ingest-rows";
import { distinct, fetchAll, unwrap, unwrapRows } from "./query";

/**
 * Reads and the one write of `GET /api/session/today` (`j2-pr1-lot-w.md` section 3). Same rules as `ingest-rows`:
 * a SERVICE client and an explicit `userId`. Nothing here decides anything (the plan is `planDay` of core, called by
 * the app); these functions return typed rows and write the session once.
 */

const SESSION_COLUMNS = "id, user_id, language, day, kind, format, status, served_at, started_at, completed_at, plan";
const CARD_COLUMNS = "id, user_id, language, kind, state, stability, difficulty, due_at, last_review_at, reps, lapses, front, back, back_language, context, payload";

/** The session of the day: the `daily` one, else the `review_only` one, else null (a `catch_up` session is not it). */
export async function readSessionOfDay(client: AppClient, userId: string, language: string, day: DateKey): Promise<SessionRow | null> {
  const rows = unwrapRows(
    await appSchema(client).from("session").select(SESSION_COLUMNS).eq("user_id", userId).eq("language", language).eq("day", day).in("kind", ["daily", "review_only"]),
  );
  const pick = rows.find((row) => row.kind === "daily") ?? rows.find((row) => row.kind === "review_only");
  return pick ? toSessionRow(pick) : null;
}

/** Cards of the language that are not deleted (the plan picks the due and new ones). */
export async function readPlanningCards(client: AppClient, userId: string, language: string): Promise<CardRow[]> {
  const rows = await fetchAll((from, to) =>
    appSchema(client).from("card").select(CARD_COLUMNS).eq("user_id", userId).eq("language", language).is("deleted_at", null).order("id").range(from, to),
  );
  return rows.map((row) => toCardRow(row));
}

/** Reviews of the user since `since` (an instant): the caller keeps the ones of the day before. */
export async function readRecentReviews(client: AppClient, userId: string, since: string): Promise<{ cardId: string; rating: number; reviewedAt: string }[]> {
  const rows = await fetchAll((from, to) =>
    appSchema(client).from("review_log").select("id, card_id, rating, reviewed_at").eq("user_id", userId).gte("reviewed_at", since).order("id").range(from, to),
  );
  return rows.map((row) => ({ cardId: row.card_id, rating: row.rating, reviewedAt: row.reviewed_at }));
}

/** Day of the learner's last session in the language that was begun (a session only planned does not count as practice). */
export async function readLastSessionDay(client: AppClient, userId: string, language: string): Promise<DateKey | null> {
  const rows = unwrapRows(
    await appSchema(client).from("session").select("day").eq("user_id", userId).eq("language", language).in("status", ["started", "completed"]).order("day", { ascending: false }).limit(1),
  );
  return rows[0]?.day ?? null;
}

/**
 * `newCardsSuspendedThrough` of the most recent resumption session of the language, among the last five sessions (a
 * resumption suspends new cards for two days only), or null.
 */
export async function readSuspendedThrough(client: AppClient, userId: string, language: string): Promise<DateKey | null> {
  const rows = unwrapRows(
    await appSchema(client).from("session").select("plan").eq("user_id", userId).eq("language", language).order("day", { ascending: false }).limit(5),
  );
  for (const row of rows) {
    const plan = row.plan as { resumption?: unknown; newCardsSuspendedThrough?: unknown } | null;
    if (plan?.resumption === true && typeof plan.newCardsSuspendedThrough === "string") return plan.newCardsSuspendedThrough;
  }
  return null;
}

/** Number of `daily` sessions of format 10 the learner completed in the language (parity decides the alternation). */
export async function countCompletedShortSessions(client: AppClient, userId: string, language: string): Promise<number> {
  const { count, error } = await appSchema(client)
    .from("session")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("language", language)
    .eq("format", 10)
    .eq("kind", "daily")
    .eq("status", "completed");
  if (error) throw new DataError("unknown", error.code ?? null);
  return count ?? 0;
}

export interface TextCandidate {
  id: string;
  density: number;
  createdAt: string;
}

/**
 * Published texts of the language and of the level bands that have a writing task, that the learner has not read and
 * that no session of theirs already holds. Light rows: the caller picks one and reads it with `readTextWithItems`.
 */
export async function readTextCandidates(client: AppClient, userId: string, language: string, levelBands: readonly string[]): Promise<TextCandidate[]> {
  const db = appSchema(client);
  const [texts, reads, sessions] = await Promise.all([
    fetchAll((from, to) =>
      db.from("text").select("id, density, created_at").eq("language", language).eq("status", "published").in("level_band", [...levelBands]).not("writing_task", "is", null).order("id").range(from, to),
    ),
    fetchAll((from, to) => db.from("text_read").select("text_id").eq("user_id", userId).order("text_id").range(from, to)),
    fetchAll((from, to) => db.from("session").select("id, plan").eq("user_id", userId).eq("language", language).order("id").range(from, to)),
  ]);
  const taken = new Set<string>(reads.map((row) => row.text_id));
  for (const session of sessions) {
    const reading = (session.plan as { reading?: { textId?: unknown } } | null)?.reading;
    if (typeof reading?.textId === "string") taken.add(reading.textId);
  }
  return texts.filter((text) => !taken.has(text.id)).map((text) => ({ id: text.id, density: text.density, createdAt: text.created_at }));
}

export interface PacketTextRow {
  id: string;
  language: string;
  levelBand: string;
  density: number;
  theme: string;
  title: string;
  body: string;
  wordCount: number;
  newWords: unknown;
  grammarPoint: string | null;
  listeningSegment: unknown;
  writingTask: string | null;
}

/** A published text with ALL its items and their keys (the packet serves keys, `j2-architecture.md` A1). */
export async function readTextWithItems(client: AppClient, textId: string): Promise<{ text: PacketTextRow; items: ItemRow[] } | null> {
  const db = appSchema(client);
  const found = await db
    .from("text")
    .select("id, language, level_band, density, theme, title, body, word_count, new_words, grammar_point, listening_segment, writing_task, status")
    .eq("id", textId)
    .maybeSingle();
  const text = unwrap(found);
  if (!text || text.status !== "published") return null;
  const itemIds = unwrapRows(await db.from("text_item").select("id").eq("text_id", textId)).map((row) => row.id);
  const items = await readItems(client, itemIds);
  return {
    text: {
      id: text.id,
      language: text.language,
      levelBand: text.level_band,
      density: text.density,
      theme: text.theme,
      title: text.title,
      body: text.body,
      wordCount: text.word_count,
      newWords: text.new_words,
      grammarPoint: text.grammar_point,
      listeningSegment: text.listening_segment,
      writingTask: text.writing_task,
    },
    items,
  };
}

/** Units of each quota kind the learner used on a learning day. */
export async function readQuotaUsage(client: AppClient, userId: string, day: DateKey, kinds: readonly string[]): Promise<Record<string, number>> {
  const rows = unwrapRows(await appSchema(client).from("quota_usage").select("kind, used").eq("user_id", userId).eq("day", day).in("kind", distinct(kinds)));
  const usage: Record<string, number> = {};
  for (const kind of kinds) usage[kind] = 0;
  for (const row of rows) usage[row.kind] = row.used;
  return usage;
}

export interface NewSession {
  /** Chosen by the caller (the options of the packet are drawn from it); a lost race keeps the winner's. */
  id: string;
  userId: string;
  language: string;
  day: DateKey;
  kind: "daily" | "review_only";
  format: 10 | 15 | 20 | 30;
  plan: StoredSessionPlan;
  /** Instant the packet is served at. */
  servedAt: string;
}

/**
 * Writes the session of the day once. `insert ... on conflict (user_id, language, day, kind) do nothing`, then the row
 * is read again: when two requests race, both get the same row, the winner's (the loser's plan is dropped, the caller
 * builds the packet from the row returned, never from its own plan).
 */
export async function insertSession(client: AppClient, session: NewSession): Promise<SessionRow> {
  const db = appSchema(client);
  const { error } = await db.from("session").upsert(
    {
      id: session.id,
      user_id: session.userId,
      language: session.language,
      day: session.day,
      kind: session.kind,
      format: session.format,
      plan: session.plan as never,
      served_at: session.servedAt,
    },
    { onConflict: "user_id,language,day,kind", ignoreDuplicates: true },
  );
  if (error) throw new DataError("unknown", error.code ?? null);
  const row = unwrap(
    await db.from("session").select(SESSION_COLUMNS).eq("user_id", session.userId).eq("language", session.language).eq("day", session.day).eq("kind", session.kind).maybeSingle(),
  );
  if (!row) throw new DataError("unknown");
  return toSessionRow(row);
}
