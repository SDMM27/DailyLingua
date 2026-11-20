"use server";

import { configureReminder, deletePushSubscription } from "@dailylingua/data";
import { timeOfDaySchema } from "@dailylingua/schemas";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { vapidPublicKey } from "@/lib/push/env";
import { reminderEndpointSchema, reminderSubscriptionSchema } from "@/lib/push/reminder-subscription";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const settingsSchema = z.strictObject({
  userId: z.uuid(), enabled: z.boolean(), time: timeOfDaySchema, weeklySummary: z.boolean(),
  endpoint: reminderEndpointSchema.optional(), subscription: reminderSubscriptionSchema.optional(),
});

export async function saveReminderSettings(input: unknown): Promise<boolean> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return false;
  const settings = parsed.data;
  try {
    const client = await createSupabaseServerClient();
    const { data } = await client.auth.getUser();
    if (data.user?.id !== settings.userId || (settings.enabled && !vapidPublicKey())) return false;
    await configureReminder(client, {
      p_enabled: settings.enabled, p_time: settings.time, p_weekly_summary: settings.weeklySummary,
      p_endpoint: settings.subscription?.endpoint ?? settings.endpoint,
      p_p256dh: settings.subscription?.keys.p256dh, p_auth: settings.subscription?.keys.auth,
      p_user_agent: (await headers()).get("user-agent")?.slice(0, 300),
      p_reset: Boolean(settings.subscription),
    });
    revalidatePath("/settings");
    return true;
  } catch {
    return false;
  }
}

export async function detachReminderDevice(userId: string, endpoint: string): Promise<void> {
  if (!reminderEndpointSchema.safeParse(endpoint).success) return;
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (data.user?.id === userId) await deletePushSubscription(client, endpoint);
}
