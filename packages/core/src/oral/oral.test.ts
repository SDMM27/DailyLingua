import { describe, expect, it } from "vitest";
import { DICTATION_HIGH_ACCURACY, DICTATION_MIN_ACCURACY, MIN_DICTATION_MS, MIN_SPEAKING_MS_PER_WORD, SHADOWING_MIN_RATIO, compareSpoken, gradeDictation } from "./index";

const statuses = (tokens: { status: string }[]) => tokens.map((token) => token.status);

describe("thresholds", () => {
  it("are those of the spec", () => {
    expect([SHADOWING_MIN_RATIO, DICTATION_MIN_ACCURACY, DICTATION_HIGH_ACCURACY, MIN_SPEAKING_MS_PER_WORD, MIN_DICTATION_MS]).toEqual([0.6, 0.8, 0.95, 250, 1000]);
  });
});

describe("compareSpoken", () => {
  it("gives 1 to the model itself, whatever the case, punctuation and typographic apostrophe", () => {
    const result = compareSpoken("it", "Vorrei un caffè, per favore.", "vorrei un caffè per favore");
    expect(result.ratio).toBe(1);
    expect(statuses(result.tokens)).toEqual(["ok", "ok", "ok", "ok", "ok"]);
    expect(compareSpoken("it", "Vorrei l'acqua.", "vorrei l’acqua").ratio).toBe(1);
    expect(compareSpoken("it", "Vorrei l'acqua.", "vorrei l'acqua").tokens).toHaveLength(2);
  });

  it("is below 1 for a short word changed to another form (an agreement)", () => {
    const result = compareSpoken("it", "Lei è alta", "lei è alto");
    expect(statuses(result.tokens)).toEqual(["ok", "ok", "wrong"]);
    expect(result.tokens[2]).toEqual({ text: "alta", status: "wrong" });
    expect(result.ratio).toBe(0.67);
  });

  it("accepts a word of five letters or more spelled one letter off, never a shorter one", () => {
    expect(compareSpoken("it", "Sono stanca", "sono stanco").ratio).toBe(1);
    expect(compareSpoken("it", "Arrivederci", "arrivedeci").ratio).toBe(1);
    expect(compareSpoken("it", "Arrivederci", "arrivederchi").ratio).toBe(1);
    expect(compareSpoken("it", "Arrivederci", "arrivedeccci").ratio).toBe(0);
    expect(compareSpoken("it", "Il pane", "il pone").tokens[1]?.status).toBe("wrong");
    expect(compareSpoken("it", "Vino rosso", "vini rosso").ratio).toBe(0.5);
    // Two letters off is another word, however long.
    expect(compareSpoken("it", "Buongiorno", "buonasera").ratio).toBe(0);
  });

  it("marks a missing word, and the ratio drops with it", () => {
    const result = compareSpoken("it", "Vorrei un caffè per favore", "vorrei caffè per favore");
    expect(statuses(result.tokens)).toEqual(["ok", "missing", "ok", "ok", "ok"]);
    expect(result.tokens[1]).toEqual({ text: "un", status: "missing" });
    expect(result.ratio).toBe(0.8);
  });

  it("marks an extra word, and never gives 1 to a sentence with one", () => {
    const result = compareSpoken("it", "Vorrei un caffè", "vorrei proprio un caffè");
    expect(statuses(result.tokens)).toEqual(["ok", "extra", "ok", "ok"]);
    expect(result.tokens[1]).toEqual({ text: "proprio", status: "extra" });
    expect(result.ratio).toBe(0.75);
  });

  it("never rounds a wrong sentence up to 1", () => {
    const model = Array.from({ length: 300 }, () => "pane").join(" ");
    const result = compareSpoken("it", model, `${model} pane`);
    expect(result.ratio).toBe(0.99);
  });

  it("marks inverted words as not right", () => {
    const result = compareSpoken("it", "Mi chiamo Marco", "Marco mi chiamo");
    expect(result.ratio).toBeLessThan(1);
    expect(result.tokens.some((token) => token.status !== "ok")).toBe(true);
    expect(result.ratio).toBe(0.67);
  });

  it("gives 0 to an empty transcript, with every word missing", () => {
    const result = compareSpoken("it", "Buongiorno a tutti", "  ");
    expect(result.ratio).toBe(0);
    expect(statuses(result.tokens)).toEqual(["missing", "missing", "missing"]);
    expect(compareSpoken("it", "", "").ratio).toBe(0);
  });

  it("compares Russian without the stress mark, with е for ё, and keeps й apart from и", () => {
    expect(compareSpoken("ru", "Здра́вствуйте, меня́ зовут Алёна", "здравствуйте меня зовут алена").ratio).toBe(1);
    expect(compareSpoken("ru", "Я хочу чёрный чай", "я хочу черный чай").ratio).toBe(1);
    // й is not и: "чай" (tea) is not "чаи" (nothing folds the breve in the comparison of words).
    const result = compareSpoken("ru", "Я люблю чай", "я люблю чаи");
    expect(result.tokens[2]).toEqual({ text: "чай", status: "wrong" });
  });

  it("compares characters where words are not separated by spaces", () => {
    expect(compareSpoken("zh", "你好吗", "你 好 吗").ratio).toBe(1);
    expect(statuses(compareSpoken("zh", "你好吗", "你好").tokens)).toEqual(["ok", "ok", "missing"]);
  });
});

describe("gradeDictation", () => {
  it("gives 1 to the model, whatever the case and the punctuation", () => {
    const result = gradeDictation("it", "Vorrei un caffè, per favore.", "VORREI UN CAFFÈ PER FAVORE", "strict");
    expect(result.accuracy).toBe(1);
    expect(result.diff.every((token) => token.status === "ok")).toBe(true);
  });

  it("lets a missing accent through under lenient, and counts it under strict", () => {
    expect(gradeDictation("it", "Un caffè", "un caffe", "lenient").accuracy).toBe(1);
    const strict = gradeDictation("it", "Un caffè", "un caffe", "strict");
    expect(strict.accuracy).toBe(0.875);
    expect(strict.diff.filter((token) => token.status === "wrong")).toEqual([{ text: "è", status: "wrong" }]);
  });

  it("marks wrong, missing and extra characters", () => {
    const extra = gradeDictation("it", "ciao", "ciaoo", "strict").diff;
    expect(statuses(extra).filter((status) => status === "extra")).toHaveLength(1);
    expect(extra.map((token) => token.text).join("")).toBe("ciaoo");
    expect(statuses(gradeDictation("it", "ciao", "cio", "strict").diff)).toContain("missing");
    expect(statuses(gradeDictation("it", "ciao", "cuao", "strict").diff)).toEqual(["ok", "wrong", "ok", "ok"]);
  });

  it("gives 0 to an empty answer, and never goes below 0", () => {
    expect(gradeDictation("it", "ciao", "", "lenient").accuracy).toBe(0);
    expect(gradeDictation("it", "ciao", "xxxxxxxxxxxxxxxxxxxx", "lenient").accuracy).toBe(0);
    expect(gradeDictation("it", "", "ciao", "lenient").accuracy).toBe(0);
  });

  it("takes the apostrophe of an elision as a character, straight or typographic", () => {
    expect(gradeDictation("it", "Vorrei l'acqua", "vorrei l’acqua", "strict").accuracy).toBe(1);
    expect(gradeDictation("it", "Vorrei l'acqua", "vorrei lacqua", "strict").accuracy).toBeLessThan(1);
  });

  it("cuts the accuracy at 79, 80, 94 and 95 percent of a 100-character model", () => {
    const model = "a".repeat(100);
    const withErrors = (errors: number) => gradeDictation("it", model, "b".repeat(errors) + "a".repeat(100 - errors), "strict").accuracy;
    expect(withErrors(21)).toBeCloseTo(0.79, 10);
    expect(withErrors(20)).toBeCloseTo(0.8, 10);
    expect(withErrors(6)).toBeCloseTo(0.94, 10);
    expect(withErrors(5)).toBeCloseTo(0.95, 10);
    expect(withErrors(21)).toBeLessThan(DICTATION_MIN_ACCURACY);
    expect(withErrors(20)).toBeGreaterThanOrEqual(DICTATION_MIN_ACCURACY);
    expect(withErrors(6)).toBeLessThan(DICTATION_HIGH_ACCURACY);
    expect(withErrors(5)).toBeGreaterThanOrEqual(DICTATION_HIGH_ACCURACY);
  });

  it("handles Russian: stress mark and ё ignored, й never folded into и, even under lenient", () => {
    expect(gradeDictation("ru", "Я люблю чёрный чай", "я люблю черный чай", "lenient").accuracy).toBe(1);
    expect(gradeDictation("ru", "Здра́вствуйте", "здравствуйте", "strict").accuracy).toBe(1);
    const lenient = gradeDictation("ru", "чай", "чаи", "lenient");
    expect(lenient.accuracy).toBeCloseTo(2 / 3, 10);
    expect(lenient.diff[2]).toEqual({ text: "й", status: "wrong" });
    // The reverse (й typed where the model has и) is as wrong; Ukrainian ї is not і either.
    expect(gradeDictation("ru", "мои", "мой", "lenient").accuracy).toBeLessThan(1);
    expect(gradeDictation("uk", "їжак", "іжак", "lenient").accuracy).toBeLessThan(1);
  });

  it("folds the German digraphs under lenient", () => {
    expect(gradeDictation("de", "schön", "schoen", "lenient").accuracy).toBe(1);
    expect(gradeDictation("de", "schön", "schoen", "strict").accuracy).toBeLessThan(1);
  });
});
