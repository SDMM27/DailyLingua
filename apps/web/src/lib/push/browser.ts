import { urlBase64ToBytes } from "./vapid-key";

export function canSubscribeToPush() {
  return "serviceWorker" in navigator && "Notification" in window && "PushManager" in window;
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!canSubscribeToPush()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return await registration?.pushManager.getSubscription() ?? null;
}

export async function subscribeToPush(publicKey: string): Promise<PushSubscription | null> {
  if (!canSubscribeToPush() || await Notification.requestPermission() !== "granted") return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.active) throw new Error("Service worker unavailable");
  const browserKey = urlBase64ToBytes(publicKey);
  const current = await registration.pushManager.getSubscription();
  const currentKey = current?.options.applicationServerKey;
  if (currentKey && new Uint8Array(currentKey).every((byte, index) => byte === browserKey[index])
    && currentKey.byteLength === browserKey.byteLength) return current;

  if (current) await current.unsubscribe();
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: browserKey });
}
