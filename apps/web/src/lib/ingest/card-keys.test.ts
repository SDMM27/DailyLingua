import type { ReviewMode } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { cardAcceptList, cardKeyForMode, expectedCardMode, filterReviewModes } from "./card-keys";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("expectedCardMode", () => {
  it("is the mode the card was served in, when it was served", () => {
    expect(expectedCardMode({ stability: 30, context: "una frase" }, "recognition")).toBe("recognition");
    expect(expectedCardMode({ stability: null, context: null }, "listening")).toBe("listening");
  });

  it("is the variant of core for a card never served: a choice below 3 days, typing above", () => {
    expect(expectedCardMode({ stability: null, context: null }, undefined)).toBe("recognition");
    expect(expectedCardMode({ stability: 2.9, context: null }, undefined)).toBe("recognition");
    expect(expectedCardMode({ stability: 5, context: null }, undefined)).toBe("production");
    expect(expectedCardMode({ stability: 20, context: "  " }, undefined)).toBe("production");
    expect(expectedCardMode({ stability: 20, context: "una frase" }, undefined)).toBe("production");
  });
});

describe("cardKeyForMode", () => {
  const card = { id: ID(1), front: "casa", payload: { accept: ["la casa", 3, "", "casa"] } };

  it("has the card id as the option id in recognition and listening, and no written form", () => {
    expect(cardKeyForMode(card, "recognition")).toEqual({ optionId: ID(1), accept: [] });
    expect(cardKeyForMode(card, "listening")).toEqual({ optionId: ID(1), accept: [] });
  });

  it("types the front and the accepted strings in production, with no option id", () => {
    expect(cardKeyForMode(card, "production")).toEqual({ optionId: null, accept: ["casa", "la casa"] });
    expect(cardAcceptList({ front: "casa", payload: null })).toEqual(["casa"]);
    expect(cardAcceptList({ front: "casa", payload: { accept: "nope" } })).toEqual(["casa"]);
  });
});

describe("filterReviewModes", () => {
  const modes = new Map<string, ReviewMode>([[ID(1), "recognition"]]);
  const review = (cardId: string, mode: string, id = ID(50)) => ({ clientEventId: id, kind: "review_attempt", payload: { cardId, mode, answer: "x" } });

  it("refuses a review whose mode is not the expected one, with invalid_payload", () => {
    const forged = review(ID(1), "production", ID(51));
    const honest = review(ID(1), "recognition", ID(52));
    const { kept, rejected } = filterReviewModes([forged, honest], modes, {});
    expect(kept).toEqual([honest]);
    expect(rejected).toEqual([{ clientEventId: ID(51), reason: "invalid_payload" }]);
  });

  it("leaves to planIngest what is not a mode question: unknown cards, other kinds, hostile entries", () => {
    const events = [review(ID(9), "production"), { clientEventId: ID(60), kind: "session_started", payload: { sessionId: ID(2), mode: "x" } }, null, 7, { kind: "review_attempt" }, { kind: "review_attempt", payload: null }];
    const { kept, rejected } = filterReviewModes(events, modes, {});
    expect(kept).toEqual(events);
    expect(rejected).toEqual([]);
  });

  it("does not refuse the replay of an event already ingested (it is a duplicate, not a forgery)", () => {
    const replay = review(ID(1), "production", ID(53));
    const { kept, rejected } = filterReviewModes([replay], modes, { [ID(53)]: "00112233445566778899aabbccddeeff" });
    expect(kept).toEqual([replay]);
    expect(rejected).toEqual([]);
  });

  it("lets an event without a usable id through (planIngest refuses it as invalid)", () => {
    const noId = { kind: "review_attempt", payload: { cardId: ID(1), mode: "production" } };
    expect(filterReviewModes([noId], modes, {}).kept).toEqual([noId]);
  });
});
