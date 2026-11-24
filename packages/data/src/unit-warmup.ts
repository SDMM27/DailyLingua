import { appSchema, type AppClient } from "./client";
import { chunks, fetchAll, unwrapRows } from "./query";
import { getUnitProgress } from "./unit-progress";

/**
 * What the learner may redo the day after a failed unit test (`j4-pr2.md` §3), and the XP a unit paid. Read with the
 * learner's own client (RLS): `app.unit_test`, `app.attempt` and `app.xp_ledger` are readable by their owner.
 */

/** A failed submission of a unit test. */
export interface FailedUnitTest {
  id: string;
  unitId: string;
  /** Version of the unit the test was taken on. */
  version: string;
  score: number;
  /** Ids of the items answered wrong, in the unit's own ids. */
  missed: string[];
  createdAt: string;
}

/** The items of a failed test the learner has not answered right since. */
export interface PendingWarmup {
  unitId: string;
  version: string;
  testId: string;
  /** When the server recorded the failed test (the learning day is taken from it). */
  testedAt: string;
  itemIds: string[];
}

const TEST_COLUMNS = "id, unit_id, version, score, missed, created_at";

type TestColumns = { id: string; unit_id: string; version: string; score: number; missed: string[]; created_at: string };

function toFailedTest(row: TestColumns): FailedUnitTest {
  return { id: row.id, unitId: row.unit_id, version: row.version, score: row.score, missed: row.missed, createdAt: row.created_at };
}

/** The last failed test of a learner on a unit, or null when there is none. */
export async function getLastFailedTest(client: AppClient, userId: string, unitId: string): Promise<FailedUnitTest | null> {
  const rows = unwrapRows(
    await appSchema(client).from("unit_test").select(TEST_COLUMNS).eq("user_id", userId).eq("unit_id", unitId).eq("passed", false)
      .order("created_at", { ascending: false }).order("id").limit(1),
  );
  return rows[0] ? toFailedTest(rows[0]) : null;
}

/** The ids of the items of a unit the learner answered right since `since` (an instant). */
async function itemsRightSince(client: AppClient, userId: string, unitId: string, since: string): Promise<Set<string>> {
  const rows = await fetchAll(
    (from, to) => appSchema(client).from("attempt").select("id, answer").eq("user_id", userId).like("exercise_kind", "unit\\_%")
      .eq("answer->>unitId", unitId).eq("correct", true).gte("occurred_at", since).order("id").range(from, to),
  );
  const right = new Set<string>();
  for (const row of rows) {
    const answer = row.answer;
    if (typeof answer === "object" && answer !== null && !Array.isArray(answer) && typeof (answer as Record<string, unknown>).itemId === "string") {
      right.add((answer as Record<string, string>).itemId as string);
    }
  }
  return right;
}

/**
 * The warm-ups of a language: for each unit not passed whose last test was failed, the missed items not answered right
 * since that test. An answer counts when it happened after the server recorded the test, so an answer queued offline
 * behind the test may still list the item (it is shown once more, never lost). Units without a missed item left are
 * not listed. The caller decides from which learning day they are offered.
 */
export async function getPendingWarmups(client: AppClient, userId: string, language: string): Promise<PendingWarmup[]> {
  const [progress, failed] = await Promise.all([
    getUnitProgress(client, userId, language),
    fetchAll((from, to) =>
      appSchema(client).from("unit_test").select(TEST_COLUMNS).eq("user_id", userId).like("unit_id", `${language}-%`).eq("passed", false)
        .order("created_at", { ascending: false }).order("id").range(from, to)),
  ]);
  const passed = new Set(progress.filter((row) => row.passedAt !== null).map((row) => row.unitId));
  // Newest first: the first row met for a unit is its last failed test.
  const last = new Map<string, FailedUnitTest>();
  for (const row of failed) if (!passed.has(row.unit_id) && !last.has(row.unit_id)) last.set(row.unit_id, toFailedTest(row));

  const out: PendingWarmup[] = [];
  for (const test of last.values()) {
    if (test.missed.length === 0) continue;
    const right = await itemsRightSince(client, userId, test.unitId, test.createdAt);
    const itemIds = test.missed.filter((id) => !right.has(id));
    if (itemIds.length > 0) out.push({ unitId: test.unitId, version: test.version, testId: test.id, testedAt: test.createdAt, itemIds });
  }
  return out.sort((a, b) => a.unitId.localeCompare(b.unitId));
}

/**
 * The XP a learner earned in a unit: the `focus.*` ledger lines whose source is an attempt on an item of this unit
 * (the test's `unit.complete` bonus is not an attempt line and is not counted).
 */
export async function getUnitXp(client: AppClient, userId: string, unitId: string): Promise<number> {
  const attempts = await fetchAll(
    (from, to) => appSchema(client).from("attempt").select("id").eq("user_id", userId).like("exercise_kind", "unit\\_%")
      .eq("answer->>unitId", unitId).order("id").range(from, to),
  );
  const parts = await Promise.all(chunks(attempts.map((row) => row.id)).map(async (ids) =>
    unwrapRows(await appSchema(client).from("xp_ledger").select("amount").eq("user_id", userId).like("reason", "focus.%").in("attempt_id", ids))));
  return parts.flat().reduce((sum, row) => sum + row.amount, 0);
}
