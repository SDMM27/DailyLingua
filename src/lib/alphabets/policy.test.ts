import { describe, expect, it } from "vitest";
import { findVisibleAlphabetGroup, readAlphabetDraftPolicy, visibleAlphabet } from "./policy";

describe("readAlphabetDraftPolicy", () => {
  it("shows drafts by default, except in production", () => {
    expect(readAlphabetDraftPolicy({})).toBe("show");
    expect(readAlphabetDraftPolicy({ VERCEL_ENV: "production" })).toBe("hide");
  });

  it("lets ALPHABET_DRAFTS decide, and fails on an unknown value", () => {
    expect(readAlphabetDraftPolicy({ ALPHABET_DRAFTS: "show", VERCEL_ENV: "production" })).toBe("show");
    expect(readAlphabetDraftPolicy({ ALPHABET_DRAFTS: " hide " })).toBe("hide");
    expect(() => readAlphabetDraftPolicy({ ALPHABET_DRAFTS: "yes" })).toThrow(/ALPHABET_DRAFTS/);
  });

  it("does not read GRAMMAR_DRAFTS", () => {
    expect(readAlphabetDraftPolicy({ GRAMMAR_DRAFTS: "hide" })).toBe("show");
  });
});

describe("visibility of drafts", () => {
  it("hides the unreviewed alphabets only under the hide policy", () => {
    expect(visibleAlphabet("ru", "show")?.language).toBe("ru");
    expect(visibleAlphabet("ru", "hide")).toBeUndefined();
    expect(visibleAlphabet("it", "show")).toBeUndefined();
    expect(findVisibleAlphabetGroup("uk-alphabet-1", "show")?.language).toBe("uk");
    expect(findVisibleAlphabetGroup("uk-alphabet-1", "hide")).toBeUndefined();
    expect(findVisibleAlphabetGroup("uk-alphabet-9", "show")).toBeUndefined();
  });
});
