import type { BatchSender, PendingEvent } from "@dailylingua/core";

/**
 * The stand-in for the server in this lot: no endpoint receives events yet. It really tries the
 * network (a tiny request to the manifest), so it fails exactly when the device is offline, and
 * then hands the batch to `onDelivered`. Nothing leaves the device.
 */
export function createDemoSender(onDelivered: (batch: readonly PendingEvent[]) => void): BatchSender {
  return async (batch) => {
    const response = await fetch("/manifest.webmanifest", { method: "HEAD", cache: "no-store" });
    if (!response.ok) throw new Error(`The probe answered ${response.status}`);
    onDelivered(batch);
  };
}
