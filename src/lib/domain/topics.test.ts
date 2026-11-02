import { describe, expect, it } from "vitest";
import { TOPICS } from "@/lib/schemas/preferences";
import { availableTopics } from "./topics";

describe("availableTopics", () => {
  it("keeps the domains with at least 3 contents, in the order of TOPICS", () => {
    const counts = { [TOPICS[5]]: 3, [TOPICS[1]]: 10, [TOPICS[2]]: 2 };
    expect(availableTopics(counts)).toEqual([TOPICS[1], TOPICS[5]]);
  });

  it("takes the minimum as a parameter", () => {
    expect(availableTopics({ [TOPICS[0]]: 1 }, 1)).toEqual([TOPICS[0]]);
    expect(availableTopics({ [TOPICS[0]]: 1 })).toEqual([]);
    expect(availableTopics({})).toEqual([]);
  });
});
