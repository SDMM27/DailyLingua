"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { errorMessage, formatReport, type ReportLine } from "@/lib/lab/report";
import { urlBase64ToBytes } from "@/lib/push/vapid-key";
import { LabCard, LabResult } from "./lab-card";

type Permission = "default" | "granted" | "denied";

/**
 * Notification permission, Web Push subscription and a trial notification sent by the server. The
 * subscription lives in this component's memory and on screen: it is not stored. It is sent to the
 * server only when the button is pressed, for that one notification.
 */
export function NotificationsCard({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const t = useTranslations("lab");
  const [lines, setLines] = useState<ReportLine[]>([]);
  const [subscription, setSubscription] = useState<PushSubscriptionJSON | null>(null);
  const [busy, setBusy] = useState(false);

  async function enable() {
    setBusy(true);
    const found: ReportLine[] = [];
    try {
      if (!("Notification" in window)) {
        found.push([t("notifications.notifications"), t("notifications.unsupported")]);
        return;
      }
      found.push([t("notifications.pushManager"), t(`value.${"PushManager" in window ? "yes" : "no"}`)]);

      // Must be called from the tap: iOS ignores a permission request made at any other time.
      const permission: Permission = await Notification.requestPermission();
      found.push([t("notifications.permission"), t(`permission.${permission}`)]);

      const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      found.push([t("notifications.serviceWorker"), registration ? t("notifications.swReady") : t("notifications.swMissing")]);

      if (!vapidPublicKey) {
        found.push([t("notifications.subscription"), t("notifications.noKey")]);
      } else if (permission === "granted" && registration && "PushManager" in window) {
        const pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToBytes(vapidPublicKey),
        });
        const json = pushSubscription.toJSON();
        setSubscription(json);
        found.push([t("notifications.subscription"), JSON.stringify(json, null, 2)]);
        found.push([t("notifications.subscription"), t("notifications.subscriptionNote")]);
      }
    } catch (error) {
      found.push([t("notifications.title"), t("value.error", { message: errorMessage(error) })]);
    } finally {
      setLines(found);
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!subscription) return;
    setBusy(true);
    let answer: string;
    try {
      const response = await fetch("/lab/push-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });
      const body = (await response.json().catch(() => ({}))) as { status?: number };
      answer =
        response.status === 200
          ? t("notifications.sent")
          : response.status === 503
            ? t("notifications.pushDisabled")
            : response.status === 410
              ? t("notifications.gone")
              : response.status === 502
                ? t("notifications.rejected", { status: body.status ?? response.status })
                : t("notifications.failed", { status: response.status });
    } catch (error) {
      answer = t("value.error", { message: errorMessage(error) });
    }
    setLines((previous) => [...previous.filter(([label]) => label !== t("notifications.sendResult")), [t("notifications.sendResult"), answer]]);
    setBusy(false);
  }

  return (
    <LabCard title={t("notifications.title")} hint={t("notifications.hint")}>
      <Button variant="secondary" onClick={enable} disabled={busy}>
        {t("notifications.enable")}
      </Button>
      <Button variant="secondary" onClick={sendTest} disabled={busy || !subscription}>
        {t("notifications.sendTest")}
      </Button>
      <LabResult text={formatReport(lines)} />
    </LabCard>
  );
}
