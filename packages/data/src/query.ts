import { DataError, toDataError, type RawDatabaseError } from "./errors";

/** Rows PostgREST returns at most per request (its default `max-rows`). */
export const PAGE_SIZE = 1000;
/** Ids per `in (...)` filter: keeps the request line short. */
export const IN_CHUNK = 100;

interface Result<T> {
  data: T[] | null;
  error: RawDatabaseError | null;
}

export function unwrap<T>(result: { data: T | null; error: RawDatabaseError | null }): T | null {
  if (result.error) throw toDataError(result.error);
  return result.data;
}

export function unwrapRows<T>(result: Result<T>): T[] {
  if (result.error) throw toDataError(result.error);
  return result.data ?? [];
}

/** The distinct, non-empty strings of `ids`. */
export function distinct(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

export function chunks<T>(items: readonly T[], size = IN_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Runs `query` once per chunk of ids and concatenates the rows (nothing is sent for an empty list). */
export async function inChunks<T>(ids: readonly string[], query: (chunk: string[]) => PromiseLike<Result<T>>): Promise<T[]> {
  const parts = await Promise.all(chunks(distinct(ids)).map(async (chunk) => unwrapRows(await query(chunk))));
  return parts.flat();
}

/**
 * Reads every page of an ordered query. The query must have a deterministic order (the caller orders by a unique
 * key), otherwise pages could overlap.
 */
export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<Result<T>>, maxRows = 100_000): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += PAGE_SIZE) {
    const batch = unwrapRows(await page(from, from + PAGE_SIZE - 1));
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
  throw new DataError("unknown");
}
