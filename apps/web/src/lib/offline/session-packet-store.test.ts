import { sessionPacketSchema, type SessionPacket } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { createSessionPacketStore, deleteSessionPacketDatabase, packetKey, type PacketBackend, type StoredPacket } from "./session-packet-store";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function packet(day: string, status: SessionPacket["session"]["status"] = "planned", language = "it"): SessionPacket {
  return {
    session: { id: ID(1), language, day, format: 15, kind: "daily", status, servedAt: `${day}T07:00:00.000Z` },
    steps: [{ step: "wake", minutes: 3, required: true }],
    text: null,
    items: [],
    cards: [],
    errorOfTheDay: null,
    quotas: { writingFeedback: { used: 0, limit: 3 }, rewriteCheck: { used: 0, limit: 6 } },
    serverDay: day,
    timeZone: "Europe/Paris",
  };
}

function memoryBackend(initial: unknown[] = []): PacketBackend & { map: Map<string, unknown> } {
  const map = new Map<string, unknown>(initial.map((entry, i) => [(entry as StoredPacket).key ?? `raw${i}`, entry]));
  return {
    map,
    get: async (key) => map.get(key),
    put: async (entry) => void map.set(entry.key, entry),
    delete: async (keys) => void keys.forEach((key) => map.delete(key)),
    all: async () => [...map.values()],
  };
}

describe("session packet store", () => {
  it("keeps one packet per language and day, and reads it back as a valid packet", async () => {
    const backend = memoryBackend();
    const store = createSessionPacketStore(backend);
    await store.put(packet("2026-11-18"), new Date("2026-11-18T08:00:00.000Z"));
    await store.put(packet("2026-11-18", "planned", "es"), new Date("2026-11-18T08:00:00.000Z"));
    await store.put({ ...packet("2026-11-18"), serverDay: "2026-11-18", session: { ...packet("2026-11-18").session, status: "started" } }, new Date("2026-11-18T09:00:00.000Z"));
    expect([...backend.map.keys()].sort()).toEqual([packetKey("es", "2026-11-18"), packetKey("it", "2026-11-18")]);
    expect((await store.get("it", "2026-11-18"))?.session.status).toBe("started");
    expect(await store.get("it", "2026-11-17")).toBeNull();
    expect(((backend.map.get(packetKey("it", "2026-11-18")) as StoredPacket).storedAt)).toBe("2026-11-18T09:00:00.000Z");
  });

  it("refuses to store, and does not return, something that is not a packet", async () => {
    const backend = memoryBackend([{ key: packetKey("it", "2026-11-18"), packet: { session: {} }, storedAt: "x" }]);
    const store = createSessionPacketStore(backend);
    expect(await store.get("it", "2026-11-18")).toBeNull();
    await expect(store.put({ nope: true } as unknown as SessionPacket, new Date())).rejects.toThrow();
  });

  it("purges the packets older than today minus two days", async () => {
    const backend = memoryBackend();
    const store = createSessionPacketStore(backend);
    for (const day of ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-18"]) await store.put({ ...packet(day), session: { ...packet(day).session, language: day === "2026-11-15" ? "es" : "it" } }, new Date());
    expect(await store.purge("2026-11-18", false)).toBe(2);
    expect([...backend.map.keys()].sort()).toEqual([packetKey("it", "2026-11-16"), packetKey("it", "2026-11-18")]);
  });

  it("purges the completed sessions only once the event queue is empty", async () => {
    const backend = memoryBackend();
    const store = createSessionPacketStore(backend);
    await store.put(packet("2026-11-18", "completed"), new Date());
    await store.put(packet("2026-11-17", "started"), new Date());
    expect(await store.purge("2026-11-18", false)).toBe(0);
    expect(await store.purge("2026-11-18", true)).toBe(1);
    expect([...backend.map.keys()]).toEqual([packetKey("it", "2026-11-17")]);
  });

  it("drops the entries it cannot read when it purges", async () => {
    const backend = memoryBackend([{ key: "it|2026-11-18", packet: 42, storedAt: "x" }, { not: "an entry" }]);
    const store = createSessionPacketStore(backend);
    expect(await store.purge("2026-11-18", false)).toBe(1);
    expect(backend.map.size).toBe(1);
  });

  it("keeps the validated packet, not the raw one", async () => {
    const backend = memoryBackend();
    await createSessionPacketStore(backend).put(packet("2026-11-18"), new Date());
    expect(sessionPacketSchema.safeParse((backend.map.get(packetKey("it", "2026-11-18")) as StoredPacket).packet).success).toBe(true);
  });

  it("restores expression metadata offline without changing the stored packet for earlier clients", async () => {
    const backend = memoryBackend();
    const store = createSessionPacketStore(backend);
    const today = { ...packet("2026-11-18"), expression: { suggestSpoken: true } };
    await store.put(today, new Date());
    const entry = backend.map.get(packetKey("it", "2026-11-18")) as StoredPacket;
    expect(sessionPacketSchema.omit({ expression: true }).safeParse(entry.packet).success).toBe(true);
    expect(await store.get("it", "2026-11-18")).toEqual(today);
  });
});

describe("deleteSessionPacketDatabase", () => {
  it("resolves at once when this environment has no IndexedDB", async () => {
    await expect(deleteSessionPacketDatabase("user")).resolves.toBeUndefined();
  });

  it("deletes the database named for the user and never waits on a blocked or failing one", async () => {
    const names: string[] = [];
    const request = (event: "onsuccess" | "onerror" | "onblocked") => {
      const req: Record<string, (() => void) | undefined> = {};
      queueMicrotask(() => req[event]?.());
      return req;
    };
    for (const event of ["onsuccess", "onerror", "onblocked"] as const) {
      globalThis.indexedDB = { deleteDatabase: (name: string) => (names.push(name), request(event)) } as unknown as IDBFactory;
      await expect(deleteSessionPacketDatabase("user-1")).resolves.toBeUndefined();
    }
    globalThis.indexedDB = { deleteDatabase: () => { throw new Error("denied"); } } as unknown as IDBFactory;
    await expect(deleteSessionPacketDatabase("user-1")).resolves.toBeUndefined();
    expect(names).toEqual(["dailylingua-session-user-1", "dailylingua-session-user-1", "dailylingua-session-user-1"]);
    // @ts-expect-error restoring a Node environment without IndexedDB
    delete globalThis.indexedDB;
  });
});
