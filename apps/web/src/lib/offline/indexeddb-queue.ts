import type { EventQueue, PendingEvent } from "@dailylingua/core";

const STORE = "events";
const BY_EVENT_ID = "by-client-event-id";
const DB_VERSION = 1;

/** A stored event: the auto-incremented `seq` is the arrival order (first in, first out). */
interface StoredEvent extends PendingEvent {
  seq?: number;
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
    opening.onupgradeneeded = () => {
      const store = opening.result.createObjectStore(STORE, { keyPath: "seq", autoIncrement: true });
      store.createIndex(BY_EVENT_ID, "clientEventId", { unique: true });
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
 * database on first use. Events are removed only by `ack`.
 */
export function createIndexedDbEventQueue(databaseName = "dailylingua-offline"): EventQueue {
  let database: Promise<IDBDatabase> | null = null;
  const open = () => (database ??= openDatabase(databaseName));

  return {
    async enqueue(event) {
      const tx = (await open()).transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const existing = await request(store.index(BY_EVENT_ID).getKey(event.clientEventId));
      if (existing === undefined) store.add({ ...event } satisfies StoredEvent);
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
  };
}
