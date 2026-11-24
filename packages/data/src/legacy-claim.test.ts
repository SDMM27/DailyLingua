import { describe, expect, it } from "vitest";
import { fakeClient } from "./fake-client";
import { claimLegacyData } from "./legacy-claim";

describe("claimLegacyData", () => {
  it("calls app.claim_legacy_data without any argument (the database acts on auth.uid())", async () => {
    const { client, calls, schemas } = fakeClient({ data: { enrollment: 2 }, error: null });
    expect(await claimLegacyData(client)).toEqual({ skipped: null });
    expect(schemas).toEqual(["app"]);
    expect(calls).toEqual([{ kind: "rpc", name: "claim_legacy_data", args: undefined, chain: [] }]);
  });

  it.each(["guest", "no_legacy", "active", "rate_limited"])("reports the skip reason %s", async (reason) => {
    const { client } = fakeClient({ data: { skipped: reason }, error: null });
    expect(await claimLegacyData(client)).toEqual({ skipped: reason });
  });

  it("does not trust an unknown skip reason or a malformed answer", async () => {
    await expect(claimLegacyData(fakeClient({ data: { skipped: "other" }, error: null }).client)).rejects.toMatchObject({ code: "unknown" });
    await expect(claimLegacyData(fakeClient({ data: null, error: null }).client)).rejects.toMatchObject({ code: "unknown" });
    await expect(claimLegacyData(fakeClient({ data: [1], error: null }).client)).rejects.toMatchObject({ code: "unknown" });
  });

  it("throws a DataError, never the raw message", async () => {
    const { client } = fakeClient({ data: null, error: { code: "28000", message: "not authenticated for user 1234" } });
    const error = await claimLegacyData(client).catch((e: unknown) => e);
    expect(error).toMatchObject({ name: "DataError", code: "unauthenticated", message: "unauthenticated" });
  });
});
