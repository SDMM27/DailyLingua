import { describe, expect, it } from "vitest";
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "./headers";

const byKey = Object.fromEntries(SECURITY_HEADERS.map(({ key, value }) => [key, value]));

describe("SECURITY_HEADERS", () => {
  it("sets the expected headers once each", () => {
    expect(SECURITY_HEADERS).toHaveLength(Object.keys(byKey).length);
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Permissions-Policy"]).toBe("camera=(), microphone=(), geolocation=(), browsing-topics=()");
    expect(byKey["Content-Security-Policy"]).toBe(CONTENT_SECURITY_POLICY);
  });

  it("has a CSP that cannot break the inline scripts of Next", () => {
    expect(CONTENT_SECURITY_POLICY).not.toContain("script-src");
    expect(CONTENT_SECURITY_POLICY).not.toContain("default-src");
    for (const directive of ["frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"]) {
      expect(CONTENT_SECURITY_POLICY).toContain(directive);
    }
  });

  it("does not block the browser sign-in of the guest trial (Supabase) nor Turnstile", () => {
    for (const directive of ["connect-src", "frame-src", "child-src"]) {
      expect(CONTENT_SECURITY_POLICY).not.toContain(directive);
    }
  });

  it("does not set HSTS (done by Vercel)", () => {
    expect(byKey["Strict-Transport-Security"]).toBeUndefined();
  });
});
