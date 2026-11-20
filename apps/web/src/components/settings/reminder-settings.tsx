"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { saveReminderSettings } from "@/app/actions/reminders";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/field";
import { canSubscribeToPush, currentPushSubscription, subscribeToPush } from "@/lib/push/browser";

export function ReminderSettings({ userId, publicKey, timeZone, initial }: {
  userId: string;
  publicKey: string | null;
  timeZone: string;
  initial: { time: string; enabled: boolean; weeklySummary: boolean };
}) {
  const t = useTranslations("settings.reminder");
  const [time, setTime] = useState(initial.time);
  const [weeklySummary, setWeeklySummary] = useState(initial.weeklySummary);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [supported, setSupported] = useState<boolean>();
  const [device, setDevice] = useState<PushSubscription | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<"saved" | "blocked" | "failed">();

  useEffect(() => {
    let active = true;
    void currentPushSubscription().then((subscription) => {
      if (!active) return;
      const supported = canSubscribeToPush();
      setSupported(supported);
      setDevice(subscription);
      if (supported && Notification.permission === "denied") setMessage("blocked");
    }).catch(() => {
      if (active) setSupported(false);
    });
    return () => { active = false; };
  }, []);

  async function save(action: "enable" | "update" | "disable") {
    setPending(true);
    setMessage(undefined);
    try {
      const subscription = action === "enable" && publicKey ? await subscribeToPush(publicKey) : undefined;
      if (action === "enable" && !subscription) {
        setMessage("blocked");
        return;
      }
      const existing = action === "disable" ? await currentPushSubscription().catch(() => null) : null;
      const saved = await saveReminderSettings({
        userId, time, weeklySummary, enabled: action !== "disable",
        subscription: subscription?.toJSON(), endpoint: existing?.endpoint,
      });
      if (!saved) throw new Error("Reminder settings unavailable");
      if (subscription) setDevice(subscription);
      if (action === "disable") {
        setDevice(null);
        if (existing) await existing.unsubscribe().catch(() => false);
      }
      setEnabled(action !== "disable");
      setMessage("saved");
    } catch {
      setMessage("failed");
    } finally {
      setPending(false);
    }
  }

  const overnight = time < "08:00" || time >= "21:30";
  return (
    <section aria-labelledby="reminder-settings" className="space-y-4">
      <h2 id="reminder-settings" className="meta">{t("title")}</h2>
      <p className="text-sm text-muted">{enabled ? t("at", { time }) : t("off")}</p>
      <TextField label={t("label")} hint={t("zone", { zone: timeZone })} type="time" name="notification-time"
        value={time} onChange={(event) => setTime(event.target.value)} />
      {overnight && time && <p className="text-sm text-muted">{t("overnight")}</p>}
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={weeklySummary} onChange={(event) => setWeeklySummary(event.target.checked)} />
        {t("weeklySummary")}
      </label>
      {supported === false && <p className="text-sm text-muted">{t("unsupported")}</p>}
      {supported && !publicKey && <p className="text-sm text-muted">{t("unavailable")}</p>}
      {message && <FormMessage kind={message === "saved" ? "notice" : "error"}>{t(message)}</FormMessage>}
      <div className="flex flex-wrap items-center gap-2">
        {supported && publicKey && (
          <Button variant="secondary" disabled={pending || !time} onClick={() => { void save(enabled && device ? "update" : "enable"); }}>
            {t(enabled && device ? "save" : "enable")}
          </Button>
        )}
        {enabled && (
          <Button variant="ghost" disabled={pending || !time} onClick={() => { void save("disable"); }}>{t("clear")}</Button>
        )}
      </div>
    </section>
  );
}
