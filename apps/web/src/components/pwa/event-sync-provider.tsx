"use client";

import type { FlushResult, PendingEvent } from "@dailylingua/core";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { startEventSync, type EventSync } from "@/lib/offline/event-sync";
import { createHttpSender } from "@/lib/offline/http-sender";
import { offlineAccountRevision } from "@/lib/offline/account";
import { requestWritingFeedback, type LocalWritingFeedback } from "@/lib/offline/feedback";
import { createIndexedDbEventQueue, indexedDbAvailable, type LocalSessionProgress } from "@/lib/offline/indexeddb-queue";
import { eventQueueDatabaseName } from "@/lib/offline/names";
import type { SessionEvent } from "@/lib/session-packet/session-flow";
import type { UnitEvent } from "@/lib/units/events";

export interface EventSyncApi {
  userId: string;
  /** Puts an event in the user's durable queue and asks for a delivery. The queue delivers it when the network allows. */
  enqueue(event: PendingEvent): Promise<void>;
  /** Events waiting to be delivered. */
  queueSize(): Promise<number>;
  /** Delivers now; null when the delivery is not started (the app is not shown). */
  flushNow(): Promise<FlushResult | null>;
  readProgress(sessionId: string): Promise<LocalSessionProgress | undefined>;
  readWritingFeedback(): Promise<LocalWritingFeedback[]>;
  clearResolvedFeedback(): Promise<void>;
  subscribeWritingFeedback(listener: () => void): () => void;
  refreshWritingFeedback(): void;
  enqueueRewrite(productionId: string, sentenceIndex: number, text: string): Promise<void>;
  eventDelivery(clientEventId: string): Promise<"queued" | "rejected" | "delivered">;
  /** Queues events of the units (they belong to no session) and asks for a delivery. */
  enqueueUnitEvents(events: UnitEvent[]): Promise<void>;
  advanceSession(sessionId: string, revision: number, next: LocalSessionProgress, events: SessionEvent[], occurredAt: string): Promise<boolean>;
}

const EventSyncContext = createContext<EventSyncApi | null>(null);

/** The queue of a user (opened on first use) and the way to start and stop its delivery. */
function createEventSync(userId: string): { api: EventSyncApi; start: () => () => void } {
  const queue = createIndexedDbEventQueue(eventQueueDatabaseName(userId));
  const feedbackListeners = new Set<() => void>();
  const notifyFeedback = () => feedbackListeners.forEach((listener) => listener());
  let sync: EventSync | null = null;
  let refreshFeedback: (() => void) | undefined;
  let stopFeedback: (() => void) | undefined;
  return {
    api: {
      userId,
      async enqueue(event) {
        await queue.enqueue(event);
        void sync?.flushNow();
      },
      queueSize: () => queue.size(),
      flushNow: async () => (sync ? sync.flushNow() : null),
      readProgress: (sessionId) => queue.readProgress(sessionId),
      readWritingFeedback: () => queue.readWritingFeedback(),
      async clearResolvedFeedback() {
        stopFeedback?.();
        await queue.clearResolvedFeedback();
      },
      subscribeWritingFeedback(listener) {
        feedbackListeners.add(listener);
        return () => { feedbackListeners.delete(listener); };
      },
      refreshWritingFeedback: () => refreshFeedback?.(),
      async enqueueRewrite(productionId, sentenceIndex, text) {
        await queue.enqueueRewrite(productionId, sentenceIndex, text);
        notifyFeedback();
        void sync?.flushNow();
      },
      eventDelivery: (clientEventId) => queue.productionDelivery(clientEventId),
      async enqueueUnitEvents(events) {
        await queue.enqueueDeviceEvents(events, new Date().toISOString());
        void sync?.flushNow();
      },
      async advanceSession(sessionId, revision, next, events, occurredAt) {
        const saved = await queue.advanceSession(sessionId, revision, next, events, occurredAt);
        if (saved && events.length > 0) {
          if (events.some((event) => event.kind === "production_submitted")) notifyFeedback();
          void sync?.flushNow();
        }
        return saved;
      },
    },
    start() {
      const controller = new AbortController();
      const revision = offlineAccountRevision(userId);
      const mayReadFeedback = () => !controller.signal.aborted && offlineAccountRevision(userId) === revision;
      stopFeedback = () => controller.abort();
      let checking = false;
      async function checkFeedback(manual = false) {
        if (checking || !navigator.onLine || !mayReadFeedback()) return;
        checking = true;
        try {
          for (const task of await queue.readWritingFeedback()) {
            if (!mayReadFeedback()) break;
            const status = task.response?.status;
            if (status === "ready" || status === "failed" || status === "invalid_production" || status === "not_found") continue;
            if (!manual && (status === "disabled" || (task.retryAfter ?? 0) > Date.now())) continue;
            const delivery = await queue.productionDelivery(task.clientEventId);
            if (delivery === "queued") continue;
            const response = delivery === "rejected" ? { status: "not_found" as const }
              : await requestWritingFeedback(userId, task.productionId, controller.signal).catch(() => undefined);
            if (response && response.status !== "forbidden" && response.status !== "unauthenticated" && mayReadFeedback()) {
              if (response.status !== status || response.status === "limit") {
                const retryAfter = response.status === "limit" ? Date.now() + 60 * 60_000 : undefined;
                await queue.updateWritingFeedback({ ...task, response, retryAfter });
              }
            }
          }
          if (!controller.signal.aborted) notifyFeedback();
        } finally {
          checking = false;
        }
      }
      const refresh = (manual = false) => { void checkFeedback(manual).catch(() => undefined); };
      refreshFeedback = () => refresh(true);
      sync = startEventSync({ queue, send: createHttpSender({ userId }), onResult: () => refresh() });
      const timer = window.setInterval(refresh, 15_000);
      return () => {
        controller.abort();
        window.clearInterval(timer);
        refreshFeedback = undefined;
        stopFeedback = undefined;
        sync?.stop();
        sync = null;
      };
    },
  };
}

/**
 * Delivers the signed-in user's events to `/api/events`. The queue is the user's own (`dailylingua-events-<userId>`):
 * the events of one account never leave with the cookie of another. It starts when the app is shown and stops when it is
 * left; the queue (on disk) keeps what was not delivered, also across a sign-out (it goes out at the next sign-in of
 * the same account). Without IndexedDB nothing is queued and the context stays empty. No visible interface.
 */
export function EventSyncProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const session = useMemo(() => (indexedDbAvailable() ? createEventSync(userId) : null), [userId]);
  useEffect(() => session?.start(), [session]);
  return <EventSyncContext value={session?.api ?? null}>{children}</EventSyncContext>;
}

/** The delivery API, or null when this browser has no IndexedDB (or outside the provider). */
export function useEventSync(): EventSyncApi | null {
  return useContext(EventSyncContext);
}
