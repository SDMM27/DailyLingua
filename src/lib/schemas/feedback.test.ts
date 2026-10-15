import { describe, expect, it } from "vitest";
import { feedbackInputSchema, isInternalPath } from "./feedback";

describe("feedbackInputSchema", () => {
  it("accepts a category and a message, and trims the message", () => {
    expect(feedbackInputSchema.parse({ category: "bug", message: "  Ça plante  ", page: "/mission" })).toEqual({
      category: "bug",
      message: "Ça plante",
      page: "/mission",
    });
  });

  it("refuses an unknown category", () => {
    expect(feedbackInputSchema.safeParse({ category: "spam", message: "Bonjour" }).success).toBe(false);
  });

  it("refuses a message that is too short once trimmed, or too long", () => {
    expect(feedbackInputSchema.safeParse({ category: "idee", message: "  a  " }).success).toBe(false);
    expect(feedbackInputSchema.safeParse({ category: "idee", message: "x".repeat(2000) }).success).toBe(true);
    expect(feedbackInputSchema.safeParse({ category: "idee", message: "x".repeat(2001) }).success).toBe(false);
  });

  it("drops a page that is not an internal path instead of refusing the feedback", () => {
    for (const page of ["https://evil.example/", "//evil.example", "/\\evil", "mission", "/" + "a".repeat(200)]) {
      expect(feedbackInputSchema.parse({ category: "bug", message: "Bonjour", page }).page).toBeUndefined();
    }
  });
});

describe("isInternalPath", () => {
  it("only accepts paths of this app", () => {
    expect(isInternalPath("/preferences")).toBe(true);
    expect(isInternalPath("/mission?x=1")).toBe(true);
    expect(isInternalPath("//evil.example")).toBe(false);
    expect(isInternalPath("/a\nb")).toBe(false);
  });
});
