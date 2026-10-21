import { describe, expect, it } from "vitest";
import { findLocalVoice } from "./speech-voices";

describe("findLocalVoice", () => {
  it("matches the primary subtag, whatever the region or separator", () => {
    const de = { lang: "de-DE", localService: true };
    const pt = { lang: "pt_BR", localService: true };
    expect(findLocalVoice([{ lang: "en-US", localService: true }, de], "de")).toBe(de);
    expect(findLocalVoice([pt], "pt")).toBe(pt);
    expect(findLocalVoice([{ lang: "ZH-cn", localService: true }], "zh")).not.toBeNull();
  });

  it("keeps only the given regions when a region speaks another variety", () => {
    const cantonese = { lang: "zh-HK", localService: true };
    const mandarin = { lang: "zh_TW", localService: true };
    expect(findLocalVoice([cantonese], "zh", ["CN", "TW"])).toBeNull();
    expect(findLocalVoice([cantonese, mandarin], "zh", ["CN", "TW"])).toBe(mandarin);
    expect(findLocalVoice([{ lang: "zh", localService: true }], "zh", ["CN"])).toBeNull();
  });

  it("ignores voices that are not local, so nothing is sent to a third party", () => {
    expect(findLocalVoice([{ lang: "de-DE", localService: false }], "de")).toBeNull();
  });

  it("does not confuse languages sharing a prefix, and handles an empty list", () => {
    expect(findLocalVoice([{ lang: "nl-NL", localService: true }], "n")).toBeNull();
    expect(findLocalVoice([{ lang: "id-ID", localService: true }], "it")).toBeNull();
    expect(findLocalVoice([], "de")).toBeNull();
  });
});
