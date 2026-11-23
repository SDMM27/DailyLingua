import type { ScriptUnitSource } from "@dailylingua/schemas";

const l10n = (fr: string, en = fr) => ({ fr, en });

/** The audio file the script fixture points at; tests tell `audioExists` about it. */
export const SCRIPT_FIXTURE_AUDIO = "/unit-audio/ru/ru-a0-01-fixture/i4.mp3";

/** Lower-case letter to Latin, for the six letters of the fixture (the real mapping is the legacy alphabet module's). */
export const SCRIPT_FIXTURE_LATIN: Record<string, string> = { а: "a", к: "k", м: "m", о: "o", т: "t", е: "e" };

/** A small valid writing unit (russian, first group of letters): every invariant of `checkUnit` holds. */
export function scriptFixtureUnit(): ScriptUnitSource {
  const explain = l10n("Explication", "Explanation");
  const letter = (upper: string, lower: string, latin: string, name: string, kind: "same" | "new", word: string, translation: string) => ({
    upper, lower, latin, name, kind, lookalike: null,
    sound: l10n(`comme « ${latin} »`, `like "${latin}"`),
    example: { word, translation: l10n(translation), audio: null },
  });
  const word = (n: number, text: string, latin: string, fr: string) => ({ id: `w${n}`, text, latin, translation: l10n(fr), audio: null });
  const mcq = (id: string, prompt: string, options: [string, string], answer: "a" | "b" = "a") => ({
    id, kind: "mcq" as const, prompt, options: [{ id: "a", text: options[0] }, { id: "b", text: options[1] }], answer, audio: null, explain,
  });
  return {
    id: "ru-a0-01-fixture",
    language: "ru",
    level: "A0",
    order: 1,
    kind: "script",
    title: l10n("Les lettres familières", "Familiar letters"),
    situation: l10n("Tu lis tes premiers mots.", "You read your first words."),
    minutes: 12,
    canDo: [
      { id: "c1", text: l10n("Lire six lettres", "Read six letters") },
      { id: "c2", text: l10n("Lire un mot court", "Read a short word") },
    ],
    voice: "ru_RU-denis-medium",
    letters: [
      letter("А", "а", "a", "а", "new", "ма́ма", "maman"),
      letter("К", "к", "k", "ка", "new", "кот", "chat"),
      letter("М", "м", "m", "эм", "new", "мак", "coquelicot"),
      letter("О", "о", "o", "о", "new", "кот", "chat"),
      letter("Т", "т", "t", "тэ", "new", "там", "là-bas"),
      letter("Е", "е", "e", "е", "new", "те́ма", "thème"),
    ],
    words: [
      word(1, "ма́ма", "mama", "maman"),
      word(2, "кот", "kot", "chat"),
      word(3, "там", "tam", "là-bas"),
      word(4, "кто", "kto", "qui"),
      word(5, "мак", "mak", "coquelicot"),
      word(6, "те́ма", "tema", "thème"),
      word(7, "ток", "tok", "courant"),
      word(8, "ком", "kom", "motte"),
    ],
    items: [
      mcq("i1", "к", ["k", "m"]),
      mcq("i2", "м", ["m", "t"]),
      {
        id: "i3", kind: "match" as const, explain,
        pairs: [{ left: "а", right: l10n("a") }, { left: "к", right: l10n("k") }, { left: "т", right: l10n("t") }],
      },
      {
        id: "i4", kind: "listen_mcq" as const, prompt: l10n("Quelle lettre entends-tu ?", "Which letter do you hear?"),
        options: [{ id: "a", text: "к" }, { id: "b", text: "м" }], answer: "a", audio: SCRIPT_FIXTURE_AUDIO, audioText: "к", explain,
      },
      mcq("i5", "кот", ["chat", "maison"]),
      { id: "i6", kind: "type" as const, prompt: l10n("Écris en lettres latines.", "Write it in Latin letters."), accept: ["mak"], explain },
      {
        id: "i7", kind: "listen_mcq" as const, prompt: l10n("Quel mot entends-tu ?", "Which word do you hear?"),
        options: [{ id: "a", text: "кот" }, { id: "b", text: "там" }], answer: "a", audio: SCRIPT_FIXTURE_AUDIO, audioText: "кот", explain,
      },
      {
        id: "i8", kind: "listen_mcq" as const, prompt: l10n("Quel mot entends-tu ?", "Which word do you hear?"),
        options: [{ id: "a", text: "там" }, { id: "b", text: "мак" }], answer: "a", audio: SCRIPT_FIXTURE_AUDIO, audioText: "там", explain,
      },
      mcq("i9", "там", ["là-bas", "chat"]),
      mcq("i10", "кто", ["qui", "thème"]),
    ],
    lessons: [
      { id: "l1", steps: [{ step: "letters", itemIds: ["i1", "i2", "i3"], threshold: 0.6 }, { step: "sounds", itemIds: ["i4"], threshold: 0.6 }] },
      { id: "l2", steps: [{ step: "words", itemIds: ["i5", "i6", "i9", "i10"], threshold: 0.6 }, { step: "reading", itemIds: ["i7", "i8"], threshold: 0.6 }] },
      { id: "l3", steps: [{ step: "test", itemIds: ["i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8", "i9", "i10"], threshold: 0 }] },
    ],
    test: { itemIds: ["i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8", "i9", "i10"], passScore: 8 },
    aiReview: null,
    status: "draft",
  };
}
