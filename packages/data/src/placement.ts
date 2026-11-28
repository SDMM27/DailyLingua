import type { CefrLevel, PlacementConfidence } from "@dailylingua/schemas";
import { appSchema, type AppClient } from "./client";
import { toDataError } from "./errors";
import { unwrap } from "./query";

/** A finished placement test, as the server computed it (the estimate comes from the replay, never from the client). */
export interface PlacementResultInput {
  language: string;
  startLevel: CefrLevel;
  estimatedLevel: CefrLevel;
  confidence: PlacementConfidence;
  /** The level the learner keeps: the estimate or the one they picked instead. */
  chosenLevel: CefrLevel;
  answers: { itemId: string; choice: number | null; correct: boolean }[];
  bankVersion: string;
  /** Instant of the test, ISO 8601. */
  takenAt: string;
  /** What the test tells about reading, on the 0 to 7 scale: the level the learner kept, and how unsure the test is of it. */
  reading: { levelValue: number; uncertainty: number };
}

/**
 * Records a finished placement test of the learner: their reading estimate (`source = 'placement'`), then a
 * `assessment_result` row of kind `placement`. The payload is the shape `placement:calibrate` reads (`status`,
 * `bank_version`, `answers`, with the other fields of the legacy test row); `levels` follows the legacy rows too.
 * The estimate comes first: a failure between the two writes leaves no result to count twice when the learner retries.
 * Service client, always filtered on the user.
 */
export async function recordPlacementResult(client: AppClient, userId: string, input: PlacementResultInput): Promise<void> {
  const db = appSchema(client);
  const { error: estimateError } = await db.from("skill_estimate").upsert(
    {
      user_id: userId, language: input.language, skill: "reading", level_value: input.reading.levelValue,
      uncertainty: input.reading.uncertainty, source: "placement",
    },
    { onConflict: "user_id,language,skill" },
  );
  if (estimateError) throw toDataError(estimateError);
  const { error } = await db.from("assessment_result").insert({
    user_id: userId,
    language: input.language,
    kind: "placement",
    taken_at: input.takenAt,
    levels: { reception: input.chosenLevel, estimated: input.estimatedLevel, start: input.startLevel },
    payload: {
      status: "completed",
      bank_version: input.bankVersion,
      start_level: input.startLevel,
      estimated_level: input.estimatedLevel,
      confidence: input.confidence,
      chosen_level: input.chosenLevel,
      answers: input.answers,
    },
  });
  if (error) throw toDataError(error);
}

/** Whether the learner has a finished placement test of the language taken on this version of the bank. Authenticated client. */
export async function hasPlacementOnVersion(client: AppClient, userId: string, language: string, bankVersion: string): Promise<boolean> {
  const row = unwrap(await appSchema(client).from("assessment_result").select("id")
    .eq("user_id", userId).eq("language", language).eq("kind", "placement")
    .eq("payload->>status", "completed").eq("payload->>bank_version", bankVersion)
    .limit(1).maybeSingle());
  return row !== null;
}
