import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";
import { parsePushPayload } from "./push-payload";

/**
 * The service worker (bundled by `@serwist/turbopack`, served at /serwist/sw.js).
 *
 * Cache policy: the HTTP cache holds only what is the same for every visitor and fingerprinted by
 * the build: the scripts, styles and fonts of the app and the translated offline page (the
 * precache). Pages, Server Component payloads and API answers go to the network and are never
 * stored, so no authenticated response and no user data ever lands in a cache. When a page cannot be
 * fetched, the offline page is served in its place.
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_URL = "/offline";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    // Network only: a failure is answered by the offline fallback below, not by a stale page.
    { matcher: ({ request }) => request.mode === "navigate", handler: new NetworkOnly() },
  ],
  fallbacks: {
    entries: [{ url: OFFLINE_URL, matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event.data?.text());
  if (!payload) return;
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data: unknown = event.notification.data;
  const url = typeof data === "object" && data !== null && "url" in data && typeof data.url === "string" ? data.url : "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).pathname === url);
      if (open) await open.focus();
      else await self.clients.openWindow(url);
    })(),
  );
});
