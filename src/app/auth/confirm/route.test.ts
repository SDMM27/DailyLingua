import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const auth = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));
const state = vi.hoisted(() => ({ demo: false }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => (state.demo ? null : { auth }),
}));

const ok = { data: {}, error: null };
const ko = { data: {}, error: { message: "invalid" } };

/** Calls the route and returns where it redirects, relative to the site. */
async function visit(query: string) {
  const response = await GET(new NextRequest(`https://app.example/auth/confirm${query}`));
  expect(response.status).toBe(307);
  const location = new URL(response.headers.get("location") ?? "");
  expect(location.origin).toBe("https://app.example");
  return location.pathname + location.search;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.demo = false;
  auth.verifyOtp.mockResolvedValue(ok);
  auth.exchangeCodeForSession.mockResolvedValue(ok);
});

describe("token_hash", () => {
  it("confirms an address and goes home", async () => {
    expect(await visit("?token_hash=abc&type=email")).toBe("/");
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "abc" });
  });

  it("sends a recovery link to the new password page by default", async () => {
    expect(await visit("?token_hash=abc&type=recovery")).toBe("/nouveau-mot-de-passe");
  });

  it("honours an internal next", async () => {
    expect(await visit("?token_hash=abc&type=recovery&next=/nouveau-mot-de-passe")).toBe("/nouveau-mot-de-passe");
    expect(await visit("?token_hash=abc&type=email&next=/mission")).toBe("/mission");
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com"])("ignores the external next %s", async (next) => {
    expect(await visit(`?token_hash=abc&type=email&next=${encodeURIComponent(next)}`)).toBe("/");
  });

  it("refuses an invalid link", async () => {
    auth.verifyOtp.mockResolvedValue(ko);
    expect(await visit("?token_hash=abc&type=email")).toBe("/connexion?lien=invalide");
  });

  it("asks for a new reset link when a recovery link is invalid", async () => {
    auth.verifyOtp.mockResolvedValue(ko);
    expect(await visit("?token_hash=abc&type=recovery&next=/nouveau-mot-de-passe")).toBe(
      "/mot-de-passe-oublie?lien=invalide",
    );
  });

  it("ignores an unknown type", async () => {
    expect(await visit("?token_hash=abc&type=nope")).toBe("/connexion?lien=invalide");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });
});

describe("code (PKCE)", () => {
  it("exchanges the code and goes to next", async () => {
    expect(await visit("?code=xyz&next=/nouveau-mot-de-passe")).toBe("/nouveau-mot-de-passe");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("xyz");
  });

  it("goes home without next", async () => {
    expect(await visit("?code=xyz")).toBe("/");
  });

  it("tells the user to sign in when the exchange fails (address already confirmed by Supabase)", async () => {
    auth.exchangeCodeForSession.mockResolvedValue(ko);
    expect(await visit("?code=xyz")).toBe("/connexion?lien=confirme");
  });

  it("asks for a new link when a reset exchange fails", async () => {
    auth.exchangeCodeForSession.mockResolvedValue(ko);
    expect(await visit("?code=xyz&next=/nouveau-mot-de-passe")).toBe("/mot-de-passe-oublie?lien=invalide");
  });
});

describe("other cases", () => {
  it("reports an expired link", async () => {
    expect(await visit("?error=access_denied&error_code=otp_expired&code=xyz")).toBe("/connexion?lien=invalide");
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("reports an expired reset link on the reset page", async () => {
    expect(await visit("?error_code=otp_expired&next=/nouveau-mot-de-passe")).toBe("/mot-de-passe-oublie?lien=invalide");
  });

  it("refuses a bare visit", async () => {
    expect(await visit("")).toBe("/connexion?lien=invalide");
  });

  it("refuses everything in the demo", async () => {
    state.demo = true;
    expect(await visit("?token_hash=abc&type=email")).toBe("/connexion?lien=invalide");
    expect(await visit("?code=xyz")).toBe("/connexion?lien=invalide");
  });
});
