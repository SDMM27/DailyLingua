import { DataError, type AppClient } from "@dailylingua/data";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const claimLegacyData = vi.fn();

vi.mock("@dailylingua/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@dailylingua/data")>()),
  claimLegacyData: (client: unknown) => claimLegacyData(client),
}));

const { claimLegacyDataQuietly } = await import("./claim-legacy");

const client = {} as AppClient;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("claimLegacyDataQuietly", () => {
  it("claims with the client it is given and logs nothing on success", async () => {
    claimLegacyData.mockResolvedValue({ skipped: null });
    await claimLegacyDataQuietly(client);
    expect(claimLegacyData).toHaveBeenCalledWith(client);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("swallows a failure and logs the error code only", async () => {
    claimLegacyData.mockRejectedValue(new DataError("unknown", "XX000"));
    await expect(claimLegacyDataQuietly(client)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("claimLegacyData failed (unknown XX000)");
  });

  it("swallows any other error without logging its message", async () => {
    claimLegacyData.mockRejectedValue(new Error("secret@example.test"));
    await expect(claimLegacyDataQuietly(client)).resolves.toBeUndefined();
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).not.toContain("secret@example.test");
  });
});
