import { describe, expect, it } from "vitest";
import { ALPHABETS } from "@/lib/alphabets";
import { ALPHABET_PRACTICE_MAX, type Alphabet, type AlphabetCard, type AlphabetExercise, type AlphabetLetter } from "@/lib/schemas/alphabet";
import {
  ALPHABET_CHECK_PASS,
  buildAlphabetCheck,
  buildAlphabetExercises,
  gradeAlphabetCheck,
  isAlphabetComplete,
  letterLabel,
  seededRandom,
  transliterate,
} from "./alphabet";
import { stripStress } from "./stress";

const ru = ALPHABETS.ru!;
const uk = ALPHABETS.uk!;
const ko = ALPHABETS.ko!;
const el = ALPHABETS.el!;
const ar = ALPHABETS.ar!;

/** A few kana, enough to read the test words whether or not the full syllabaries are written. */
function kanaFixture(): Alphabet {
  const kana = (lower: string, latin: string, series: "hiragana" | "katakana", kind: "new" | "sign" = "new"): AlphabetLetter => ({
    upper: lower,
    lower,
    name: lower,
    latin,
    kind,
    series,
    soundFr: "test",
    example: { word: lower, translation: "test" },
  });
  const hiragana: [string, string][] = [
    ["し", "shi"], ["ん", "n"], ["き", "ki"], ["ぷ", "pu"], ["ち", "chi"], ["と", "to"], ["で", "de"], ["じ", "ji"],
    ["う", "u"], ["お", "o"],
  ];
  const katakana: [string, string][] = [["コ", "ko"], ["ヒ", "hi"], ["カ", "ka"], ["メ", "me"], ["ラ", "ra"], ["ジ", "ji"], ["ス", "su"]];
  return {
    language: "ja",
    script: "kana",
    version: "2026-10-23",
    letters: [
      ...hiragana.map(([c, l]) => kana(c, l, "hiragana")),
      ...katakana.map(([c, l]) => kana(c, l, "katakana")),
      kana("ゃ", "ya", "hiragana", "sign"),
      kana("ょ", "yo", "hiragana", "sign"),
      kana("っ", "ltu", "hiragana", "sign"),
      kana("ゅ", "yu", "hiragana", "sign"),
      kana("ュ", "yu", "katakana", "sign"),
      kana("ー", "—", "katakana", "sign"),
    ],
    groups: [],
    reviewedOn: null,
  };
}
const ja = ALPHABETS.ja!;

function card(groupId: string): AlphabetCard {
  return {
    id: groupId,
    groupId: groupId as AlphabetCard["groupId"],
    language: "ru",
    status: "learning",
    review: { box: 0, dueOn: "2026-10-21", lastReviewedOn: null, reviewCount: 0 },
    addedOn: "2026-10-21",
  };
}

describe("transliterate", () => {
  it("reads letter by letter, ignoring stress and case", () => {
    expect(transliterate(ru, "ма́ма")).toBe("mama");
    expect(transliterate(ru, "Хорошо́")).toBe("horošo");
    expect(transliterate(ru, "семья́")).toBe("semʹja");
    expect(transliterate(ru, "щи")).toBe("šči");
    expect(transliterate(uk, "хліб")).toBe("chlib");
    expect(transliterate(uk, "ґа́нок")).toBe("ganok");
  });

  it("reads hangul syllables jamo by jamo, with final forms and liaison", () => {
    const readings: Record<string, string> = {
      꽃: "kkot",
      외국: "oeguk",
      사람: "saram",
      아이: "ai",
      빵: "ppang",
      물: "mul",
      엄마: "eomma",
      한국어: "hangugeo",
      옷이: "osi",
      시계: "sigye",
      의사: "uisa",
    };
    for (const [word, reading] of Object.entries(readings)) expect(transliterate(ko, word), word).toBe(reading);
  });

  it("reads Greek with its accents dropped, ς as σ and υ in context", () => {
    const readings: Record<string, string> = {
      βουνό: "vouno",
      αυτό: "afto",
      χορεύω: "chorevō",
      ξένος: "xenos",
      θάλασσα: "thalassa",
      ημέρα: "ēmera",
      Αθήνα: "athēna",
      δέντρο: "dentro",
    };
    for (const [word, reading] of Object.entries(readings)) expect(transliterate(el, word), word).toBe(reading);
  });

  it.each([["a minimal fixture", kanaFixture()], ["the kana of ja.ts", ja]] as const)("reads kana (%s): small ya yu yo, small tsu and the long vowel mark", (_name, kanaAlphabet) => {
    const readings: Record<string, string> = {
      しゃしん: "shashin",
      きっぷ: "kippu",
      ちょっと: "chotto",
      でんしゃ: "densha",
      きょう: "kyou",
      じゅう: "juu",
      コーヒー: "koohii",
      カメラ: "kamera",
      ジュース: "juusu",
      おちゃ: "ocha",
    };
    for (const [word, reading] of Object.entries(readings)) expect(transliterate(kanaAlphabet, word), word).toBe(reading);
  });

  it("reads vocalized Arabic: long vowels, sukun, shadda and the hamza", () => {
    const readings: Record<string, string> = {
      بَاب: "bāb",
      بِنْت: "bint",
      لَيْمُون: "laymūn",
      لَيْلَة: "layla",
      كُلّ: "kull",
      ذَكِيّ: "dhakiyy",
      جَمِيل: "jamīl",
      سُوق: "sūq",
      أَب: "ab",
      سَأَلَ: "saʾala",
      مَدْرَسَة: "madrasa",
      مُدَرِّس: "mudarris",
    };
    for (const [word, reading] of Object.entries(readings)) expect(transliterate(ar, word), word).toBe(reading);
  });

  it("reads a shadda with its vowel in either code-point order, and ignores the tatweel", () => {
    expect(transliterate(ar, "مُدَرِّس")).toBe("mudarris");
    expect(transliterate(ar, "مُدَرِّس".replace("ِّ", "ِّ"))).toBe("mudarris");
    expect(transliterate(ar, "مُدَرِّس".replace("ِّ", "ِّ"))).toBe("mudarris");
    expect(transliterate(ar, "بــاب")).toBe("bāb");
  });

  it("keeps what is not a letter", () => {
    expect(transliterate(ru, "да, нет!")).toBe("da, net!");
  });
});

describe("letterLabel", () => {
  it("shows both cases, or a letter without case once", () => {
    expect(letterLabel({ upper: "Р", lower: "р" })).toBe("Р р");
    expect(letterLabel({ upper: "ㄱ", lower: "ㄱ" })).toBe("ㄱ");
  });

  it("shows the display of a letter that cannot stand alone", () => {
    expect(letterLabel({ upper: "َ", lower: "َ", display: "ـَ" })).toBe("ـَ");
  });
});

describe("seededRandom", () => {
  it("is deterministic and depends on the seed", () => {
    const sequence = (seed: string) => {
      const random = seededRandom(seed);
      return Array.from({ length: 5 }, () => random());
    };
    expect(sequence("a")).toEqual(sequence("a"));
    expect(sequence("a")).not.toEqual(sequence("b"));
    for (const value of sequence("a")) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("buildAlphabetExercises", () => {
  const cases = Object.values(ALPHABETS).flatMap((alphabet) => alphabet!.groups.map((group) => [group.id, alphabet!, group] as const));

  it("returns nothing for an unknown group", () => {
    expect(buildAlphabetExercises(ru, "ru-alphabet-9", "seed")).toEqual([]);
  });

  it("is the same run for the same seed, another for another seed", () => {
    const run = (seed: string) => buildAlphabetExercises(ru, "ru-alphabet-2", seed);
    expect(run("s:2026-10-21")).toEqual(run("s:2026-10-21"));
    expect(run("s:2026-10-21")).not.toEqual(run("s:2026-10-22"));
  });

  describe.each(cases)("%s", (groupId, alphabet, group) => {
    const exercises = buildAlphabetExercises(alphabet, groupId, `${groupId}:2026-10-21`);
    const count = (type: AlphabetExercise["type"]) => exercises.filter((e) => e.type === type).length;

    it("asks about every letter once, then 3 words to read and 2 to hear", () => {
      expect(exercises.length).toBe(group.letters.length + 5);
      expect(exercises.length).toBeLessThanOrEqual(ALPHABET_PRACTICE_MAX);
      expect(count("letter-to-latin") + count("latin-to-letter")).toBe(group.letters.length);
      expect(count("read-word")).toBe(3);
      expect(count("listen-word")).toBe(2);
      const labels = exercises.flatMap((e) =>
        e.type === "letter-to-latin" ? [e.lower] : e.type === "latin-to-letter" ? [e.options[e.answer].split(" ").at(-1)!] : [],
      );
      expect(labels.sort()).toEqual([...group.letters].sort());
    });

    it("offers 4 distinct options with the right one at `answer`", () => {
      for (const e of exercises) {
        expect(e.options).toHaveLength(4);
        expect(new Set(e.options.map((o) => stripStress(o))).size).toBe(4);
        expect(e.answer).toBeGreaterThanOrEqual(0);
        expect(e.answer).toBeLessThan(4);
      }
    });

    it("never asks a sign from its Latin reading, nor offers a letter that reads the same", () => {
      for (const e of exercises) {
        if (e.type !== "latin-to-letter") continue;
        const right = alphabet.letters.find((l) => letterLabel(l) === e.options[e.answer])!;
        expect(right.kind, group.id).not.toBe("sign");
        for (const option of e.options) {
          const letter = alphabet.letters.find((l) => letterLabel(l) === option)!;
          expect(letter.series, option).toBe(right.series);
          if (letter !== right) expect(letter.latin, option).not.toBe(right.latin);
        }
      }
    });

    it("has the right answer", () => {
      for (const e of exercises) {
        const right = e.options[e.answer];
        if (e.type === "letter-to-latin") {
          expect(right).toBe(alphabet.letters.find((l) => l.lower === e.lower)!.latin);
        } else if (e.type === "latin-to-letter") {
          expect(alphabet.letters.find((l) => letterLabel(l) === right)!.latin).toBe(e.latin);
        } else if (e.type === "read-word") {
          expect(right).toBe(transliterate(alphabet, e.word));
        } else {
          expect(right).toBe(e.word);
        }
      }
    });

    it("only uses words and letters taught so far as distractors (listen-word, letter questions)", () => {
      const index = alphabet.groups.findIndex((g) => g.id === groupId);
      const learnedLetters = new Set(alphabet.groups.slice(0, index + 1).flatMap((g) => g.letters));
      const learnedWords = new Set(alphabet.groups.slice(0, index + 1).flatMap((g) => g.words.map((w) => w.word)));
      for (const e of exercises) {
        if (e.type === "listen-word") for (const o of e.options) expect(learnedWords.has(o), o).toBe(true);
        if (e.type === "latin-to-letter") {
          for (const o of e.options) expect(learnedLetters.has(o.split(" ").at(-1)!), o).toBe(true);
        }
      }
    });
  });

  it("offers the lookalike of a false friend as a distractor", () => {
    const er = ru.letters.find((l) => l.lower === "р")!;
    expect(er.lookalike).toBe("p");
    // Over many seeds, the letter-to-latin question about the letter always contains "p".
    for (let i = 0; i < 10; i++) {
      const question = buildAlphabetExercises(ru, "ru-alphabet-2", `seed${i}`).find(
        (e) => e.type === "letter-to-latin" && e.lower === er.lower,
      );
      if (question) expect(question.options).toContain("p");
    }
  });
});

describe("isAlphabetComplete", () => {
  it("needs a card for every group", () => {
    const ids = ru.groups.map((g) => g.id);
    expect(isAlphabetComplete(ru, [])).toBe(false);
    expect(isAlphabetComplete(ru, ids.slice(0, 4).map(card))).toBe(false);
    expect(isAlphabetComplete(ru, ids.map(card))).toBe(true);
  });
});

describe.each(Object.entries(ALPHABETS) as [string, Alphabet][])("buildAlphabetCheck (%s)", (_name, alphabet) => {
  const check = buildAlphabetCheck(alphabet, "check:2026-10-21");

  it("asks 2 distinct words of every group", () => {
    expect(check).toHaveLength(alphabet.groups.length * 2);
    expect(check.every((e) => e.type === "read-word")).toBe(true);
    const words = check.map((e) => (e.type === "read-word" ? e.word : ""));
    expect(new Set(words).size).toBe(words.length);
    for (const group of alphabet.groups) {
      const own = words.filter((w) => group.words.some((gw) => gw.word === w));
      expect(own.length, group.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("offers 4 distinct options with the right reading at `answer`", () => {
    for (const e of check) {
      expect(e.options).toHaveLength(4);
      expect(new Set(e.options).size).toBe(4);
      if (e.type === "read-word") expect(e.options[e.answer]).toBe(transliterate(alphabet, e.word));
    }
  });

  it("is the same check for the same seed, another for another seed", () => {
    expect(buildAlphabetCheck(alphabet, "check:2026-10-21")).toEqual(check);
    expect(buildAlphabetCheck(alphabet, "check:2026-10-22")).not.toEqual(check);
  });
});

describe("misreadings in hangul", () => {
  it("offers the right reading exactly once", () => {
    for (const group of ko.groups) {
      for (let i = 0; i < 5; i++) {
        for (const e of buildAlphabetExercises(ko, group.id, `m${i}`)) {
          if (e.type !== "read-word") continue;
          const right = transliterate(ko, e.word);
          expect(e.options.filter((o) => o === right)).toHaveLength(1);
        }
      }
    }
  });
});

describe("gradeAlphabetCheck", () => {
  const check = buildAlphabetCheck(ru, "check:2026-10-21");
  const right = check.map((e) => e.answer);
  const withWrong = (count: number) => right.map((c, i) => (i < count ? (c + 1) % 4 : c));

  it("passes at 9 right answers out of 10, not at 8", () => {
    expect(ALPHABET_CHECK_PASS).toBe(0.9);
    expect(gradeAlphabetCheck(check, right)).toEqual({ correct: 10, total: 10, passed: true });
    expect(gradeAlphabetCheck(check, withWrong(1))).toEqual({ correct: 9, total: 10, passed: true });
    expect(gradeAlphabetCheck(check, withWrong(2))).toEqual({ correct: 8, total: 10, passed: false });
  });

  it("counts « Je ne sais pas » as wrong", () => {
    expect(gradeAlphabetCheck(check, right.map((c, i) => (i < 2 ? null : c))).passed).toBe(false);
    expect(gradeAlphabetCheck(check, right.map((c, i) => (i < 1 ? null : c))).passed).toBe(true);
  });

  it("fails when the number of answers is not the number of questions", () => {
    expect(gradeAlphabetCheck(check, right.slice(1)).passed).toBe(false);
    expect(gradeAlphabetCheck(check, [...right, 0]).passed).toBe(false);
    expect(gradeAlphabetCheck(check, []).passed).toBe(false);
  });
});
