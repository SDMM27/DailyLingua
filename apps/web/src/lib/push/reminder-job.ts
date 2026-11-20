import { createHash, timingSafeEqual } from "node:crypto";
import type { ClaimedReminder, Reminder, ReminderStore } from "@dailylingua/data";
import { loadMessages, resolveUiLocale } from "@dailylingua/i18n";
import { createTranslator } from "next-intl";
import { reminderSubscriptionSchema } from "./reminder-subscription";

export const reminderTemplates = ["weekly_first", "weekly_summary", "session", "session_alternate"] as const;
type ReminderTemplate = (typeof reminderTemplates)[number];
export type SendReminder = (subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}, payload: string) => Promise<"sent" | "expired" | "failed">;

async function payload(reminder: Reminder, claim: ClaimedReminder): Promise<string> {
  const locale = resolveUiLocale(reminder.locale);
  const t = createTranslator({ locale, messages: await loadMessages(locale), namespace: "reminderPush" });
  const template = reminderTemplates.find((key) => key === reminder.template) ?? "session";
  const body = {
    weekly_first: () => t("weekly_first"),
    weekly_summary: () => t("weekly_summary", { days: reminder.active_days, rewrites: reminder.rewrites }),
    session: () => t("session", { minutes: reminder.daily_minutes }),
    session_alternate: () => t("session_alternate", { minutes: reminder.daily_minutes }),
  } satisfies Record<ReminderTemplate, () => string>;
  return JSON.stringify({ title: t("title"), body: body[template](), url: "/", reminderId: claim.log_id });
}

export async function sendDueReminders({ store, send, now, canContinue = () => true }: {
  store: ReminderStore;
  send: SendReminder;
  now: Date;
  canContinue?: () => boolean;
}) {
  const at = now.toISOString();
  const counts = { sent: 0, expired: 0, failed: 0 };
  let after: string | undefined;
  while (canContinue()) {
    const reminders = await store.due(at, after);
    for (let offset = 0; offset < reminders.length && canContinue(); offset += 10) {
      await Promise.all(reminders.slice(offset, offset + 10).map(async (reminder) => {
        try {
          const claim = await store.claim(reminder, at);
          if (!claim) return;
          const subscription = reminderSubscriptionSchema.safeParse({
            endpoint: claim.endpoint, keys: { p256dh: claim.p256dh, auth: claim.auth },
          });
          const status = subscription.success
            ? await send(subscription.data, await payload(reminder, claim)).catch(() => "failed" as const)
            : "expired";
          await store.finish(reminder.user_id, claim, status, at);
          counts[status]++;
        } catch {
          counts.failed++;
        }
      }));
    }
    if (reminders.length < 100) break;
    after = reminders.at(-1)?.user_id;
  }
  return counts;
}

export function acceptsCronSecret(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 32 || !authorization?.startsWith("Bearer ")) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(authorization.slice(7)), digest(secret));
}
