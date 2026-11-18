"use client";

import type { FlushResult, PendingEvent } from "@dailylingua/core";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { startEventSync, type EventSync } from "@/lib/offline/event-sync";
import { createHttpSender } from "@/lib/offline/http-sender";
import { createIndexedDbEventQueue, indexedDbAvailable } from "@/lib/offline/indexeddb-queue";
import { eventQueueDatabaseName } from "@/lib/offline/names";

export interface EventSyncApi {
  userId: string;
  /** Puts an event in the user's durable queue and asks for a delivery. The queue delivers it when the network allows. */
  enqueue(event: PendingEvent): Promise<void>;
  /** Events waiting to be delivered. */
  queueSize(): Promise<number>;
  /** Delivers now; null when the delivery is not started (the app is not shown). */
  flushNow(): Promise<FlushResult | null>;
}

const EventSyncContext = createContext<EventSyncApi | null>(null);

/** The queue of a user (opened on first use) and the way to start and stop its delivery. */
function createEventSync(userId: string): { api: EventSyncApi; start: () => () => void } {
  const queue = createIndexedDbEventQueue(eventQueueDatabaseName(userId));
  let sync: EventSync | null = null;
  return {
    api: {
      userId,
      async enqueue(event) {
        await queue.enqueue(event);
        void sync?.flushNow();
      },
      queueSize: () => queue.size(),
      flushNow: async () => (sync ? sync.flushNow() : null),
    },
    start() {
      sync = startEventSync({ queue, send: createHttpSender() });
      return () => {
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
