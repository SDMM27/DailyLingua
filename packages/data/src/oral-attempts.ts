import { appSchema, type AppClient } from "./client";
import { fetchAll } from "./query";

/**
 * The learner's recent attempts at the oral workshop (`j5-pr1-atelier-oral.md` §5): the `attempt` rows of step `oral`,
 * written only by `app.ingest_batch`. Read with the learner's own client (RLS): the table is readable by its owner.
 */

export interface OralAttemptRow {
  sentenceId: string;
  /** `anticipation`, `shadowing` or `dictation`. */
  activity: string;
  occurredAt: string;
  correct: boolean;
}

const DAY_MS = 86_400_000;
const ACTIVITY_PREFIX = "oral_";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The attempts of a learner on the sentences of a language over the last `sinceDays` days, newest first. A row whose
 * answer does not name its sentence (nothing the ingestion writes) is left out.
 */
export async function getRecentOralAttempts(client: AppClient, userId: string, language: string, sinceDays = 30, now: Date = new Date()): Promise<OralAttemptRow[]> {
  const since = new Date(now.getTime() - sinceDays * DAY_MS).toISOString();
  const rows = await fetchAll((from, to) =>
    appSchema(client)
      .from("attempt")
      .select("id, exercise_kind, answer, correct, occurred_at")
      .eq("user_id", userId)
      .eq("language", language)
      .eq("step", "oral")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to),
  );
  const out: OralAttemptRow[] = [];
  for (const row of rows) {
    const sentenceId = isRecord(row.answer) ? row.answer.sentenceId : undefined;
    if (typeof sentenceId !== "string" || !row.exercise_kind.startsWith(ACTIVITY_PREFIX)) continue;
    out.push({ sentenceId, activity: row.exercise_kind.slice(ACTIVITY_PREFIX.length), occurredAt: row.occurred_at, correct: row.correct === true });
  }
  return out;
}
