import { describe, expect, it } from "vitest";
import { ASSESSMENT_LIMITS } from "@/lib/schemas/assessment";
import { CEFR_LEVELS } from "@/lib/schemas/common";
import { audioPublicPath, checkDuration, ffmpegArgs, speakingPace } from "./audio";

describe("audioPublicPath", () => {
  it("is the m4a under the language folder", () => {
    expect(audioPublicPath("ru", "ru-b1-1")).toBe("/assessment/ru/ru-b1-1.m4a");
  });
});

describe("ffmpegArgs", () => {
  const args = ffmpegArgs("in put.opus", "out.m4a");
  const after = (flag: string) => args[args.indexOf(flag) + 1];

  it("reads the input as one argument and writes the output last", () => {
    expect(after("-i")).toBe("in put.opus");
    expect(args.at(-1)).toBe("out.m4a");
  });

  it("outputs mono 44.1 kHz AAC 64 kb/s, without video nor original metadata", () => {
    expect(after("-ac")).toBe("1");
    expect(after("-ar")).toBe("44100");
    expect(after("-c:a")).toBe("aac");
    expect(after("-b:a")).toBe("64k");
    expect(args).toContain("-vn");
    expect(after("-map_metadata")).toBe("-1");
    expect(after("-movflags")).toBe("+faststart");
  });

  it("trims both ends and normalises the loudness, in that order", () => {
    const filters = after("-af").split(",");
    expect(filters.filter((f) => f.startsWith("silenceremove"))).toHaveLength(2);
    expect(filters.filter((f) => f === "areverse")).toHaveLength(2);
    expect(filters.at(-1)).toMatch(/^loudnorm/);
    expect(filters.indexOf("areverse")).toBeLessThan(filters.findIndex((f) => f.startsWith("loudnorm")));
  });
});

describe("checkDuration", () => {
  it("accepts the target and 30 % around it", () => {
    expect(checkDuration(20, "A1")).toEqual({ ok: true, target: 20, min: 14, max: 26 });
    expect(checkDuration(14, "A1").ok).toBe(true);
    expect(checkDuration(26, "A1").ok).toBe(true);
    expect(checkDuration(45.5, "B1").ok).toBe(true);
  });

  it("refuses what is too short or too long", () => {
    expect(checkDuration(13.9, "A1").ok).toBe(false);
    expect(checkDuration(26.1, "A1").ok).toBe(false);
    expect(checkDuration(24.4, "B1").ok).toBe(false);
  });

  it("takes the target of each level", () => {
    for (const level of CEFR_LEVELS) expect(checkDuration(1, level).target).toBe(ASSESSMENT_LIMITS[level].seconds);
  });
});

describe("speakingPace", () => {
  it("goes from slow to natural", () => {
    expect(speakingPace("A1")).toMatch(/lent/);
    expect(speakingPace("C2")).toBe("naturel");
  });
});
