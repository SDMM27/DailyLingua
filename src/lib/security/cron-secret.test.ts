import { describe, expect, it } from "vitest";
import { authorizeCronRequest } from "./cron-secret";

const SECRET = "0123456789abcdef0123456789abcdef";
const env = { CRON_SECRET: SECRET };

describe("authorizeCronRequest", () => {
  it("accepts the configured secret as a bearer token", () => {
    expect(authorizeCronRequest(`Bearer ${SECRET}`, env)).toEqual({ ok: true });
  });

  it("refuses everything when no secret is configured", () => {
    expect(authorizeCronRequest("Bearer ", {})).toMatchObject({ ok: false, status: 503 });
    expect(authorizeCronRequest(`Bearer ${SECRET}`, { CRON_SECRET: "  " })).toMatchObject({ ok: false, status: 503 });
  });

  it("refuses a secret that is too short, even when it matches", () => {
    expect(authorizeCronRequest("Bearer short", { CRON_SECRET: "short" })).toMatchObject({ ok: false, status: 503 });
  });

  it.each([
    ["no header", null],
    ["empty header", ""],
    ["wrong secret", `Bearer ${SECRET.slice(0, -1)}x`],
    ["longer secret", `Bearer ${SECRET}0`],
    ["secret without scheme", SECRET],
    ["other scheme", `Basic ${SECRET}`],
    ["lowercase scheme", `bearer ${SECRET}`],
  ])("refuses a request with %s", (_, header) => {
    expect(authorizeCronRequest(header, env)).toMatchObject({ ok: false, status: 401 });
  });

  it("ignores spaces around the configured secret", () => {
    expect(authorizeCronRequest(`Bearer ${SECRET}`, { CRON_SECRET: ` ${SECRET}\n` })).toEqual({ ok: true });
  });
});
