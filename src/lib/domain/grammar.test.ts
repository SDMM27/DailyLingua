import { describe, expect, it } from "vitest";
import type { GrammarCard, GrammarExercise } from "@/lib/schemas/grammar";
import {
  exerciseCorrection,
  gradeFromScore,
  grammarPointState,
  isExerciseAnswerCorrect,
  normalizeGrammarAnswer,
  planGrammarPractice,
} from "./grammar";
import { STRESS_MARK } from "./stress";

const TODAY = "2026-10-21";

function card(overrides: Partial<Omit<GrammarCard, "review">> & { review?: Partial<GrammarCard["review"]> } = {}): GrammarCard {
  const { review, ...rest } = overrides;
  return {
    id: "g1",
    pointId: "ru-a1-gender",
    language: "ru",
    status: "learning",
    addedOn: "2026-10-10",
    ...rest,
    review: { box: 1, dueOn: TODAY, lastReviewedOn: "2026-10-19", reviewCount: 1, ...review },
  };
}

describe("normalizeGrammarAnswer", () => {
  it("trims, lowercases, collapses spaces and drops final punctuation", () => {
    expect(normalizeGrammarAnswer("it", "  Io   VADO  a casa ... ")).toBe("io vado a casa");
    expect(normalizeGrammarAnswer("it", "Dove vai ?!")).toBe("dove vai");
    expect(normalizeGrammarAnswer("it", "Vado…")).toBe("vado");
  });

  it("turns the typographic apostrophe into a straight one", () => {
    expect(normalizeGrammarAnswer("it", "L’amico")).toBe("l'amico");
  });

  it("composes accents (NFC)", () => {
    expect(normalizeGrammarAnswer("it", "è")).toBe("è");
  });

  it("ignores stress marks and ё for Russian", () => {
    expect(normalizeGrammarAnswer("ru", `Он чита${STRESS_MARK}ет.`)).toBe("он читает");
    expect(normalizeGrammarAnswer("ru", "Всё")).toBe("все");
  });

  it("drops the punctuation of other scripts", () => {
    expect(normalizeGrammarAnswer("es", "¿Dónde vives?")).toBe("dónde vives");
    expect(normalizeGrammarAnswer("el", "Πού μένεις;")).toBe("πού μένεις");
    expect(normalizeGrammarAnswer("ja", "どこですか？")).toBe("どこですか");
    expect(normalizeGrammarAnswer("zh", "我是学生。")).toBe("我是学生");
    expect(normalizeGrammarAnswer("ar", "أين تسكن؟")).toBe("أين تسكن");
  });

  it("lowercases Turkish with its own rules", () => {
    expect(normalizeGrammarAnswer("tr", "IRMAK İSTANBUL")).toBe("ırmak istanbul");
  });

  it("ignores spaces in Chinese and Japanese", () => {
    expect(normalizeGrammarAnswer("zh", "我 是 学生")).toBe("我是学生");
    expect(normalizeGrammarAnswer("ja", "わたし は がくせい です")).toBe("わたしはがくせいです");
    expect(normalizeGrammarAnswer("ko", "저는  학생이에요")).toBe("저는 학생이에요");
  });

  it("ignores short vowels in Arabic", () => {
    expect(normalizeGrammarAnswer("ar", "كَتَبَ")).toBe("كتب");
  });

  it("leaves other languages alone", () => {
    expect(normalizeGrammarAnswer("it", "perché")).toBe("perché");
    expect(normalizeGrammarAnswer("it", "ё")).toBe("ё");
  });
});

describe("isExerciseAnswerCorrect", () => {
  const choose: GrammarExercise = {
    type: "choose",
    prompt: "___",
    options: ["a", "b", "c"],
    answer: 1,
    explanation: "x",
  };
  const fill: GrammarExercise = { type: "fill", prompt: "Он ___", answers: ["читает", "читаю"], explanation: "x" };
  const transform: GrammarExercise = {
    type: "transform",
    instruction: "Au passé",
    source: "Vado",
    answers: ["Sono andato.", "Sono andata."],
    explanation: "x",
  };

  it("compares the index for choose", () => {
    expect(isExerciseAnswerCorrect(choose, 1, "it")).toBe(true);
    expect(isExerciseAnswerCorrect(choose, 0, "it")).toBe(false);
    expect(isExerciseAnswerCorrect(choose, "b", "it")).toBe(false);
  });

  it("accepts any normalised answer for fill and transform", () => {
    expect(isExerciseAnswerCorrect(fill, " Читает! ", "ru")).toBe(true);
    expect(isExerciseAnswerCorrect(fill, "читают", "ru")).toBe(false);
    expect(isExerciseAnswerCorrect(transform, "sono andata", "it")).toBe(true);
    expect(isExerciseAnswerCorrect(transform, "", "it")).toBe(false);
    expect(isExerciseAnswerCorrect(transform, 0, "it")).toBe(false);
  });

  it("shows the option or the first answer as the correction", () => {
    expect(exerciseCorrection(choose)).toBe("b");
    expect(exerciseCorrection(transform)).toBe("Sono andato.");
  });
});

describe("gradeFromScore", () => {
  it("is good when everything is right, hard from 60 %, again below", () => {
    expect(gradeFromScore(4, 4)).toBe("good");
    expect(gradeFromScore(3, 5)).toBe("hard");
    expect(gradeFromScore(4, 5)).toBe("hard");
    expect(gradeFromScore(2, 5)).toBe("again");
    expect(gradeFromScore(0, 3)).toBe("again");
  });
});

describe("planGrammarPractice", () => {
  it("creates a card on a pass, graded from the score", () => {
    const plan = planGrammarPractice(undefined, 3, 3, TODAY);
    expect(plan.outcome).toBe("created");
    expect(plan.review).toEqual({ box: 1, dueOn: "2026-10-23", lastReviewedOn: TODAY, reviewCount: 1 });
    expect(planGrammarPractice(undefined, 3, 5, TODAY).review).toMatchObject({ box: 0, reviewCount: 1 });
  });

  it("records nothing when there is no card and the score is under 60 %", () => {
    expect(planGrammarPractice(undefined, 1, 3, TODAY)).toEqual({ outcome: "not-passed" });
  });

  it("reviews a due learning card, even on a failure", () => {
    expect(planGrammarPractice(card(), 3, 3, TODAY)).toMatchObject({
      outcome: "reviewed",
      review: { box: 2, reviewCount: 2 },
    });
    expect(planGrammarPractice(card(), 0, 3, TODAY).review).toMatchObject({ box: 0, reviewCount: 2 });
  });

  it("is free practice for a card that is not due or is known", () => {
    expect(planGrammarPractice(card({ review: { dueOn: "2026-10-25" } }), 3, 3, TODAY)).toEqual({ outcome: "practice" });
    expect(planGrammarPractice(card({ status: "known" }), 3, 3, TODAY)).toEqual({ outcome: "practice" });
  });
});

describe("grammarPointState", () => {
  it("is new without a card, practised while learning, mastered from box 4 or when known", () => {
    expect(grammarPointState(undefined)).toBe("new");
    expect(grammarPointState(card())).toBe("practised");
    expect(grammarPointState(card({ review: { box: 4 } }))).toBe("mastered");
    expect(grammarPointState(card({ status: "known" }))).toBe("mastered");
  });
});
