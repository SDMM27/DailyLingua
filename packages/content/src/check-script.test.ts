import { unitSchema, type ScriptUnitSource, type UnitItem } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { checkUnit, type CheckOptions, type UnitViolation } from "./check";
import { SCRIPT_FIXTURE_AUDIO, SCRIPT_FIXTURE_LATIN, scriptFixtureUnit } from "./units/__fixtures__/ru-script-fixture";

const OPTIONS: CheckOptions = {
  grammarIds: [],
  audioExists: (path) => path === SCRIPT_FIXTURE_AUDIO,
  letterLatin: SCRIPT_FIXTURE_LATIN,
};

const codes = (unit: ScriptUnitSource, options: CheckOptions = OPTIONS): UnitViolation["code"][] =>
  checkUnit(unit, options).map((violation) => violation.code);

describe("checkUnit on a writing unit", () => {
  it("accepts the fixture, which also parses", () => {
    expect(checkUnit(scriptFixtureUnit(), OPTIONS)).toEqual([]);
    expect(unitSchema.safeParse(scriptFixtureUnit()).success).toBe(true);
  });

  it("flags a word that uses a letter not taught yet", () => {
    const unit = scriptFixtureUnit();
    const words = unit.words.map((word) => (word.id === "w7" ? { ...word, text: "дом", latin: "dom" } : word));
    expect(codes({ ...unit, words })).toContain("letter_unknown");
  });

  it("accepts a word with letters of an earlier unit, and refuses them without knownLetters", () => {
    const unit = scriptFixtureUnit();
    const words = unit.words.map((word) => (word.id === "w7" ? { ...word, text: "рот", latin: "rot" } : word));
    const letterLatin = { ...SCRIPT_FIXTURE_LATIN, р: "r" };
    expect(codes({ ...unit, words }, { ...OPTIONS, letterLatin })).toEqual(["letter_unknown"]);
    expect(codes({ ...unit, words }, { ...OPTIONS, knownLetters: ["р"], letterLatin })).toEqual([]);
  });

  it("ignores stress marks, and Latin text in items", () => {
    const unit = scriptFixtureUnit();
    // "ма́ма" carries a combining acute; the typed answer of i6 is Latin.
    expect(unit.words[0]?.text).toContain("́");
    expect(codes(unit)).toEqual([]);
  });

  it("flags a Cyrillic text of an item that uses a letter not taught yet", () => {
    const unit = scriptFixtureUnit();
    const items = unit.items.map((item) => (item.id === "i1" ? ({ ...item, prompt: "д" } as UnitItem) : item));
    expect(codes({ ...unit, items })).toEqual(["letter_unknown"]);
  });

  it("flags a wrong transliteration of a word and of a letter", () => {
    const unit = scriptFixtureUnit();
    const words = unit.words.map((word) => (word.id === "w2" ? { ...word, latin: "cot" } : word));
    expect(codes({ ...unit, words })).toEqual(["latin_mismatch"]);
    const letters = unit.letters.map((letter) => (letter.lower === "к" ? { ...letter, latin: "c" } : letter));
    expect(codes({ ...unit, letters })).toEqual(["latin_mismatch"]);
  });

  it("flags a letter taught twice, in the unit or by an earlier one", () => {
    const unit = scriptFixtureUnit();
    const [first, ...rest] = unit.letters;
    expect(codes({ ...unit, letters: [first!, first!, ...rest] })).toEqual(["letter_duplicate"]);
    expect(codes(unit, { ...OPTIONS, knownLetters: ["а"] })).toEqual(["letter_duplicate"]);
  });

  it("flags a false friend without lookalike and a lookalike on another letter", () => {
    const unit = scriptFixtureUnit();
    const friend = unit.letters.map((letter) => (letter.lower === "к" ? { ...letter, kind: "false-friend" as const } : letter));
    expect(codes({ ...unit, letters: friend })).toEqual(["lookalike"]);
    const stray = unit.letters.map((letter) => (letter.lower === "к" ? { ...letter, lookalike: "k" } : letter));
    expect(codes({ ...unit, letters: stray })).toEqual(["lookalike"]);
  });

  it("flags an upper case that does not match", () => {
    const unit = scriptFixtureUnit();
    const letters = unit.letters.map((letter) => (letter.lower === "к" ? { ...letter, upper: "М" } : letter));
    expect(codes({ ...unit, letters })).toEqual(["letter_case"]);
  });

  it("flags a voice that is not cleared", () => {
    expect(codes({ ...scriptFixtureUnit(), voice: "ru_RU-someone-medium" })).toEqual(["voice_not_cleared"]);
  });

  it("flags lessons that do not follow the writing steps", () => {
    const unit = scriptFixtureUnit();
    const lessons = unit.lessons.map((lesson) =>
      lesson.id === "l1" ? { ...lesson, steps: lesson.steps.map((step) => (step.step === "letters" ? { ...step, step: "exercises" as const } : step)) } : lesson,
    );
    expect(codes({ ...unit, lessons })).toEqual(["script_steps"]);
  });

  it("flags a duplicate word id and a missing audio file", () => {
    const unit = scriptFixtureUnit();
    const [first, second, ...rest] = unit.words;
    expect(codes({ ...unit, words: [first!, { ...second!, id: first!.id }, ...rest] })).toEqual(["duplicate_id"]);
    const words = unit.words.map((word) => (word.id === "w1" ? { ...word, audio: "/unit-audio/ru/missing.mp3" } : word));
    expect(codes({ ...unit, words })).toEqual(["missing_audio"]);
  });
});
