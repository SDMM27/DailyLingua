"use client";

import { learningDay } from "@dailylingua/core";
import { resolveUiLocale } from "@dailylingua/i18n";
import { sessionPacketSchema, type SessionPacket } from "@dailylingua/schemas";
import { useEffect } from "react";
import { useEventSync } from "@/components/pwa/event-sync-provider";
import { createUserPacketStore, indexedDbPacketsAvailable } from "@/lib/offline/session-packet-store";
import { useOnlineStatus } from "@/lib/offline/online-status";
import { ACCOUNT_HEADER, forgetOfflineAccount, offlineAccountRevision, rememberOfflineAccount } from "@/lib/offline/account";

/**
 * Fetches the packet of the day while the learner is online and keeps it for the offline session, then purges the old
 * ones. Renders nothing: Today looks exactly as before. A failure (offline, signed out, server error) changes nothing:
 * the next visit tries again.
 */
export function SessionPrefetch({ language, timeZone, retry, prepareText = false, offlineLocale, onPacket, onUnavailable }: {
  language: string;
  timeZone?: string;
  retry?: number;
  prepareText?: boolean;
  offlineLocale?: string;
  onPacket?(packet: SessionPacket, cached: boolean): void;
  onUnavailable?(): void;
}) {
  const sync = useEventSync();
  const userId = sync?.userId;
  const queueSize = sync?.queueSize;
  const online = useOnlineStatus();

  useEffect(() => {
    if (!userId || !queueSize || !indexedDbPacketsAvailable()) {
      onUnavailable?.();
      return;
    }
    const controller = new AbortController();
    const revision = offlineAccountRevision(userId);
    void (async () => {
      const store = createUserPacketStore(userId);
      try {
        if (!online) throw new Error("offline");
        const response = await fetch(`/api/session/today?language=${encodeURIComponent(language)}&expression=1`, {
          method: prepareText ? "POST" : "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { [ACCOUNT_HEADER]: userId },
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 404) {
          forgetOfflineAccount(userId);
          if (!controller.signal.aborted) onUnavailable?.();
          return;
        }
        if (!response.ok) throw new Error("session unavailable");
        const packet = sessionPacketSchema.safeParse(await response.json());
        if (!packet.success) throw new Error("invalid session packet");
        if (controller.signal.aborted || offlineAccountRevision(userId) !== revision) return;
        onPacket?.(packet.data, false);
        await store.put(packet.data, new Date());
        if (!controller.signal.aborted && offlineLocale) {
          rememberOfflineAccount({ userId, language: packet.data.session.language, timeZone: packet.data.timeZone, locale: resolveUiLocale(offlineLocale) }, revision);
        }
        if (!controller.signal.aborted) onPacket?.(packet.data, true);
        await store.purge(packet.data.serverDay, (await queueSize()) === 0);
      } catch {
        if (!timeZone || controller.signal.aborted) return;
        const cached = await store.get(language, learningDay(new Date(), timeZone)).catch(() => null);
        if (controller.signal.aborted) return;
        if (cached) onPacket?.(cached, true);
        else onUnavailable?.();
      }
    })();
    return () => controller.abort();
  }, [userId, queueSize, language, timeZone, retry, prepareText, offlineLocale, onPacket, onUnavailable, online]);

  return null;
}
