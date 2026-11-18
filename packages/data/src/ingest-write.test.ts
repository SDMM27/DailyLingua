import { describe, expect, it } from "vitest";
import { DataError } from "./errors";
import { fakeClient } from "./fake-client";
import { callIngestBatch, claimEventRate, IngestBatchError, ingestErrorCode } from "./ingest-write";

const USER = "11111111-1111-4111-8111-111111111111";

describe("ingestErrorCode", () => {
  it("classes the SQLSTATE the way the caller decides on", () => {
    expect(ingestErrorCode("40001")).toBe("stale");
    expect(ingestErrorCode("55P03")).toBe("busy");
    for (const code of ["22023", "23503", "23505", "23514"]) expect(ingestErrorCode(code)).toBe("refused");
    for (const code of ["42501", "XX000", "PGRST301", "", null, undefined]) expect(ingestErrorCode(code)).toBe("unavailable");
  });
});

describe("callIngestBatch", () => {
  it("calls ingest_batch with the user, the expected sequence and the payload, and reads the result", async () => {
    const { client, calls, schemas } = fakeClient({ data: { seq: 5, duplicates: [USER, 3] }, error: null });
    const result = await callIngestBatch(client, USER, 4, { sessions: [] });
    expect(result).toEqual({ seq: 5, duplicates: [USER] });
    expect(schemas).toEqual(["app"]);
    expect(calls).toEqual([{ kind: "rpc", name: "ingest_batch", args: { p_user_id: USER, p_expected_seq: 4, p_payload: { sessions: [] } }, chain: [] }]);
  });

  it.each([
    ["40001", "stale"],
    ["55P03", "busy"],
    ["22023", "refused"],
    ["23503", "refused"],
    ["23505", "refused"],
    ["23514", "refused"],
    ["57014", "unavailable"],
  ])("maps SQLSTATE %s to %s and keeps the SQL message for the log", async (sqlstate, code) => {
    const { client } = fakeClient({ data: null, error: { code: sqlstate, message: "events: client_event_id already used" } });
    const error = await callIngestBatch(client, USER, 0, {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(IngestBatchError);
    expect((error as IngestBatchError).code).toBe(code);
    expect((error as IngestBatchError).sqlstate).toBe(sqlstate);
    expect((error as IngestBatchError).message).toContain("client_event_id");
  });

  it("treats an error without a code (network) and an unexpected result as passing failures", async () => {
    const network = await callIngestBatch(fakeClient({ data: null, error: { message: "fetch failed" } }).client, USER, 0, {}).catch((e: unknown) => e);
    expect((network as IngestBatchError).code).toBe("unavailable");
    const odd = await callIngestBatch(fakeClient({ data: { seq: "5" }, error: null }).client, USER, 0, {}).catch((e: unknown) => e);
    expect((odd as IngestBatchError).code).toBe("unavailable");
  });
});

describe("claimEventRate", () => {
  it("returns the boolean of claim_event_rate", async () => {
    const granted = fakeClient({ data: true, error: null });
    expect(await claimEventRate(granted.client, USER, 12, 600)).toBe(true);
    expect(granted.calls[0]).toEqual({ kind: "rpc", name: "claim_event_rate", args: { p_user_id: USER, p_count: 12, p_limit: 600 }, chain: [] });
    expect(await claimEventRate(fakeClient({ data: false, error: null }).client, USER, 12, 600)).toBe(false);
  });

  it("raises a DataError on an error or an odd result", async () => {
    await expect(claimEventRate(fakeClient({ data: null, error: { code: "22023" } }).client, USER, 0, 600)).rejects.toBeInstanceOf(DataError);
    await expect(claimEventRate(fakeClient({ data: "yes", error: null }).client, USER, 1, 600)).rejects.toBeInstanceOf(DataError);
  });
});
