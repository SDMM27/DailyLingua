import { describe, expect, it } from "vitest";
import { eventQueueDatabaseName, sessionPacketDatabaseName } from "./names";

describe("database names", () => {
  it("are per user, and neither is the database of the /lab page", () => {
    expect(eventQueueDatabaseName("u1")).toBe("dailylingua-events-u1");
    expect(sessionPacketDatabaseName("u1")).toBe("dailylingua-session-u1");
    expect(eventQueueDatabaseName("u1")).not.toBe(eventQueueDatabaseName("u2"));
    expect(sessionPacketDatabaseName("u1")).not.toBe(sessionPacketDatabaseName("u2"));
    for (const name of [eventQueueDatabaseName("u1"), sessionPacketDatabaseName("u1")]) expect(name).not.toBe("dailylingua-offline");
  });
});
