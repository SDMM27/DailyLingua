/**
 * Security headers sent on every response (see next.config.ts).
 * HSTS is left out on purpose: Vercel already adds it on its domains.
 * The CSP has no `script-src`: a nonce-based policy would force dynamic rendering of every page.
 * It has no `connect-src` / `frame-src` either: the guest trial signs in from the browser to Supabase
 * and may show Cloudflare Turnstile (script and iframe from https://challenges.cloudflare.com).
 * Adding any of these directives (or `default-src`) means allowing those origins.
 */
export const CONTENT_SECURITY_POLICY = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

export const SECURITY_HEADERS: readonly { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
];
