import { appSchema, type AppClient } from "./client";
import { fetchAll, inChunks, unwrap, unwrapRows } from "./query";

/**
 * The progress of the beginner path's units (`app.unit_progress`, `app.unit_test`, the `attempt` rows of kind `unit_*`;
 * `j4-pr1-architecture.md` §5 and §6). Written only by `app.ingest_batch`; read here in camelCase.
 */

export interface UnitProgressRow {
  unitId: string;
  language: string;
  version: string;
  /** Validated steps, `<lesson>:<step>` → instant (anything else in the stored object is left out). */
  steps: Record<string, string>;
  bestScore: number | null;
  testAttempts: number;
  passedAt: string | null;
  passedVersion: string | null;
  updatedAt: string;
}

/** An attempt on a unit item, as `planIngest` needs it (the unit, the lesson and the item are in `attempt.answer`). */
export interface UnitAttemptRow {
  unitId: string;
  unitVersion: string;
  lesson: string;
  itemId: string;
  try: number;
  correct: boolean;
  occurredAt: string;
}

const PROGRESS_COLUMNS = "unit_id, language, version, steps, best_score, test_attempts, passed_at, passed_version, updated_at";

type ProgressColumns = {
  unit_id: string;
  language: string;
  version: string;
  steps: unknown;
  best_score: number | null;
  test_attempts: number;
  passed_at: string | null;
  passed_version: string | null;
  updated_at: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export function toUnitProgressRow(row: ProgressColumns): UnitProgressRow {
  const steps: Record<string, string> = {};
  if (isRecord(row.steps)) for (const [key, value] of Object.entries(row.steps)) if (typeof value === "string") steps[key] = value;
  return {
    unitId: row.unit_id,
    language: row.language,
    version: row.version,
    steps,
    bestScore: row.best_score,
    testAttempts: row.test_attempts,
    passedAt: row.passed_at,
    passedVersion: row.passed_version,
    updatedAt: row.updated_at,
  };
}

/** The progress of a learner on the units of a language (the user's client: RLS applies; the user filter is explicit too). */
export async function getUnitProgress(client: AppClient, userId: string, language: string): Promise<UnitProgressRow[]> {
  const rows = unwrapRows(await appSchema(client).from("unit_progress").select(PROGRESS_COLUMNS).eq("user_id", userId).eq("language", language).order("unit_id"));
  return rows.map(toUnitProgressRow);
}

/** The progress of a learner on one unit, or null when the unit was never touched. */
export async function getUnitProgressOne(client: AppClient, userId: string, unitId: string): Promise<UnitProgressRow | null> {
  const row = unwrap(await appSchema(client).from("unit_progress").select(PROGRESS_COLUMNS).eq("user_id", userId).eq("unit_id", unitId).maybeSingle());
  return row ? toUnitProgressRow(row) : null;
}

/** The progress rows of these units for the ingestion (SERVICE client, explicit user). */
export async function readUnitProgressRows(client: AppClient, userId: string, unitIds: readonly string[]): Promise<UnitProgressRow[]> {
  const rows = await inChunks(unitIds, (chunk) => appSchema(client).from("unit_progress").select(PROGRESS_COLUMNS).eq("user_id", userId).in("unit_id", chunk));
  return rows.map(toUnitProgressRow);
}

/** The user's attempts on the items of these units, oldest first (SERVICE client, explicit user); malformed rows are left out. */
export async function readUnitAttempts(client: AppClient, userId: string, unitIds: readonly string[]): Promise<UnitAttemptRow[]> {
  const out: UnitAttemptRow[] = [];
  for (const unitId of unitIds) {
    const rows = await fetchAll(
      (from, to) => appSchema(client).from("attempt").select("id, answer, correct, occurred_at").eq("user_id", userId).like("exercise_kind", "unit\\_%")
        .eq("answer->>unitId", unitId).order("occurred_at").order("id").range(from, to),
    );
    for (const row of rows) {
      const answer = row.answer;
      if (!isRecord(answer)) continue;
      const { unitVersion, lesson, itemId } = answer;
      const tryNo = answer.try;
      if (typeof unitVersion !== "string" || typeof lesson !== "string" || typeof itemId !== "string" || typeof tryNo !== "number") continue;
      out.push({ unitId, unitVersion, lesson, itemId, try: tryNo, correct: row.correct === true, occurredAt: row.occurred_at });
    }
  }
  return out;
}

/** Which of these test attempt ids are already recorded, for any account (SERVICE client): a reused id is refused. */
export async function readKnownUnitTestIds(client: AppClient, attemptIds: readonly string[]): Promise<string[]> {
  const rows = await inChunks(attemptIds, (chunk) => appSchema(client).from("unit_test").select("id").in("id", chunk));
  return rows.map((row) => row.id);
}
