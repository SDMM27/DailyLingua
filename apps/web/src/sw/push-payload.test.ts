import { describe, expect, it } from "vitest";
import { parsePushPayload } from "./push-payload";

describe("parsePushPayload", () => {
  it("reads a title, a body and an address of the app", () => {
    expect(parsePushPayload(JSON.stringify({ title: "T", body: "B", url: "/lab" }))).toEqual({ title: "T", body: "B", url: "/lab" });
  });

  it("falls back to the home page for an address that leaves the app", () => {
    for (const url of ["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", 3, undefined]) {
      expect(parsePushPayload(JSON.stringify({ title: "T", url }))?.url, String(url)).toBe("/");
    }
  });

  it("ignores what is not a notification", () => {
    for (const text of [undefined, "", "not json", "null", "[]", JSON.stringify({ body: "no title" }), JSON.stringify({ title: " " })]) {
      expect(parsePushPayload(text), String(text)).toBeNull();
    }
  });

  it("bounds the length of the texts", () => {
    const payload = parsePushPayload(JSON.stringify({ title: "t".repeat(500), body: "b".repeat(2000) }));
    expect(payload?.title).toHaveLength(120);
    expect(payload?.body).toHaveLength(300);
  });
});
