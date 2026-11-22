import { z } from "zod";

/** The accepted browser services and endpoint syntax of app.is_allowed_push_endpoint. */
export const reminderEndpointSchema = z.string().max(1000).refine((endpoint) => {
  if (!/^https:\/\/[a-z0-9.-]+(?::443)?\/[^\s\\#]*$/.test(endpoint)) return false;
  const url = URL.parse(endpoint);
  if (!url) return false;
  return url.hostname === "fcm.googleapis.com" || url.hostname === "web.push.apple.com"
    || url.hostname === "updates.push.services.mozilla.com"
    || /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname);
});

export const reminderSubscriptionSchema = z.object({
  endpoint: reminderEndpointSchema,
  keys: z.object({
    p256dh: z.string().regex(/^B[A-Za-z0-9_-]{86}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  }),
});
