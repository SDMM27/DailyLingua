import { getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";
import { WebPushError, sendNotification } from "web-push";
import { vapidConfig } from "@/lib/push/env";
import { pushTestRequestSchema } from "@/lib/push/subscription";
import { getSessionUser } from "@/lib/session";

/** A subscription is a few hundred bytes: anything much larger is not one. */
const MAX_BODY_BYTES = 4096;

const noStore = { "Cache-Control": "no-store" };
const json = (body: Record<string, unknown>, status: number) => NextResponse.json(body, { status, headers: noStore });

/**
 * Prototype route of /lab: sends one trial notification to the subscription the caller provides, and
 * to no other. Signed-in users only; does nothing without the VAPID keys. The subscription is used for
 * this request and is neither stored nor logged. Every answer is `Cache-Control: no-store`.
 */
export async function POST(request: Request) {
  if (!(await getSessionUser())) return json({ error: "unauthenticated" }, 401);

  const vapid = vapidConfig(new URL(request.url).origin);
  if (!vapid) return json({ error: "push_disabled" }, 503);

  // Only a script of this site sends JSON: a form posted from elsewhere cannot.
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "invalid_subscription" }, 415);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return json({ error: "invalid_subscription" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid_subscription" }, 400);
  }
  const parsed = pushTestRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_subscription" }, 400);

  const t = await getTranslations("lab.push.test");
  try {
    await sendNotification(parsed.data.subscription, JSON.stringify({ title: t("title"), body: t("body"), url: "/lab" }), {
      vapidDetails: vapid,
      TTL: 60,
      urgency: "high",
      timeout: 10_000,
    });
    return json({ status: "sent" }, 200);
  } catch (error) {
    if (error instanceof WebPushError) {
      // 404 and 410: the browser dropped the subscription.
      if (error.statusCode === 404 || error.statusCode === 410) return json({ error: "subscription_gone" }, 410);
      return json({ error: "push_service_error", status: error.statusCode }, 502);
    }
    return json({ error: "push_service_unreachable" }, 502);
  }
}
