import { createReminderStore } from "@dailylingua/data";
import { WebPushError, sendNotification } from "web-push";
import { vapidConfig } from "@/lib/push/env";
import { acceptsCronSecret, sendDueReminders } from "@/lib/push/reminder-job";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export const maxDuration = 60;

const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (!acceptsCronSecret(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers });
  }
  const vapid = vapidConfig(new URL(request.url).origin);
  if (!vapid) return Response.json({ error: "push_disabled" }, { status: 503, headers });

  const now = new Date();
  const deadline = now.getTime() + 42_000;
  try {
    const counts = await sendDueReminders({
      store: createReminderStore(getSupabaseServiceClient()), now,
      canContinue: () => Date.now() < deadline,
      async send(subscription, body) {
        try {
          // web-push uses node:https directly and treats all 3xx responses as failures.
          await sendNotification(subscription, body, { vapidDetails: vapid, TTL: 1_800, timeout: 8_000 });
          return "sent";
        } catch (error) {
          if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) return "expired";
          return "failed";
        }
      },
    });
    return Response.json(counts, { headers });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}
