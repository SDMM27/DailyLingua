import type { EventQueue, PendingEvent, RejectedEvent } from "@dailylingua/core";
import { clientEventSchema } from "@dailylingua/schemas";
import type { SessionEvent } from "@/lib/session-packet/session-flow";

const STORE = "events";
const BY_EVENT_ID = "by-client-event-id";
const REJECTED_STORE = "rejected";
const SESSION_PROGRESS = "session-progress";
const DB_VERSION = 3;

/** A stored event: the auto-incremented `seq` is the arrival order (first in, first out). */
interface StoredEvent extends PendingEvent {
  seq?: number;
}

export interface LocalSessionProgress {
  revision: number;
  position: string;
  startedAt: string | null;
}

interface IndexedDbEventQueue extends EventQueue {
  readProgress(sessionId: string): Promise<LocalSessionProgress | undefined>;
  advanceSession(sessionId: string, expectedRevision: number, next: LocalSessionProgress, events: SessionEvent[], occurredAt: string): Promise<boolean>;
}

interface EventDevice {
  id: string;
  sequence: number;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(name, DB_VERSION);
    opening.onupgradeneeded = (upgrade) => {
      const database = opening.result;
      // Each step runs only for the versions below it: the v1 `events` store (and what it holds) is kept.
      if (upgrade.oldVersion < 1) {
        const store = database.createObjectStore(STORE, { keyPath: "seq", autoIncrement: true });
        store.createIndex(BY_EVENT_ID, "clientEventId", { unique: true });
      }
      if (upgrade.oldVersion < 2) database.createObjectStore(REJECTED_STORE, { keyPath: "clientEventId" });
      if (upgrade.oldVersion < 3) database.createObjectStore(SESSION_PROGRESS);
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error ?? new Error("IndexedDB cannot be opened"));
    opening.onblocked = () => reject(new Error("IndexedDB is blocked by another tab"));
  });
}

/** True when this browser can keep an `EventQueue` on disk. */
export function indexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/**
 * `EventQueue` kept in IndexedDB, so that the events survive a closed tab or a restart. Opens the
 * database on first use. Events leave the queue only by `ack` (delivered) or `reject` (refused for good, kept apart).
 */
export function createIndexedDbEventQueue(databaseName = "dailylingua-offline"): IndexedDbEventQueue {
  let database: Promise<IDBDatabase> | null = null;
  const open = () => (database ??= openDatabase(databaseName).then((db) => {
    db.onversionchange = () => {
      db.close();
      database = null;
    };
    return db;
  }).catch((error: unknown) => {
    database = null;
    throw error;
  }));

  return {
    async readProgress(sessionId) {
      const tx = (await open()).transaction(SESSION_PROGRESS, "readonly");
      return request<LocalSessionProgress | undefined>(tx.objectStore(SESSION_PROGRESS).get(sessionId));
    },
    async advanceSession(sessionId, expectedRevision, next, events, occurredAt) {
      const tx = (await open()).transaction([SESSION_PROGRESS, STORE], "readwrite");
      const completed = transactionDone(tx);
      const progress = tx.objectStore(SESSION_PROGRESS);
      const current = await request<LocalSessionProgress | undefined>(progress.get(sessionId));
      if ((current?.revision ?? 0) !== expectedRevision) {
        await completed;
        return false;
      }
      try {
        if (events.length > 0) {
          const device = (await request<EventDevice | undefined>(progress.get("device"))) ?? { id: crypto.randomUUID(), sequence: 0 };
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const pending = events.map((event) => clientEventSchema.parse({
            kind: event.kind,
            payload: { ...event.payload, tz, deviceId: device.id, seq: ++device.sequence },
            clientEventId: crypto.randomUUID(),
            occurredAt,
          }));
          const queue = tx.objectStore(STORE);
          for (const event of pending) queue.add(event);
          progress.put(device, "device");
        }
        progress.put(next, sessionId);
        await completed;
      } catch (error) {
        try { tx.abort(); } catch { /* It may already have aborted. */ }
        await completed.catch(() => undefined);
        throw error;
      }
      return true;
    },
    async enqueue(event) {
      const tx = (await open()).transaction([STORE, REJECTED_STORE], "readwrite");
      const store = tx.objectStore(STORE);
      const existing = await request(store.index(BY_EVENT_ID).getKey(event.clientEventId));
      // An id the server refused is never queued again.
      const refused = await request(tx.objectStore(REJECTED_STORE).getKey(event.clientEventId));
      if (existing === undefined && refused === undefined) store.add({ ...event } satisfies StoredEvent);
      await transactionDone(tx);
    },
    async peekBatch(limit) {
      const count = Math.floor(limit);
      // A count of 0 means "no limit" to IndexedDB.
      if (!(count > 0)) return [];
      const tx = (await open()).transaction(STORE, "readonly");
      const stored = await request<StoredEvent[]>(tx.objectStore(STORE).getAll(undefined, count));
      return stored.map(({ clientEventId, kind, payload, occurredAt }) => ({ clientEventId, kind, payload, occurredAt }));
    },
    async ack(clientEventIds) {
      const tx = (await open()).transaction(STORE, "readwrite");
      const index = tx.objectStore(STORE).index(BY_EVENT_ID);
      const store = tx.objectStore(STORE);
      for (const id of clientEventIds) {
        const key = await request(index.getKey(id));
        if (key !== undefined) store.delete(key);
      }
      await transactionDone(tx);
    },
    async size() {
      const tx = (await open()).transaction(STORE, "readonly");
      return request(tx.objectStore(STORE).count());
    },
    async reject(entries) {
      if (entries.length === 0) return;
      // One transaction on both stores: an event is never in neither, nor in both.
      const tx = (await open()).transaction([STORE, REJECTED_STORE], "readwrite");
      const events = tx.objectStore(STORE);
      const index = events.index(BY_EVENT_ID);
      const rejected = tx.objectStore(REJECTED_STORE);
      for (const { clientEventId, reason, rejectedAt } of entries) {
        const key = await request(index.getKey(clientEventId));
        if (key === undefined) continue;
        const stored = await request<StoredEvent | undefined>(events.get(key));
        if (!stored) continue;
        events.delete(key);
        if ((await request(rejected.getKey(clientEventId))) === undefined) {
          const { kind, payload, occurredAt } = stored;
          rejected.add({ clientEventId, kind, payload, occurredAt, reason, rejectedAt } satisfies RejectedEvent);
        }
      }
      await transactionDone(tx);
    },
    async listRejected(limit) {
      const tx = (await open()).transaction(REJECTED_STORE, "readonly");
      const all = await request<RejectedEvent[]>(tx.objectStore(REJECTED_STORE).getAll());
      // Keyed by id, so the store has no arrival order: oldest rejection first, then by occurrence.
      return all
        .sort((a, b) => a.rejectedAt.localeCompare(b.rejectedAt) || a.occurredAt.localeCompare(b.occurredAt))
        .slice(0, Math.max(0, Math.floor(limit)));
    },
    async discardRejected(clientEventIds) {
      const tx = (await open()).transaction(REJECTED_STORE, "readwrite");
      const store = tx.objectStore(REJECTED_STORE);
      for (const id of clientEventIds) store.delete(id);
      await transactionDone(tx);
    },
    async rejectedCount() {
      const tx = (await open()).transaction(REJECTED_STORE, "readonly");
      return request(tx.objectStore(REJECTED_STORE).count());
    },
  };
}
