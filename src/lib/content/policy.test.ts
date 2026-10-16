import { describe, expect, it } from "vitest";
import { DEFAULT_READABLE_ACCESS, isReadable } from "./policy";

describe("isReadable", () => {
  it("only reads free sources by default", () => {
    expect(DEFAULT_READABLE_ACCESS).toEqual(["free"]);
    expect(isReadable("free")).toBe(true);
    expect(isReadable("metered")).toBe(false);
    expect(isReadable("paywalled")).toBe(false);
  });

  it("follows the access levels the user can read", () => {
    const readable = ["free", "metered"] as const;
    expect(isReadable("free", readable)).toBe(true);
    expect(isReadable("metered", readable)).toBe(true);
    expect(isReadable("paywalled", readable)).toBe(false);
  });
});
