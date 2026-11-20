import { describe, expect, it, vi } from "vitest";
import type { ClaimedReminder, Reminder, ReminderStore } from "@dailylingua/data";
import { acceptsCronSecret, sendDueReminders, type SendReminder } from "./reminder-job";

const reminder: Reminder = {
  user_id: "user", day: "2026-11-20", locale: "fr", delivery_mode: "daily", template: "session",
  daily_minutes: 15, active_days: 1, rewrites: 0,
};
const claim: ClaimedReminder = {
  log_id: 1, subscription_id: "device", endpoint: "https://fcm.googleapis.com/slot",
  p256dh: "B" + "A".repeat(86), auth: "A".repeat(22),
};
const now = new Date("2026-11-20T18:04:00Z");

describe("reminder cron", () => {
  it("requires the configured bearer secret and at least 32 characters", () => {
    const secret = "a".repeat(32);
    expect(acceptsCronSecret(null, secret)).toBe(false);
    expect(acceptsCronSecret("Bearer short", "short")).toBe(false);
    expect(acceptsCronSecret("Bearer " + "b".repeat(32), secret)).toBe(false);
    expect(acceptsCronSecret("Bearer " + secret, secret)).toBe(true);
  });

  it("only sends once when two runs contend for the same reservation", async () => {
    let available = true;
    const store: ReminderStore = {
      due: vi.fn(async () => [reminder]),
      claim: vi.fn(async () => {
        if (!available) return null;
        available = false;
        return claim;
      }),
      finish: vi.fn(async () => {}),
    };
    const send = vi.fn<SendReminder>(async () => "sent");
    const outcomes = await Promise.all([sendDueReminders({ store, send, now }), sendDueReminders({ store, send, now })]);
    expect(outcomes.map(({ sent }) => sent)).toEqual([1, 0]);
    expect(send).toHaveBeenCalledOnce();
    expect(store.finish).toHaveBeenCalledWith(reminder.user_id, claim, "sent", now.toISOString());
  });

  it("revalidates the destination after claiming and avoids sending a malformed subscription", async () => {
    const invalid = { ...claim, endpoint: "https://example.invalid/slot" };
    const store: ReminderStore = { due: async () => [reminder], claim: async () => invalid, finish: vi.fn(async () => {}) };
    const send = vi.fn<SendReminder>(async () => "sent");
    expect(await sendDueReminders({ store, send, now })).toEqual({ sent: 0, expired: 1, failed: 0 });
    expect(send).not.toHaveBeenCalled();
    expect(store.finish).toHaveBeenCalledWith(reminder.user_id, invalid, "expired", now.toISOString());
  });
});
