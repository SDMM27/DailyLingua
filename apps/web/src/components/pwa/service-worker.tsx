"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import type { ReactNode } from "react";
import { SERVICE_WORKER_URL } from "@/lib/pwa";

/**
 * Registers the service worker, in production only (in development it would cache stale code).
 * The provider's page-caching helpers are off: they would store the pages the learner visits,
 * and the cache must never hold user data. Nor does it reload the page when the network returns:
 * the offline queue sends its events without a reload.
 */
export function ServiceWorker({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl={SERVICE_WORKER_URL}
      disable={process.env.NODE_ENV === "development"}
      cacheOnNavigation={false}
      reloadOnOnline={false}
      options={{ scope: "/", type: "classic", updateViaCache: "none" }}
    >
      {children}
    </SerwistProvider>
  );
}
