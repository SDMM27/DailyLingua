import { CacheableResponsePlugin, CacheFirst, NetworkOnly, RangeRequestsPlugin, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";
import { parsePushPayload } from "./push-payload";

/**
 * The service worker (bundled by `@serwist/turbopack`, served at /serwist/sw.js).
 *
 * Cache policy: the HTTP cache holds only what is the same for every visitor and fingerprinted by
 * the build: the scripts, styles and fonts of the app and the translated offline page (the
 * precache). Pages, Server Component payloads and API answers go to the network and are never
 * stored, so no authenticated response and no user data ever lands in a cache. When a page cannot be
 * fetched, the offline page is served in its place.
 *
 * One exception: the audio of the units (`/unit-audio/`) is the same for every visitor (public files of the repository), so
 * it is cached after the first play and served offline (with range requests, which Safari needs for audio).
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
    {
      matcher: ({ url }) => url.pathname.startsWith("/unit-audio/"),
      handler: new CacheFirst({
        cacheName: "unit-audio",
        plugins: [new CacheableResponsePlugin({ statuses: [200] }), new RangeRequestsPlugin()],
      }),
    },
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
      data: { url: payload.url, reminderId: payload.reminderId },
      ...(payload.reminderId ? { tag: `dailylingua-reminder-${payload.reminderId}` } : {}),
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data: unknown = event.notification.data;
  const notification = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const url = typeof notification.url === "string" && /^\/(?!\/)[^\s\\]*$/.test(notification.url) ? notification.url : "/";
  const id = notification.reminderId;
  const reportOpen = typeof id === "number" && Number.isSafeInteger(id) && id > 0
    ? fetch("/api/push/opened", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => undefined)
    : Promise.resolve();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).pathname === url);
      await Promise.all([reportOpen, open ? open.focus() : self.clients.openWindow(url)]);
    })(),
  );
});
