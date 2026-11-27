import { addDays } from "@dailylingua/core";
import { sessionPacketSchema, type DateKey, type SessionPacket } from "@dailylingua/schemas";
import { sessionPacketDatabaseName } from "./names";

/**
 * The session packets kept on the phone, one per `(language, day)` (`j2-architecture.md` section 4), in the IndexedDB
 * database of the signed-in user. They hold answer keys: they are deleted at sign-out (the whole database) and
 * purged by day. The logic is here, over a small key-value backend, so it can be tested without a browser; the
 * IndexedDB backend below is the only part that needs one.
 */

export interface StoredPacket {
  key: string;
  packet: Omit<SessionPacket, "expression">;
  /** Keep the metadata next to the strict packet for readers from earlier app versions. */
  expression?: SessionPacket["expression"];
  /** ISO instant the packet was stored. */
  storedAt: string;
}

/** Packets of the days before today minus this many days are dropped. */
export const PACKET_RETENTION_DAYS = 2;

export interface PacketBackend {
  get(key: string): Promise<unknown>;
  put(entry: StoredPacket): Promise<void>;
  delete(keys: readonly string[]): Promise<void>;
  all(): Promise<unknown[]>;
}

export interface SessionPacketStore {
  put(packet: SessionPacket, storedAt: Date): Promise<void>;
  /** The packet of a language and a day, or null (none stored, or one that no longer matches the schema). */
  get(language: string, day: DateKey): Promise<SessionPacket | null>;
  /**
   * Drops the packets of the days before `today - 2`, and the completed sessions' once the event queue is empty (nothing
   * more to send for them). Returns how many were dropped.
   */
  purge(today: DateKey, queueEmpty: boolean): Promise<number>;
}

export const packetKey = (language: string, day: DateKey) => `${language}|${day}`;

export function createSessionPacketStore(backend: PacketBackend): SessionPacketStore {
  return {
    async put(packet, storedAt) {
      const { expression, ...checked } = sessionPacketSchema.parse(packet);
      await backend.put({
        key: packetKey(checked.session.language, checked.session.day),
        packet: checked,
        ...(expression ? { expression } : {}),
        storedAt: storedAt.toISOString(),
      });
    },
    async get(language, day) {
      const entry = (await backend.get(packetKey(language, day))) as Partial<StoredPacket> | undefined;
      const parsed = sessionPacketSchema.safeParse(entry?.packet);
      if (!parsed.success) return null;
      const expression = sessionPacketSchema.shape.expression.safeParse(entry?.expression);
      return expression.success && expression.data ? { ...parsed.data, expression: expression.data } : parsed.data;
    },
    async purge(today, queueEmpty) {
      const limit = addDays(today, -PACKET_RETENTION_DAYS);
      const doomed: string[] = [];
      for (const raw of await backend.all()) {
        const entry = raw as Partial<StoredPacket>;
        if (typeof entry.key !== "string") continue;
        const parsed = sessionPacketSchema.safeParse(entry.packet);
        if (!parsed.success || parsed.data.session.day < limit || (queueEmpty && parsed.data.session.status === "completed")) doomed.push(entry.key);
      }
      await backend.delete(doomed);
      return doomed.length;
    },
  };
}

// ---------------------------------------------------------------------------------------------------- IndexedDB

const STORE = "packets";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function open(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(name, 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore(STORE, { keyPath: "key" });
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error ?? new Error("IndexedDB cannot be opened"));
    opening.onblocked = () => reject(new Error("IndexedDB is blocked by another tab"));
  });
}

export function createIndexedDbPacketBackend(databaseName: string): PacketBackend {
  async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>): Promise<T> {
    const database = await open(databaseName);
    database.onversionchange = () => database.close();
    try {
      const tx = database.transaction(STORE, mode);
      const completed = done(tx);
      const [result] = await Promise.all([run(tx.objectStore(STORE)), completed]);
      return result;
    } finally {
      database.close();
    }
  }

  return {
    get(key) {
      return transact("readonly", (store) => request(store.get(key)));
    },
    put(entry) {
      return transact("readwrite", async (store) => { await request(store.put(entry)); });
    },
    async delete(keys) {
      if (keys.length === 0) return;
      await transact("readwrite", async (store) => {
        await Promise.all(keys.map((key) => request(store.delete(key))));
      });
    },
    all() {
      return transact("readonly", (store) => request(store.getAll()));
    },
  };
}

/** The packet store of a user, in their own database. */
export function createUserPacketStore(userId: string): SessionPacketStore {
  return createSessionPacketStore(createIndexedDbPacketBackend(sessionPacketDatabaseName(userId)));
}

/**
 * Deletes the whole packet database of a user (sign-out: the packets hold answer keys). Never rejects and never waits
 * for ever: a database another tab keeps open is deleted as soon as that tab closes it.
 */
export function deleteSessionPacketDatabase(userId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    try {
      const deleting = indexedDB.deleteDatabase(sessionPacketDatabaseName(userId));
      deleting.onsuccess = () => resolve();
      deleting.onerror = () => resolve();
      deleting.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** True when this browser can keep packets on disk. */
export function indexedDbPacketsAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
