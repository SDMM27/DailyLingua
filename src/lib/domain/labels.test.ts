import { describe, expect, it } from "vitest";
import { TOPICS } from "@/lib/schemas/preferences";
import { topicLabel } from "./labels";

describe("topicLabel", () => {
  it("capitalises the first letter, accents included", () => {
    expect(topicLabel("économie")).toBe("Économie");
    expect(topicLabel("société")).toBe("Société");
  });

  it("only changes the first letter of every domain", () => {
    for (const topic of TOPICS) expect(topicLabel(topic).slice(1)).toBe(topic.slice(1));
  });
});
