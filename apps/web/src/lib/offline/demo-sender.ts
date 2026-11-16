import type { BatchSender, PendingEvent } from "@dailylingua/core";

export const DEMO_REJECTED_REASON = "demo_rejected";

function isDemoRejected(event: PendingEvent): boolean {
  const payload = event.payload;
  return typeof payload === "object" && payload !== null && (payload as { demoReject?: unknown }).demoReject === true;
}

/**
 * The stand-in for the server in this lot: no endpoint receives events yet. It really tries the
 * network (a tiny request to the manifest), so it fails exactly when the device is offline, and
 * then hands the accepted events to `onDelivered`. An event whose payload holds `demoReject: true` is
 * reported as permanently refused (reason `demo_rejected`), as the real server will do for an event it
 * can never accept. Nothing leaves the device.
 */
export function createDemoSender(onDelivered: (batch: readonly PendingEvent[]) => void): BatchSender {
  return async (batch) => {
    const response = await fetch("/manifest.webmanifest", { method: "HEAD", cache: "no-store" });
    if (!response.ok) throw new Error(`The probe answered ${response.status}`);
    const refused = batch.filter(isDemoRejected);
    const accepted = batch.filter((event) => !isDemoRejected(event));
    if (accepted.length > 0) onDelivered(accepted);
    return { rejected: refused.map((event) => ({ clientEventId: event.clientEventId, reason: DEMO_REJECTED_REASON })) };
  };
}
