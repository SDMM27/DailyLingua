import type { SituationUnitSource, UnitItem } from "@dailylingua/schemas";
import { describe, expect, it } from "vitest";
import { checkUnit, wordsOf, type CheckableUnit, type CheckOptions, type UnitViolation } from "./check";
import { FIXTURE_AUDIO, fixtureUnit } from "./units/__fixtures__/it-fixture";

const OPTIONS: CheckOptions = {
  grammarIds: ["it-a1-essere-avere", "it-a1-articles"],
  audioExists: (path) => path === FIXTURE_AUDIO,
};

const codes = (unit: CheckableUnit, options: CheckOptions = OPTIONS): UnitViolation["code"][] =>
  checkUnit(unit, options).map((violation) => violation.code);

/** The fixture with one item replaced. */
function withItem(id: string, patch: Partial<UnitItem>): SituationUnitSource {
  const unit = fixtureUnit();
  return { ...unit, items: unit.items.map((item) => (item.id === id ? ({ ...item, ...patch } as UnitItem) : item)) };
}

describe("checkUnit", () => {
  it("finds nothing in a valid unit", () => {
    expect(checkUnit(fixtureUnit(), OPTIONS)).toEqual([]);
  });

  it("flags an id that does not match the language and level", () => {
    expect(codes({ ...fixtureUnit(), id: "ru-a1-01-fixture" })).toEqual(["bad_id"]);
    expect(codes({ ...fixtureUnit(), level: "A0" })).toEqual(["bad_id"]);
    expect(codes({ ...fixtureUnit(), id: "nope" })).toEqual(["bad_id"]);
  });

  it("flags lessons that are not l1, l2, l3", () => {
    const unit = fixtureUnit();
    const [l1, l2, l3] = unit.lessons;
    expect(codes({ ...unit, lessons: [l2!, l1!, l3!] })).toEqual(["lesson_ids"]);
  });

  it("flags duplicated ids in each scope", () => {
    const unit = fixtureUnit();
    const first = unit.items[0]!;
    expect(codes({ ...unit, items: [...unit.items, first] })).toContain("duplicate_id");
    const line = unit.dialogue.lines[0]!;
    expect(codes({ ...unit, dialogue: { ...unit.dialogue, lines: [...unit.dialogue.lines, line] } })).toContain("duplicate_id");
    const phrase = unit.keyPhrases[0]!;
    expect(codes({ ...unit, keyPhrases: [...unit.keyPhrases, phrase] })).toContain("duplicate_id");
    const speaker = unit.dialogue.speakers[0]!;
    expect(codes({ ...unit, dialogue: { ...unit.dialogue, speakers: [speaker, speaker] } })).toContain("duplicate_id");
    const turn = unit.conversation.turns[0]!;
    expect(codes({ ...unit, conversation: { turns: [turn, turn] } })).toContain("duplicate_id");
    expect(codes({ ...unit, canDo: [unit.canDo[0]!, unit.canDo[0]!] })).toContain("duplicate_id");
    expect(codes(withItem("i1", { options: [{ id: "a", text: "x" }, { id: "a", text: "y" }] } as Partial<UnitItem>))).toContain("duplicate_id");
  });

  it("flags a reference to an item that does not exist, wherever it is", () => {
    const unit = fixtureUnit();
    expect(codes({ ...unit, grammar: { summary: unit.grammar!.summary, itemIds: ["i4", "ghost"] } })).toEqual(["unknown_item"]);
    const lessons = structuredClone(unit.lessons);
    lessons[0]!.steps[0]!.itemIds.push("ghost");
    expect(codes({ ...unit, lessons })).toEqual(["unknown_item"]);
    const turns = [{ ...unit.conversation.turns[0]!, itemId: "ghost" }];
    expect(codes({ ...unit, conversation: { turns } })).toEqual(["unknown_item"]);
    const test = { ...unit.test, itemIds: [...unit.test.itemIds.slice(0, 9), "ghost"] };
    expect(codes({ ...unit, test })).toEqual(expect.arrayContaining(["unknown_item"]));
  });

  it("flags an item that belongs to no step and not to the test", () => {
    const unit = fixtureUnit();
    const extra = { ...unit.items[0]!, id: "i11" } as UnitItem;
    expect(codes({ ...unit, items: [...unit.items, extra] })).toEqual(["orphan_item"]);
  });

  it("flags a test item never practised in a step (the test step does not count)", () => {
    const unit = fixtureUnit();
    const lessons = structuredClone(unit.lessons);
    lessons[0]!.steps[0]!.itemIds = ["i1"]; // i2 now only in the test
    expect(codes({ ...unit, lessons })).toEqual(["test_item_unseen"]);
    const lessons2 = structuredClone(unit.lessons);
    lessons2[2]!.steps[1]!.itemIds = ["i2"];
    lessons2[0]!.steps[0]!.itemIds = ["i1"];
    expect(codes({ ...unit, lessons: lessons2 })).toEqual(["test_item_unseen"]);
  });

  it("flags a test that is not 10 items long or does not pass at 8", () => {
    const unit = fixtureUnit();
    const short = { ...unit.test, itemIds: unit.test.itemIds.slice(0, 9) } as SituationUnitSource["test"];
    expect(codes({ ...unit, test: short })).toContain("test_size");
    expect(codes({ ...unit, test: { ...unit.test, passScore: 7 as 8 } })).toEqual(["pass_score"]);
  });

  it("flags a dialogue that does not have exactly two speakers", () => {
    const unit = fixtureUnit();
    const one = { ...unit.dialogue, speakers: unit.dialogue.speakers.slice(0, 1) } as SituationUnitSource["dialogue"];
    expect(codes({ ...unit, dialogue: one })).toEqual(expect.arrayContaining(["speaker_count", "unknown_speaker"]));
  });

  it("flags a speaker or a turn that is not one of the speakers", () => {
    const unit = fixtureUnit();
    const lines = [{ ...unit.dialogue.lines[0]!, speaker: "bob" }, ...unit.dialogue.lines.slice(1)];
    expect(codes({ ...unit, dialogue: { ...unit.dialogue, lines } })).toEqual(["unknown_speaker"]);
    const turns = [{ ...unit.conversation.turns[0]!, speaker: "bob" }];
    expect(codes({ ...unit, conversation: { turns } })).toEqual(["unknown_speaker"]);
  });

  it("flags a key phrase that points at a line that does not exist", () => {
    const unit = fixtureUnit();
    const keyPhrases = [{ ...unit.keyPhrases[0]!, lineId: "d99" }, ...unit.keyPhrases.slice(1)];
    expect(codes({ ...unit, keyPhrases })).toEqual(["unknown_line"]);
  });

  it("flags a voice that is not cleared", () => {
    const unit = fixtureUnit();
    const speakers = [{ ...unit.dialogue.speakers[0]!, voice: "it_IT-riccardo-x_low" }, unit.dialogue.speakers[1]!] as SituationUnitSource["dialogue"]["speakers"];
    expect(codes({ ...unit, dialogue: { ...unit.dialogue, speakers } })).toEqual(["voice_not_cleared"]);
  });

  it("flags a word the unit never shows in an order, cloze or type item", () => {
    expect(codes(withItem("i3", { tokens: ["Come", "ti", "chiamerai"] } as Partial<UnitItem>))).toEqual(["unknown_word"]);
    expect(codes(withItem("i4", { accept: ["siamo"] } as Partial<UnitItem>))).toEqual(["unknown_word"]);
    expect(codes(withItem("i5", { accept: ["Piacere", "Salve"] } as Partial<UnitItem>))).toEqual(["unknown_word"]);
  });

  it("accepts a word known only from a gloss, and compares after normalisation", () => {
    const unit = fixtureUnit();
    const glosses = [...unit.dialogue.glosses, { form: "arrivederci", lemma: "arrivederci", meaning: { fr: "au revoir", en: "bye" }, note: null, isNew: true }];
    const withGloss = { ...unit, dialogue: { ...unit.dialogue, glosses } };
    const items = withGloss.items.map((item) => (item.id === "i5" ? ({ ...item, accept: ["Arrivederci!"] } as UnitItem) : item));
    expect(codes({ ...withGloss, items })).toEqual([]);
    expect(codes(withItem("i4", { accept: ["SONO"] } as Partial<UnitItem>))).toEqual([]);
  });

  it("splits an elision at the apostrophe", () => {
    expect(wordsOf("it", "L'acqua, per favore!")).toEqual(["l", "acqua", "per", "favore"]);
  });

  it("flags an audio path whose file is missing, wherever it is", () => {
    expect(codes(fixtureUnit(), { ...OPTIONS, audioExists: () => false })).toEqual(["missing_audio"]);
    const unit = fixtureUnit();
    const lines = [{ ...unit.dialogue.lines[0]!, audio: "it/none.mp3" }, ...unit.dialogue.lines.slice(1)];
    expect(codes({ ...unit, dialogue: { ...unit.dialogue, lines } })).toEqual(["missing_audio"]);
    expect(codes({ ...unit, dialogue: { ...unit.dialogue, audio: "it/none.mp3" } })).toEqual(["missing_audio"]);
    const keyPhrases = [{ ...unit.keyPhrases[0]!, audio: "it/none.mp3" }, ...unit.keyPhrases.slice(1)];
    expect(codes({ ...unit, keyPhrases })).toEqual(["missing_audio"]);
    const turns = [{ ...unit.conversation.turns[0]!, audio: "it/none.mp3" }, unit.conversation.turns[1]!];
    expect(codes({ ...unit, conversation: { turns } })).toEqual(["missing_audio"]);
  });

  it("flags a grammar point that is not in the curriculum", () => {
    expect(codes({ ...fixtureUnit(), grammarPointId: "it-a1-nope" })).toEqual(["unknown_grammar_point"]);
    expect(codes({ ...fixtureUnit(), grammarPointId: null })).toEqual([]);
  });

  it("flags an mcq whose answer is not one of its options", () => {
    expect(codes(withItem("i1", { answer: "z" } as Partial<UnitItem>))).toEqual(["mcq_answer"]);
  });

  it("flags a listening audio text with words the unit never shows", () => {
    expect(codes(withItem("i2", { audioText: "Ciao, arrivederci" } as Partial<UnitItem>))).toEqual(["unknown_word"]);
    expect(codes(withItem("i2", { audioText: "Come ti chiami?" } as Partial<UnitItem>))).toEqual([]);
  });

  it("allows a transliteration only for a language written in a non-Latin script", () => {
    const unit = fixtureUnit();
    const lines = [{ ...unit.dialogue.lines[0]!, transliteration: "chao" }, ...unit.dialogue.lines.slice(1)];
    expect(codes({ ...unit, dialogue: { ...unit.dialogue, lines } })).toEqual(["transliteration_latin_script"]);
    const turns = [{ ...unit.conversation.turns[0]!, transliteration: "chao" }, unit.conversation.turns[1]!];
    expect(codes({ ...unit, conversation: { turns } })).toEqual(["transliteration_latin_script"]);
    // null and undefined are fine in Latin script.
    expect(codes({ ...unit, dialogue: { ...unit.dialogue, lines: unit.dialogue.lines.map((line) => ({ ...line, transliteration: null })) } })).toEqual([]);
  });

  it("accepts a transliteration for a language written in Cyrillic", () => {
    const unit = fixtureUnit();
    const lines = unit.dialogue.lines.map((line) => ({ ...line, transliteration: "privet" }));
    const ru: SituationUnitSource = { ...unit, id: "ru-a1-01-fixture", language: "ru", grammarPointId: null, dialogue: { ...unit.dialogue, lines } };
    // The fixture words are Latin, so only the transliteration rule is under test: no violation of that code.
    expect(codes(ru)).not.toContain("transliteration_latin_script");
  });
});
