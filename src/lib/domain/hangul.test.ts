import { describe, expect, it } from "vitest";
import { decomposeHangul, HANGUL_VOWELS } from "./hangul";

const chars = (word: string) => decomposeHangul(word).map((t) => t.char).join("");

describe("decomposeHangul", () => {
  it("splits a block into initial, vowel and final", () => {
    expect(decomposeHangul("한")).toEqual([
      { char: "ㅎ", position: "initial" },
      { char: "ㅏ", position: "vowel" },
      { char: "ㄴ", position: "final" },
    ]);
    expect(decomposeHangul("아")).toEqual([
      { char: "ㅇ", position: "initial" },
      { char: "ㅏ", position: "vowel" },
    ]);
  });

  it("handles the first and last blocks and the doubled consonants", () => {
    expect(chars("가")).toBe("ㄱㅏ");
    expect(chars("힣")).toBe("ㅎㅣㅎ");
    expect(chars("꽃")).toBe("ㄲㅗㅊ");
    expect(chars("왜")).toBe("ㅇㅙ");
  });

  it("splits compound finals in two final tokens", () => {
    expect(decomposeHangul("닭").slice(2)).toEqual([
      { char: "ㄹ", position: "final" },
      { char: "ㄱ", position: "final" },
    ]);
    expect(chars("값")).toBe("ㄱㅏㅂㅅ");
    expect(chars("앉")).toBe("ㅇㅏㄴㅈ");
    expect(chars("없")).toBe("ㅇㅓㅂㅅ");
    expect(chars("핥")).toBe("ㅎㅏㄹㅌ");
  });

  it("passes what is not a syllable block through, without position", () => {
    expect(decomposeHangul("a 1!")).toEqual([{ char: "a" }, { char: " " }, { char: "1" }, { char: "!" }]);
    expect(decomposeHangul("ㄱ")).toEqual([{ char: "ㄱ" }]);
  });

  it("exposes the 21 vowels", () => {
    expect(HANGUL_VOWELS.size).toBe(21);
    expect(HANGUL_VOWELS.has("ㅏ")).toBe(true);
    expect(HANGUL_VOWELS.has("ㄱ")).toBe(false);
  });
});
