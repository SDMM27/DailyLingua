import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it.each(["/", "/nouveau-mot-de-passe", "/mission?jour=1", "/lire#haut", "/a/b/c"])("keeps %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    ["protocol-relative", "//evil.com"],
    ["backslash", "/\\evil.com"],
    ["backslash later", "/a\\..\\evil.com"],
    ["absolute https", "https://evil.com"],
    ["javascript scheme", "javascript:alert(1)"],
    ["relative", "mission"],
    ["empty", ""],
    ["tab inside", "/\t/evil.com"],
    ["newline inside", "/\n/evil.com"],
    ["slash then tab", "/\t/evil.com/x"],
  ])("rejects %s", (_name, path) => {
    expect(safeNextPath(path)).toBe("/");
  });

  it("falls back for null and undefined", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });

  it("uses the given fallback", () => {
    expect(safeNextPath("//evil.com", "/connexion")).toBe("/connexion");
  });

  it("does not decode: an encoded slash stays on this host", () => {
    // `/%2Fevil.com` is a path on our own origin; the decoded form `//evil.com` is rejected.
    expect(safeNextPath("/%2Fevil.com")).toBe("/%2Fevil.com");
    expect(safeNextPath(decodeURIComponent("/%2Fevil.com"))).toBe("/");
    expect(safeNextPath("/%5Cevil.com")).toBe("/%5Cevil.com");
  });
});
