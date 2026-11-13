import { describe, expect, it } from "vitest";
import { codeFromSqlstate, DataError, toDataError } from "./errors";

describe("codeFromSqlstate", () => {
  it.each([
    ["28000", "unauthenticated"],
    ["42501", "unauthenticated"],
    ["PGRST301", "unauthenticated"],
    ["22023", "invalid"],
    ["22P02", "invalid"],
    ["23503", "invalid"],
    ["23514", "conflict"],
    ["23505", "conflict"],
    ["40001", "conflict"],
    ["P0002", "not_found"],
    ["PGRST116", "not_found"],
    ["XX000", "unknown"],
    ["", "unknown"],
  ])("%s -> %s", (sqlstate, code) => {
    expect(codeFromSqlstate(sqlstate)).toBe(code);
  });

  it("is unknown without a code", () => {
    expect(codeFromSqlstate(null)).toBe("unknown");
    expect(codeFromSqlstate(undefined)).toBe("unknown");
  });
});

describe("toDataError", () => {
  it("never carries the raw database message", () => {
    const error = toDataError({ code: "23514", message: 'new row for relation "enrollment" violates check constraint' } as { code: string });
    expect(error).toBeInstanceOf(DataError);
    expect(error.code).toBe("conflict");
    expect(error.sqlstate).toBe("23514");
    expect(error.message).toBe("conflict");
  });

  it("keeps the SQLSTATE for logs and is unknown without one", () => {
    expect(toDataError({}).code).toBe("unknown");
    expect(toDataError({}).sqlstate).toBeNull();
  });
});
