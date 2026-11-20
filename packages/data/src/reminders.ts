import { appSchema, type AppClient, type AppDatabase } from "./client";
import { unwrap, unwrapRows } from "./query";

type Functions = AppDatabase["app"]["Functions"];
export type Reminder = Functions["reminders_due"]["Returns"][number];
export type ClaimedReminder = Functions["claim_reminder"]["Returns"][number];

export async function configureReminder(client: AppClient, args: Functions["configure_reminder"]["Args"]) {
  unwrap(await appSchema(client).rpc("configure_reminder", args));
}

export async function markReminderOpened(client: AppClient, logId: number) {
  unwrap(await appSchema(client).rpc("mark_reminder_opened", { p_log_id: logId }));
}

export async function deletePushSubscription(client: AppClient, endpoint: string) {
  return unwrap(await appSchema(client).rpc("delete_push_subscription", { p_endpoint: endpoint }));
}

export function createReminderStore(client: AppClient) {
  const db = appSchema(client);
  return {
    async due(at: string, after?: string) {
      return unwrapRows(await db.rpc("reminders_due", { p_at: at, p_after: after }));
    },
    async claim(reminder: Reminder, at: string) {
      const rows = unwrapRows(await db.rpc("claim_reminder", {
        p_user_id: reminder.user_id, p_day: reminder.day, p_at: at,
        p_template: reminder.template, p_mode: reminder.delivery_mode,
      }));
      return rows[0] ?? null;
    },
    async finish(userId: string, claim: ClaimedReminder, status: "sent" | "expired" | "failed", at: string) {
      const subscription = db.from("push_subscription");
      if (status === "expired") {
        unwrap(await subscription.delete().eq("user_id", userId).eq("id", claim.subscription_id)
          .eq("p256dh", claim.p256dh).eq("auth", claim.auth));
      }
      if (status === "sent") {
        unwrap(await subscription.update({ last_success_at: at, failures: 0 })
          .eq("user_id", userId).eq("id", claim.subscription_id));
      }
      unwrap(await db.from("notification_log").update({ status }).eq("id", claim.log_id).eq("user_id", userId));
    },
  };
}

export type ReminderStore = ReturnType<typeof createReminderStore>;
