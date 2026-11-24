import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();
const claimLegacyData = vi.fn();
const client = { auth: { verifyOtp, exchangeCodeForSession } };

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => client }));
vi.mock("@dailylingua/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@dailylingua/data")>()),
  claimLegacyData: (c: unknown) => claimLegacyData(c),
}));

const { GET } = await import("./route");

const get = (query: string) => GET(new NextRequest(`https://app.example/auth/confirm?${query}`));
const location = (response: Response) => new URL(response.headers.get("location") ?? "").pathname + new URL(response.headers.get("location") ?? "").search;

beforeEach(() => {
  vi.clearAllMocks();
  claimLegacyData.mockResolvedValue({ skipped: null });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("GET /auth/confirm", () => {
  it("claims the data of the old app after a verified token, then goes to the next page", async () => {
    verifyOtp.mockResolvedValue({ error: null });
    const response = await get("token_hash=h&type=signup&next=/settings");
    expect(claimLegacyData).toHaveBeenCalledWith(client);
    expect(location(response)).toBe("/settings");
  });

  it("claims it after a code exchange too", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await get("code=c");
    expect(claimLegacyData).toHaveBeenCalledWith(client);
    expect(location(response)).toBe("/");
  });

  it("does not claim anything when the link fails", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    expect(location(await get("token_hash=h&type=signup"))).toBe("/sign-in?link=invalid");
    exchangeCodeForSession.mockResolvedValue({ error: { message: "no verifier" } });
    expect(location(await get("code=c"))).toBe("/sign-in?link=confirmed");
    expect(claimLegacyData).not.toHaveBeenCalled();
  });

  it("never lets a failed claim change the redirect", async () => {
    verifyOtp.mockResolvedValue({ error: null });
    claimLegacyData.mockRejectedValueOnce(new Error("database down"));
    expect(location(await get("token_hash=h&type=magiclink"))).toBe("/");
    exchangeCodeForSession.mockResolvedValue({ error: null });
    claimLegacyData.mockRejectedValueOnce(new Error("database down"));
    expect(location(await get("code=c&next=/settings"))).toBe("/settings");
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});
