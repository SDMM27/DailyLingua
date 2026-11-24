import { DataError, type AppClient } from "@dailylingua/data";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const claimLegacyData = vi.fn();

vi.mock("@dailylingua/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@dailylingua/data")>()),
  claimLegacyData: (client: unknown) => claimLegacyData(client),
}));

const { claimLegacyDataQuietly, legacyCopyIsStale, refreshLegacyDataIfStale } = await import("./claim-legacy");

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

const NOW = new Date("2026-11-25T12:00:00Z");
const profile = (over: Partial<{ isGuest: boolean; appActiveSince: string | null; legacyMigratedAt: string | null }> = {}) => ({
  isGuest: false,
  appActiveSince: null,
  legacyMigratedAt: "2026-11-25T11:30:00Z",
  ...over,
});

describe("legacyCopyIsStale", () => {
  it("is stale when never resynchronised or older than an hour", () => {
    expect(legacyCopyIsStale(profile({ legacyMigratedAt: null }), NOW)).toBe(true);
    expect(legacyCopyIsStale(profile({ legacyMigratedAt: "2026-11-25T10:59:00Z" }), NOW)).toBe(true);
  });

  it("is fresh within the hour", () => {
    expect(legacyCopyIsStale(profile(), NOW)).toBe(false);
  });

  it("is never stale once the user has written in the new app, nor for a guest", () => {
    expect(legacyCopyIsStale(profile({ appActiveSince: "2026-11-24T10:00:00Z", legacyMigratedAt: null }), NOW)).toBe(false);
    expect(legacyCopyIsStale(profile({ isGuest: true, legacyMigratedAt: null }), NOW)).toBe(false);
  });
});

describe("refreshLegacyDataIfStale", () => {
  it("claims once when stale and says so", async () => {
    claimLegacyData.mockResolvedValue({ skipped: null });
    expect(await refreshLegacyDataIfStale(client, profile({ legacyMigratedAt: null }), NOW)).toBe(true);
    expect(claimLegacyData).toHaveBeenCalledTimes(1);
  });

  it("does nothing when fresh or active", async () => {
    expect(await refreshLegacyDataIfStale(client, profile(), NOW)).toBe(false);
    expect(await refreshLegacyDataIfStale(client, profile({ appActiveSince: "2026-11-24T10:00:00Z" }), NOW)).toBe(false);
    expect(claimLegacyData).not.toHaveBeenCalled();
  });

  it("never throws when the claim fails", async () => {
    claimLegacyData.mockRejectedValue(new DataError("unknown"));
    await expect(refreshLegacyDataIfStale(client, profile({ legacyMigratedAt: null }), NOW)).resolves.toBe(true);
  });
});
