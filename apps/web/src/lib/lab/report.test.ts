import { describe, expect, it } from "vitest";
import { errorMessage, formatReport, megabytes } from "./report";

describe("lab report", () => {
  it("writes one label: value per line", () => {
    expect(
      formatReport([
        ["A", "1"],
        ["B", "2"],
      ]),
    ).toBe("A: 1\nB: 2");
    expect(formatReport([])).toBe("");
  });

  it("formats megabytes in the language of the interface", () => {
    expect(megabytes(1.5 * 1024 * 1024, "en")).toBe("1.5");
    expect(megabytes(1.5 * 1024 * 1024, "fr")).toBe("1,5");
    expect(megabytes(0, "en")).toBe("0");
  });

  it("names the error type unless it is the generic one", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage(new DOMException("denied", "NotAllowedError"))).toBe("NotAllowedError: denied");
    expect(errorMessage("text")).toBe("text");
  });
});
