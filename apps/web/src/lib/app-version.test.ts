import { describe, expect, it } from "vitest";
import { appVersion, isPreviewLabelled } from "./app-version";

describe("appVersion", () => {
  it("is the first 7 characters of the commit hash", () => {
    expect(appVersion({ VERCEL_GIT_COMMIT_SHA: "9a754ef1234567890" })).toBe("9a754ef");
  });

  it("is `local` without a commit hash", () => {
    expect(appVersion({})).toBe("local");
    expect(appVersion({ VERCEL_GIT_COMMIT_SHA: "  " })).toBe("local");
  });
});

describe("isPreviewLabelled", () => {
  it("is on only for NEXT_PUBLIC_PREVIEW_LABEL=1", () => {
    expect(isPreviewLabelled({ NEXT_PUBLIC_PREVIEW_LABEL: "1" })).toBe(true);
    expect(isPreviewLabelled({ NEXT_PUBLIC_PREVIEW_LABEL: "0" })).toBe(false);
    expect(isPreviewLabelled({ NEXT_PUBLIC_PREVIEW_LABEL: "" })).toBe(false);
    expect(isPreviewLabelled({})).toBe(false);
  });
});
