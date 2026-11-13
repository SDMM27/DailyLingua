/** Stable, UI-safe error codes: the interface maps them to messages, never to Postgres text. */
export const dataErrorCodes = ["unauthenticated", "invalid", "conflict", "not_found", "unknown"] as const;
export type DataErrorCode = (typeof dataErrorCodes)[number];

/**
 * Error of the data layer. `message` is the code itself on purpose: the raw message of Postgres or
 * PostgREST can name tables, columns or values and must never reach the interface.
 */
export class DataError extends Error {
  readonly code: DataErrorCode;
  /** SQLSTATE or PostgREST code the error came from, for logs only. */
  readonly sqlstate: string | null;

  constructor(code: DataErrorCode, sqlstate: string | null = null) {
    super(code);
    this.name = "DataError";
    this.code = code;
    this.sqlstate = sqlstate;
  }
}

/** Class of a SQLSTATE (or PostgREST) code. */
export function codeFromSqlstate(sqlstate: string | null | undefined): DataErrorCode {
  if (!sqlstate) return "unknown";
  if (sqlstate === "28000" || sqlstate === "42501" || sqlstate === "PGRST301" || sqlstate === "PGRST302") return "unauthenticated";
  if (sqlstate === "P0002" || sqlstate === "PGRST116") return "not_found";
  // 23514: check violation (native language, duplicate, more than 4 languages, more than 120 minutes a day).
  if (sqlstate === "23505" || sqlstate === "23514" || sqlstate === "40001" || sqlstate === "40P01") return "conflict";
  // Data exception (22xxx), other integrity violations (23xxx: not-null, foreign key).
  if (sqlstate.startsWith("22") || sqlstate.startsWith("23")) return "invalid";
  return "unknown";
}

/** Shape of the error returned by supabase-js (`PostgrestError`), reduced to what is read. */
export interface RawDatabaseError {
  code?: string | null;
}

export function toDataError(error: RawDatabaseError): DataError {
  return new DataError(codeFromSqlstate(error.code), error.code ?? null);
}
