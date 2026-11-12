import { describe, expect, it } from "vitest";
import { PUBLIC_PATHS, isPublic } from "./public-paths";
import { safeNextPath } from "./safe-next-path";

describe("isPublic", () => {
  it("lets a visitor reach the sign-in, sign-up and confirmation routes", () => {
    for (const path of ["/sign-in", "/sign-up", "/auth/confirm"]) expect(isPublic(path)).toBe(true);
    expect(isPublic("/auth/confirm/anything")).toBe(true);
  });

  it("protects every other route", () => {
    for (const path of ["/", "/welcome", "/settings", "/settings/extra", "/auth", "/api/anything"]) {
      expect(isPublic(path), path).toBe(false);
    }
  });

  it("does not take a path that only starts like a public one for public", () => {
    expect(isPublic("/sign-in-evil")).toBe(false);
    expect(isPublic("/sign-upgrade")).toBe(false);
  });

  it("lists exactly the public routes", () => {
    expect(PUBLIC_PATHS).toEqual(["/sign-in", "/sign-up", "/auth/confirm"]);
  });
});

describe("safeNextPath", () => {
  it("keeps an internal path", () => {
    expect(safeNextPath("/settings")).toBe("/settings");
    expect(safeNextPath("/welcome?x=1")).toBe("/welcome?x=1");
  });

  it("refuses anything that could leave the site", () => {
    for (const raw of ["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", "/a\nb", "", null, undefined]) {
      expect(safeNextPath(raw), String(raw)).toBe("/");
    }
  });
});
