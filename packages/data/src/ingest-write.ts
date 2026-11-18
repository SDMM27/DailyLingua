import { appSchema, type AppClient } from "./client";
import type { Json } from "./database.app.types";
import { DataError, toDataError } from "./errors";

/**
 * How `app.ingest_batch` failed, in the terms the caller decides on (`j2-pr1-lot-w.md`, D9): `stale` (40001: the
 * state moved, read it again), `busy` (55P03: the user's lock was not obtained), `refused` (every class 22 "data
 * exception" and class 23 "integrity constraint violation" code, and 42501: SQL refuses this content for good),
 * `unavailable` (anything else, the network included: a passing failure).
 * The SQL message is kept for the server log only; it never goes into a response.
 */
export type IngestBatchErrorCode = "stale" | "busy" | "refused" | "unavailable";

export class IngestBatchError extends Error {
  readonly code: IngestBatchErrorCode;
  readonly sqlstate: string | null;

  constructor(code: IngestBatchErrorCode, sqlstate: string | null, message: string) {
    super(message);
    this.name = "IngestBatchError";
    this.code = code;
    this.sqlstate = sqlstate;
  }
}

export function ingestErrorCode(sqlstate: string | null | undefined): IngestBatchErrorCode {
  if (sqlstate === "40001") return "stale";
  if (sqlstate === "55P03") return "busy";
  if (sqlstate && (sqlstate.startsWith("22") || sqlstate.startsWith("23") || sqlstate === "42501")) return "refused";
  return "unavailable";
}

export interface IngestBatchResult {
  seq: number;
  /** `client_event_id` SQL ignored because the row was already there with the same content. */
  duplicates: string[];
}

/** Calls `app.ingest_batch` for `userId` (the service role only): one transaction, one lock, optimistic `seq`. */
export async function callIngestBatch(client: AppClient, userId: string, expectedSeq: number, payload: unknown): Promise<IngestBatchResult> {
  const { data, error } = await appSchema(client).rpc("ingest_batch", {
    p_user_id: userId,
    p_expected_seq: expectedSeq,
    p_payload: payload as Json,
  });
  if (error) throw new IngestBatchError(ingestErrorCode(error.code), error.code ?? null, error.message ?? "");
  const result = data as { seq?: unknown; duplicates?: unknown } | null;
  if (!result || typeof result.seq !== "number" || !Array.isArray(result.duplicates)) throw new IngestBatchError("unavailable", null, "unexpected ingest_batch result");
  return { seq: result.seq, duplicates: result.duplicates.filter((id): id is string => typeof id === "string") };
}

/** Takes `count` events of the user's hourly allowance (`limit`): true when granted, false when it would be exceeded. */
export async function claimEventRate(client: AppClient, userId: string, count: number, limit: number): Promise<boolean> {
  const { data, error } = await appSchema(client).rpc("claim_event_rate", { p_user_id: userId, p_count: count, p_limit: limit });
  if (error) throw toDataError(error);
  if (typeof data !== "boolean") throw new DataError("unknown");
  return data;
}
