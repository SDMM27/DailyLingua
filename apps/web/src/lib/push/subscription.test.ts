import { describe, expect, it } from "vitest";
import { isPushServiceHost, pushTestRequestSchema } from "./subscription";

const keys = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" };
const valid = (endpoint: string) => ({ subscription: { endpoint, keys } });

describe("isPushServiceHost", () => {
  it("accepts the push services of the browsers", () => {
    for (const host of ["fcm.googleapis.com", "web.push.apple.com", "updates.push.services.mozilla.com", "wns2-par02p.notify.windows.com", "WEB.PUSH.APPLE.COM"]) {
      expect(isPushServiceHost(host), host).toBe(true);
    }
  });

  it("refuses every other host, look-alikes included", () => {
    for (const host of ["localhost", "127.0.0.1", "169.254.169.254", "example.com", "evilfcm.googleapis.com.example.com", "push.apple.com.evil.test", "notify.windows.com", "xfcm.googleapis.com"]) {
      expect(isPushServiceHost(host), host).toBe(false);
    }
  });
});

describe("pushTestRequestSchema", () => {
  it("accepts a real-looking subscription and drops unknown fields", () => {
    const parsed = pushTestRequestSchema.parse({
      subscription: { endpoint: "https://web.push.apple.com/QGxyz", expirationTime: null, keys, extra: 1 },
      other: true,
    });
    expect(parsed).toEqual({ subscription: { endpoint: "https://web.push.apple.com/QGxyz", keys } });
  });

  it("refuses an endpoint that is not an https push service address", () => {
    for (const endpoint of [
      "http://web.push.apple.com/x",
      "https://internal.example.com/x",
      "https://user:pass@web.push.apple.com/x",
      "https://web.push.apple.com:8443/x",
      "https://127.0.0.1/x",
      "javascript:alert(1)",
      "not a url",
      "",
      `https://web.push.apple.com/${"a".repeat(2100)}`,
    ]) {
      expect(pushTestRequestSchema.safeParse(valid(endpoint)).success, endpoint.slice(0, 40)).toBe(false);
    }
  });

  it("refuses missing or malformed keys and a missing subscription", () => {
    const endpoint = "https://web.push.apple.com/x";
    expect(pushTestRequestSchema.safeParse({}).success).toBe(false);
    expect(pushTestRequestSchema.safeParse({ subscription: { endpoint } }).success).toBe(false);
    expect(pushTestRequestSchema.safeParse({ subscription: { endpoint, keys: { p256dh: "a b", auth: "x" } } }).success).toBe(false);
    expect(pushTestRequestSchema.safeParse({ subscription: { endpoint, keys: { p256dh: "x".repeat(300), auth: "x" } } }).success).toBe(false);
    expect(pushTestRequestSchema.safeParse(null).success).toBe(false);
  });
});
