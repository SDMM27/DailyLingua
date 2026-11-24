import { DataError } from "@dailylingua/data";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const sendFeedback = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser } }) }));
vi.mock("@dailylingua/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@dailylingua/data")>()),
  sendFeedback: (...args: unknown[]) => sendFeedback(...args),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  },
}));

const { sendFeedbackAction } = await import("./feedback");

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  getUser.mockResolvedValue({ data: { user: { id: "u" } } });
  sendFeedback.mockResolvedValue(undefined);
});

describe("sendFeedbackAction", () => {
  it("sends the trimmed message with the page and the version of the deployment", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "9a754ef0123456789");
    const state = await sendFeedbackAction({ attempt: 0 }, form({ category: "bug", message: "  Ça plante  ", page: "/settings" }));
    expect(state).toEqual({ attempt: 1, sent: true });
    expect(sendFeedback).toHaveBeenCalledWith(expect.anything(), { category: "bug", message: "Ça plante", page: "/settings", appVersion: "9a754ef" });
  });

  it("uses `local` outside Vercel and drops a page that is not an internal path", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    await sendFeedbackAction({ attempt: 0 }, form({ category: "idee", message: "abc", page: "https://evil.example" }));
    expect(sendFeedback).toHaveBeenCalledWith(expect.anything(), { category: "idee", message: "abc", page: undefined, appVersion: "local" });
  });

  it("refuses an unknown category and a message that is too short or too long, without calling the database", async () => {
    for (const values of [
      { category: "autre-chose", message: "abc" },
      { category: "bug", message: " a " },
      { category: "bug", message: "x".repeat(2001) },
    ]) {
      const state = await sendFeedbackAction({ attempt: 4 }, form(values));
      expect(state).toMatchObject({ attempt: 5, error: "invalid", category: values.category });
    }
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it("sends a signed-out visitor to the sign-in page", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(sendFeedbackAction({ attempt: 0 }, form({ category: "bug", message: "abc" }))).rejects.toThrow("NEXT_REDIRECT /sign-in");
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it("reports the rate limit as too many requests and keeps the typed message", async () => {
    sendFeedback.mockRejectedValue(new DataError("rate_limited", "DL429"));
    const state = await sendFeedbackAction({ attempt: 0 }, form({ category: "bug", message: "vingt et unième" }));
    expect(state).toEqual({ attempt: 1, error: "tooManyRequests", category: "bug", message: "vingt et unième" });
  });

  it("reports any other failure as generic", async () => {
    sendFeedback.mockRejectedValue(new Error("boom"));
    expect(await sendFeedbackAction({ attempt: 0 }, form({ category: "bug", message: "abc" }))).toMatchObject({ error: "generic" });
  });
});
