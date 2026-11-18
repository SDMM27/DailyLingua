"use client";

import { sessionPacketSchema } from "@dailylingua/schemas";
import { useEffect } from "react";
import { useEventSync } from "@/components/pwa/event-sync-provider";
import { createUserPacketStore, indexedDbPacketsAvailable } from "@/lib/offline/session-packet-store";

/**
 * Fetches the packet of the day while the learner is online and keeps it for the offline session, then purges the old
 * ones. Renders nothing: Today looks exactly as before. A failure (offline, signed out, server error) changes nothing:
 * the next visit tries again.
 */
export function SessionPrefetch({ language }: { language: string }) {
  const sync = useEventSync();
  const userId = sync?.userId;
  const queueSize = sync?.queueSize;

  useEffect(() => {
    if (!userId || !queueSize || !indexedDbPacketsAvailable() || !navigator.onLine) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/session/today?language=${encodeURIComponent(language)}`, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const packet = sessionPacketSchema.safeParse(await response.json());
        if (!packet.success || controller.signal.aborted) return;
        const store = createUserPacketStore(userId);
        await store.put(packet.data, new Date());
        await store.purge(packet.data.serverDay, (await queueSize()) === 0);
      } catch {
        // Offline or interrupted: nothing to do.
      }
    })();
    return () => controller.abort();
  }, [userId, queueSize, language]);

  return null;
}
