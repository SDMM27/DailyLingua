import type { DateKey, ImmersionEntryInput, ImmersionKind } from "@dailylingua/schemas";
import { appSchema, type AppClient } from "./client";
import { toDataError } from "./errors";
import { unwrap, unwrapRows } from "./query";

/** Entries a list returns at most (50 a day at most, a window is a week). */
const LIST_LIMIT = 60;
/** A session counts for at most this many minutes in the app: a tab left open is not learning time. */
const SESSION_CAP_MINUTES = 60;

export interface ImmersionEntry {
  id: string;
  language: string;
  day: DateKey;
  minutes: number;
  kind: ImmersionKind;
}

const COLUMNS = "id, language, day, minutes, kind";
const toEntry = (row: { id: string; language: string; day: string; minutes: number; kind: string }): ImmersionEntry =>
  ({ id: row.id, language: row.language, day: row.day, minutes: row.minutes, kind: row.kind as ImmersionKind });

/** The learner's entries from `from` to `through` (inclusive), latest day first, optionally for one language. Authenticated client. */
export async function listImmersion(client: AppClient, userId: string, from: DateKey, through: DateKey, language?: string): Promise<ImmersionEntry[]> {
  let query = appSchema(client).from("immersion_entry").select(COLUMNS)
    .eq("user_id", userId).gte("day", from).lte("day", through);
  if (language !== undefined) query = query.eq("language", language);
  const rows = unwrapRows(await query.order("day", { ascending: false }).order("created_at", { ascending: false }).limit(LIST_LIMIT));
  return rows.map(toEntry);
}

/** One entry of the learner, or null. Service client, always filtered on the user. */
export async function getImmersion(client: AppClient, userId: string, id: string): Promise<ImmersionEntry | null> {
  const row = unwrap(await appSchema(client).from("immersion_entry").select(COLUMNS)
    .eq("id", id).eq("user_id", userId).maybeSingle());
  return row ? toEntry(row) : null;
}

/** How many entries the learner declared for a day (all languages). Service client. */
export async function countImmersionOnDay(client: AppClient, userId: string, day: DateKey): Promise<number> {
  const result = await appSchema(client).from("immersion_entry").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("day", day);
  unwrap({ data: true, error: result.error });
  return result.count ?? 0;
}

/** Service client: the id of the new entry. */
export async function createImmersion(client: AppClient, userId: string, input: ImmersionEntryInput): Promise<string> {
  const { data, error } = await appSchema(client).from("immersion_entry")
    .insert({ user_id: userId, language: input.language, day: input.day, minutes: input.minutes, kind: input.kind })
    .select("id").single();
  if (error) throw toDataError(error);
  return data.id;
}

/** Service client: false when the entry does not belong to the learner. */
export async function updateImmersion(client: AppClient, userId: string, id: string, input: ImmersionEntryInput): Promise<boolean> {
  const row = unwrap(await appSchema(client).from("immersion_entry")
    .update({ language: input.language, day: input.day, minutes: input.minutes, kind: input.kind, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", userId).select("id").maybeSingle());
  return row !== null;
}

/** Service client: false when the entry does not belong to the learner. */
export async function deleteImmersion(client: AppClient, userId: string, id: string): Promise<boolean> {
  const row = unwrap(await appSchema(client).from("immersion_entry").delete()
    .eq("id", id).eq("user_id", userId).select("id").maybeSingle());
  return row !== null;
}

/** Minutes of a completed session: its duration, capped; 0 when a bound is missing or the order is wrong. */
export function sessionMinutes(startedAt: string | null, completedAt: string | null): number {
  if (!startedAt || !completedAt) return 0;
  const ms = Date.parse(completedAt) - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(SESSION_CAP_MINUTES, Math.round(ms / 60_000));
}

/**
 * The learning time of one language over a window: minutes in the app (completed sessions) and minutes the
 * learner declared, kept apart, with the declared entries. Authenticated client.
 */
export async function getImmersionOverview(client: AppClient, userId: string, language: string, from: DateKey, through: DateKey) {
  const [sessions, entries] = await Promise.all([
    appSchema(client).from("session").select("started_at, completed_at")
      .eq("user_id", userId).eq("language", language).eq("status", "completed")
      .gte("day", from).lte("day", through),
    listImmersion(client, userId, from, through, language),
  ]);
  return {
    appMinutes: unwrapRows(sessions).reduce((sum, row) => sum + sessionMinutes(row.started_at, row.completed_at), 0),
    declaredMinutes: entries.reduce((sum, entry) => sum + entry.minutes, 0),
    entries,
  };
}
