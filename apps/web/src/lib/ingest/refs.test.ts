import { describe, expect, it } from "vitest";
import { extractRefs } from "./refs";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("extractRefs", () => {
  it("collects the ids of the events by kind of reference", () => {
    const refs = extractRefs([
      { clientEventId: ID(1), kind: "review_attempt", payload: { cardId: ID(2), deviceId: ID(3) } },
      { clientEventId: ID(4), kind: "reading_progress", payload: { sessionId: ID(5), textId: ID(6), deviceId: ID(3) } },
      { clientEventId: ID(7), kind: "production_submitted", payload: { sessionId: ID(5), productionId: ID(8) } },
    ]);
    expect(refs.clientEventIds).toEqual([ID(1), ID(4), ID(7)]);
    expect(refs.cardIds).toEqual([ID(2)]);
    expect(refs.sessionIds).toEqual([ID(5)]);
    expect(refs.textIds).toEqual([ID(6)]);
    expect(refs.productionIds).toEqual([ID(8)]);
    expect(refs.deviceIds).toEqual([ID(3)]);
  });

  it("does not throw on hostile entries and collects nothing from them", () => {
    const hostile: unknown[] = [null, undefined, 42, "string", [], [ID(1)], {}, { payload: null }, { payload: "x" }, { payload: [] }, { clientEventId: 7, payload: { cardId: 7, sessionId: {}, textId: [ID(2)] } }];
    expect(extractRefs(hostile)).toEqual({ sessionIds: [], cardIds: [], textIds: [], productionIds: [], deviceIds: [], clientEventIds: [] });
  });

  it("keeps only strings in UUID form: a free string never reaches a database filter", () => {
    const refs = extractRefs([
      { clientEventId: "not-a-uuid", payload: { cardId: "a,b)or(id.eq.1", sessionId: `${ID(1)}"`, textId: "", deviceId: "../etc", productionId: ID(2).toUpperCase() } },
    ]);
    expect(refs).toEqual({ sessionIds: [], cardIds: [], textIds: [], productionIds: [ID(2).toUpperCase()], deviceIds: [], clientEventIds: [] });
  });

  it("lists an id once and bounds the lists", () => {
    const same = Array.from({ length: 10 }, () => ({ clientEventId: ID(1), payload: { cardId: ID(2) } }));
    expect(extractRefs(same).cardIds).toEqual([ID(2)]);
    const many = Array.from({ length: 1200 }, (_, i) => ({ clientEventId: ID(10_000 + i), payload: { cardId: ID(20_000 + i) } }));
    expect(extractRefs(many).cardIds).toHaveLength(500);
    expect(extractRefs(many).clientEventIds).toHaveLength(500);
  });
});
