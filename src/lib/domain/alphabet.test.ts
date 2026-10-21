import { describe, expect, it } from "vitest";
import { ALPHABETS } from "@/lib/alphabets";
import { ALPHABET_PRACTICE_MAX, type AlphabetCard, type AlphabetExercise } from "@/lib/schemas/alphabet";
import { buildAlphabetExercises, isAlphabetComplete, letterLabel, seededRandom, transliterate } from "./alphabet";
import { stripStress } from "./stress";

const ru = ALPHABETS.ru!;
const uk = ALPHABETS.uk!;

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

  it("keeps what is not a letter", () => {
    expect(transliterate(ru, "да, нет!")).toBe("da, net!");
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
        e.type === "letter-to-latin" ? [e.lower] : e.type === "latin-to-letter" ? [e.options[e.answer].split(" ")[1]] : [],
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
          for (const o of e.options) expect(learnedLetters.has(o.split(" ")[1]), o).toBe(true);
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
