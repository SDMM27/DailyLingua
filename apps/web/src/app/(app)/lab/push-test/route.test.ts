import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const sendNotification = vi.fn();

vi.mock("@/lib/session", () => ({ getSessionUser: () => getSessionUser() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("web-push", () => {
  class WebPushError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return { WebPushError, sendNotification: (...args: unknown[]) => sendNotification(...args) };
});

const { POST } = await import("./route");
const { WebPushError } = await import("web-push");

/** The mocked class takes (message, status); the real one has three more parameters. */
const pushError = (status: number) => new (WebPushError as unknown as new (message: string, status: number) => Error)("push", status);

const subscription = {
  endpoint: "https://web.push.apple.com/QGxyz",
  keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" },
};

function post(body: unknown, headers: Record<string, string> = { "content-type": "application/json" }) {
  return POST(new Request("https://app.example/lab/push-test", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  getSessionUser.mockResolvedValue({ id: "u" });
  sendNotification.mockResolvedValue({ statusCode: 201 });
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
  vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
  vi.stubEnv("VAPID_SUBJECT", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /lab/push-test", () => {
  it("refuses a signed-out visitor before anything else", async () => {
    getSessionUser.mockResolvedValue(null);
    expect((await post({ subscription })).status).toBe(401);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("does nothing without the private key", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    const response = await post({ subscription });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "push_disabled" });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("does nothing without the public key either", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    expect((await post({ subscription })).status).toBe(503);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("validates its input", async () => {
    expect((await post("{not json")).status).toBe(400);
    expect((await post({ subscription: { ...subscription, endpoint: "https://evil.test/x" } })).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect((await post({ subscription }, { "content-type": "text/plain" })).status).toBe(415);
    expect((await post({ subscription, padding: "x".repeat(5000) })).status).toBe(413);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("sends one notification, to the subscription given and no other", async () => {
    const response = await post({ subscription: { ...subscription, expirationTime: null }, to: "someone-else" });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(sendNotification).toHaveBeenCalledTimes(1);
    const [sentTo, payload, options] = sendNotification.mock.calls[0] as [unknown, string, { vapidDetails: Record<string, string> }];
    expect(sentTo).toEqual(subscription);
    expect(JSON.parse(payload)).toEqual({ title: "title", body: "body", url: "/lab" });
    expect(options.vapidDetails).toEqual({ publicKey: "public-key", privateKey: "private-key", subject: "https://app.example" });
  });

  it("reports a subscription the push service dropped, and a push service failure", async () => {
    sendNotification.mockRejectedValueOnce(pushError(410));
    expect((await post({ subscription })).status).toBe(410);
    sendNotification.mockRejectedValueOnce(pushError(403));
    const failed = await post({ subscription });
    expect(failed.status).toBe(502);
    expect(await failed.json()).toEqual({ error: "push_service_error", status: 403 });
    sendNotification.mockRejectedValueOnce(new Error("socket hang up"));
    expect((await post({ subscription })).status).toBe(502);
  });
});
