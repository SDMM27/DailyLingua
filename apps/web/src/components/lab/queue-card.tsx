"use client";

import type { EventQueue, FlushResult, PendingEvent } from "@dailylingua/core";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { createDemoSender } from "@/lib/offline/demo-sender";
import { startEventSync, type EventSync } from "@/lib/offline/event-sync";
import { createIndexedDbEventQueue, indexedDbAvailable } from "@/lib/offline/indexeddb-queue";
import { useOnlineStatus } from "@/lib/offline/online-status";
import { errorMessage } from "@/lib/lab/report";
import { LabCard, LabResult } from "./lab-card";

const DEMO_EVENT_COUNT = 3;
const LOG_LINES = 12;

type LogEntry =
  | { kind: "queued"; count: number }
  | { kind: "sent"; count: number }
  | { kind: "failed"; seconds: number }
  | { kind: "error"; message: string };

/**
 * Demonstrates the offline queue: events go into an IndexedDB queue and a sync runner delivers them
 * with a stand-in sender (no server receives them yet) when the network allows.
 */
export function QueueCard() {
  const t = useTranslations("lab");
  const online = useOnlineStatus();
  const [waiting, setWaiting] = useState<number | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  // The server cannot tell: it renders the controls, the browser may then replace them by the notice.
  const supported = useSyncExternalStore(
    () => () => {},
    indexedDbAvailable,
    () => true,
  );
  const queueRef = useRef<EventQueue | null>(null);
  const syncRef = useRef<EventSync | null>(null);

  const record = useCallback((entry: LogEntry) => setLog((previous) => [...previous, entry].slice(-LOG_LINES)), []);
  const refresh = useCallback(async () => {
    try {
      setWaiting((await queueRef.current?.size()) ?? 0);
    } catch (error) {
      record({ kind: "error", message: errorMessage(error) });
    }
  }, [record]);

  useEffect(() => {
    // Without IndexedDB the card says so and does nothing else.
    if (!supported) return;
    const queue = createIndexedDbEventQueue();
    queueRef.current = queue;
    let delivered = 0;
    const sync = startEventSync({
      queue,
      send: createDemoSender((batch) => {
        delivered += batch.length;
      }),
      onResult: (result: FlushResult) => {
        if (result.outcome === "failed") {
          record({ kind: "failed", seconds: Math.max(0, Math.round((result.state.retry.nextAttemptAt - Date.now()) / 1000)) });
        } else if (delivered > 0) {
          record({ kind: "sent", count: delivered });
        }
        delivered = 0;
        void refresh();
      },
    });
    syncRef.current = sync;
    void refresh();
    return () => {
      sync.stop();
      syncRef.current = null;
      queueRef.current = null;
    };
  }, [supported, record, refresh]);

  async function enqueue() {
    const queue = queueRef.current;
    if (!queue) return;
    try {
      for (let index = 0; index < DEMO_EVENT_COUNT; index++) {
        const event: PendingEvent = {
          clientEventId: crypto.randomUUID(),
          kind: "lab.demo",
          payload: { index },
          occurredAt: new Date().toISOString(),
        };
        await queue.enqueue(event);
      }
      record({ kind: "queued", count: DEMO_EVENT_COUNT });
      await refresh();
      // Online, they leave at once; offline, the attempt fails and the runner waits for the network.
      void syncRef.current?.flushNow();
    } catch (error) {
      record({ kind: "error", message: errorMessage(error) });
    }
  }

  const describeEntry = (entry: LogEntry): string => {
    switch (entry.kind) {
      case "queued":
        return t("queue.logQueued", { count: entry.count });
      case "sent":
        return t("queue.logSent", { count: entry.count });
      case "failed":
        return t("queue.logFailed", { seconds: entry.seconds });
      case "error":
        return t("value.error", { message: entry.message });
    }
  };

  const summary = [
    `${t("queue.network")}: ${t(online ? "queue.online" : "queue.offline")}`,
    `${t("queue.waiting")}: ${waiting ?? t("value.unknown")}`,
    ...log.map(describeEntry),
  ].join("\n");

  return (
    <LabCard title={t("queue.title")} hint={t("queue.hint")}>
      {supported ? (
        <>
          <Button variant="secondary" onClick={enqueue}>
            {t("queue.enqueue")}
          </Button>
          <Button variant="secondary" onClick={() => void syncRef.current?.flushNow()}>
            {t("queue.flush")}
          </Button>
        </>
      ) : (
        <p role="alert" className="text-danger">
          {t("queue.unsupported")}
        </p>
      )}
      <LabResult text={summary} />
    </LabCard>
  );
}
