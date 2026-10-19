import { describe, expect, it } from "vitest";
import { guestSignInErrorMessage } from "./guest-sign-in-error";

describe("guestSignInErrorMessage", () => {
  it("reports the per-connection rate limit", () => {
    expect(guestSignInErrorMessage({ status: 429 })).toBe("Trop d’essais depuis cette connexion, réessaie plus tard.");
    expect(guestSignInErrorMessage({ code: "over_request_rate_limit" })).toMatch(/Trop d’essais/);
  });

  it("reports a failed captcha", () => {
    expect(guestSignInErrorMessage({ status: 400, code: "captcha_failed" })).toMatch(/anti-robot/);
  });

  it("falls back to a generic message", () => {
    expect(guestSignInErrorMessage({ status: 500 })).toBe("L’essai sans compte n’est pas disponible pour le moment.");
    expect(guestSignInErrorMessage({ status: 422, code: "anonymous_provider_disabled" })).toMatch(/pas disponible/);
  });
});
