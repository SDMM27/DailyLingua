import { z } from "zod";

/**
 * The push services of the browsers we target. The server sends a request to the address the caller
 * gives it, so that address must be one of these (never an internal host, never plain http).
 * `*.example` matches any subdomain of `example`.
 */
export const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com", // Chrome, Edge, Android
  "web.push.apple.com", // Safari, iOS and iPadOS (the web push service)
  "*.push.apple.com",
  "updates.push.services.mozilla.com", // Firefox
  "*.push.services.mozilla.com",
  "*.notify.windows.com", // Edge on Windows
] as const;

export function isPushServiceHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return PUSH_SERVICE_HOSTS.some((allowed) =>
    allowed.startsWith("*.") ? host.endsWith(allowed.slice(1)) && host.length > allowed.length - 1 : host === allowed,
  );
}

const base64Url = /^[A-Za-z0-9_-]+={0,2}$/;

/** `PushSubscription.toJSON()`, as sent by the browser; anything beyond these fields is dropped. */
export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .max(2048)
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && url.port === "" && url.username === "" && url.password === "" && isPushServiceHost(url.hostname);
      } catch {
        return false;
      }
    }),
  keys: z.object({
    p256dh: z.string().min(1).max(256).regex(base64Url),
    auth: z.string().min(1).max(128).regex(base64Url),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

/** The body of a request to /lab/push-test: the subscription to send to, and nothing else. */
export const pushTestRequestSchema = z.object({ subscription: pushSubscriptionSchema });
