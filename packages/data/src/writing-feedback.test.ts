import { describe, expect, it } from "vitest";
import { tableFake } from "./table-fake";
import { createWritingFeedbackStore } from "./writing-feedback";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ME = ID(1);

function tables(mode: string) {
  return {
    production: [{ id: ID(10), user_id: ME, session_id: ID(20), language: "it", text: "Ciao a tutti", mode, client_event_id: ID(30) }],
    profile: [{ user_id: ME, native_language: "fr", time_zone: "Europe/Paris" }],
    session: [{ id: ID(20), user_id: ME, plan: {}, format: 15 }],
    enrollment: [{ user_id: ME, language: "it", purpose: null, target_level: null }],
    skill_estimate: [],
  };
}

describe("readContext", () => {
  it.each([["writing", "writing"], ["spoken", "spoken"]])("reads a %s production and names its mode", async (stored, mode) => {
    const store = createWritingFeedbackStore(tableFake(tables(stored)).client);
    expect(await store.readContext(ME, ID(10))).toMatchObject({ productionId: ID(10), text: "Ciao a tutti", mode });
  });

  it("does not read any other kind of production", async () => {
    const store = createWritingFeedbackStore(tableFake(tables("speaking")).client);
    expect(await store.readContext(ME, ID(10))).toBeNull();
  });
});
