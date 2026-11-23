import { createHash } from "node:crypto";
import { stableStringify } from "@dailylingua/core";
import { unitSchema, type UnitSource } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../sha256";
import { fixtureUnit } from "./__fixtures__/it-fixture";
import { buildRegistry, isPublished, unitVersion, unitsIn } from "./registry";

describe("sha256Hex", () => {
  it("matches the published test vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("agrees with node:crypto on UTF-8 text and on lengths around the block boundaries", () => {
    const samples = ["é", "Привет, как дела?", "Come ti chiami? ☺", ...[54, 55, 56, 63, 64, 65, 119, 120, 1000].map((n) => "x".repeat(n))];
    for (const sample of samples) expect(sha256Hex(sample), sample.slice(0, 20)).toBe(createHash("sha256").update(sample).digest("hex"));
  });
});

describe("unitVersion", () => {
  it("is 12 hex characters", () => {
    expect(unitVersion(fixtureUnit())).toMatch(/^[0-9a-f]{12}$/);
  });

  it("does not depend on the order of the keys", () => {
    const unit = fixtureUnit();
    const reversed = Object.fromEntries(Object.entries(unit).reverse()) as UnitSource;
    expect(unitVersion(reversed)).toBe(unitVersion(unit));
  });

  it("is the head of the SHA-256 of the canonical JSON", () => {
    const unit = fixtureUnit();
    expect(unitVersion(unit)).toBe(createHash("sha256").update(stableStringify(unit)).digest("hex").slice(0, 12));
  });

  it("changes with any change of content", () => {
    const unit = fixtureUnit();
    expect(unitVersion({ ...unit, minutes: unit.minutes + 1 })).not.toBe(unitVersion(unit));
    const first = unit.dialogue.lines[0];
    if (!first) throw new Error("fixture has no line");
    const lines = [{ ...first, text: `${first.text}!` }, ...unit.dialogue.lines.slice(1)];
    expect(unitVersion({ ...unit, dialogue: { ...unit.dialogue, lines } })).not.toBe(unitVersion(unit));
  });
});

describe("buildRegistry", () => {
  const second = (): UnitSource => ({ ...fixtureUnit(), id: "it-a1-02-fixture", order: 2 });

  it("keys the units by id and adds the version", () => {
    const registry = buildRegistry([fixtureUnit()]);
    const unit = registry["it-a1-01-fixture"];
    expect(unit?.version).toBe(unitVersion(fixtureUnit()));
    expect(unit && unitSchema.safeParse(unit).success).toBe(false); // the version is not part of a source
    const { version, ...source } = unit as NonNullable<typeof unit>;
    expect(version).toMatch(/^[0-9a-f]{12}$/);
    expect(unitSchema.safeParse(source).success).toBe(true);
  });

  it("refuses an invalid source and names it", () => {
    expect(() => buildRegistry([{ ...fixtureUnit(), minutes: 0 }])).toThrow(/it-a1-01-fixture/);
    expect(() => buildRegistry([42])).toThrow(/Invalid unit/);
  });

  it("refuses a duplicated id", () => {
    expect(() => buildRegistry([fixtureUnit(), fixtureUnit()])).toThrow(/Duplicate unit id/);
  });

  it("lists the units of a language sorted by order", () => {
    const ru: UnitSource = { ...fixtureUnit(), id: "ru-a1-01-fixture", language: "ru" };
    const registry = buildRegistry([second(), ru, fixtureUnit()]);
    expect(unitsIn(registry, "it").map((unit) => unit.order)).toEqual([1, 2]);
    expect(unitsIn(registry, "ru").map((unit) => unit.id)).toEqual(["ru-a1-01-fixture"]);
    expect(unitsIn(registry, "de")).toEqual([]);
  });
});

describe("isPublished", () => {
  it("is true once an AI review is recorded", () => {
    expect(isPublished({ status: "draft" })).toBe(false);
    expect(isPublished({ status: "reviewed" })).toBe(false);
    expect(isPublished({ status: "published" })).toBe(true);
  });
});
