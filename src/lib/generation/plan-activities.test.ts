import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/domain/dates";
import { CONTENT_TYPES } from "@/lib/schemas/common";
import { chooseProductionMode, planActivities, productionTargetLength } from "./plan-activities";

const CAPS: Record<string, (questions: number, expressions: number) => number> = {
  comprehension: (questions) => 2 + questions,
  vocabulary: (_, expressions) => 1 + expressions,
  writing: () => 15,
  speaking: () => 8,
};

describe("productionTargetLength", () => {
  it("asks for what fits in the planned minutes", () => {
    expect(productionTargetLength("writing", 3)).toBe("25–35 mots");
    expect(productionTargetLength("writing", 15)).toBe("120–180 mots");
    expect(productionTargetLength("writing", 1)).toBe("20–30 mots");
    expect(productionTargetLength("speaking", 8)).toBe("3 minutes");
    expect(productionTargetLength("speaking", 2)).toBe("1 minute");
  });
});

describe("chooseProductionMode", () => {
  it("alternates from one day to the next", () => {
    const today = "2026-10-13";
    expect(chooseProductionMode(today, 0)).not.toBe(chooseProductionMode(addDays(today, 1), 0));
    expect(chooseProductionMode(today, 0)).toBe(chooseProductionMode(addDays(today, 2), 0));
  });

  it("alternates between languages of the same day", () => {
    expect(chooseProductionMode("2026-10-13", 0)).not.toBe(chooseProductionMode("2026-10-13", 1));
    expect(chooseProductionMode("2026-10-13", 0)).toBe(chooseProductionMode("2026-10-13", 2));
  });

  it("is deterministic, also before 1970", () => {
    expect(chooseProductionMode("1969-12-31", 0)).toBe(chooseProductionMode("1969-12-31", 0));
    expect(chooseProductionMode("1969-12-31", 0)).not.toBe(chooseProductionMode("1970-01-01", 0));
  });
});

describe("planActivities", () => {
  const base = {
    type: "article",
    durationMinutes: 10,
    minutes: 20,
    questionCount: 3,
    expressionCount: 4,
    productionMode: "writing",
  } as const;

  it("lists the activities in order with French titles", () => {
    const plan = planActivities(base);
    expect(plan.map((a) => a.kind)).toEqual(["reading", "comprehension", "vocabulary", "writing"]);
    expect(plan.map((a) => a.title)).toEqual([
      "Lire l’article",
      "Questions sur l’accroche",
      "4 expressions à retenir",
      "Écrire un court texte",
    ]);
    expect(plan.reduce((sum, a) => sum + a.estimatedMinutes, 0)).toBe(20);
  });

  it("adapts to the content type and production mode", () => {
    expect(planActivities({ ...base, type: "podcast" })[0]).toMatchObject({ kind: "listening", title: "Écouter l’épisode" });
    expect(planActivities({ ...base, type: "video" })[0]).toMatchObject({ kind: "watching", title: "Regarder la vidéo" });
    expect(planActivities({ ...base, type: "interview" })[0].kind).toBe("listening");
    expect(planActivities({ ...base, productionMode: "speaking" }).at(-1)).toMatchObject({
      kind: "speaking",
      title: "Parler sans t’arrêter",
    });
  });

  it("uses the singular for one expression and skips empty exercises", () => {
    const plan = planActivities({ ...base, questionCount: 0, expressionCount: 1 });
    expect(plan.map((a) => a.kind)).toEqual(["reading", "vocabulary", "writing"]);
    expect(plan[1].title).toBe("1 expression à retenir");
  });

  it("caps the content time at its duration and gives the rest to the exercises", () => {
    const plan = planActivities({ ...base, durationMinutes: 2 });
    expect(plan[0].estimatedMinutes).toBe(2);
    expect(plan.reduce((sum, a) => sum + a.estimatedMinutes, 0)).toBe(20);
  });

  it("drops vocabulary, then comprehension, when time is short", () => {
    // minutes 4: consume 2, remaining 2 -> comprehension + production
    expect(planActivities({ ...base, minutes: 4 }).map((a) => a.kind)).toEqual(["reading", "comprehension", "writing"]);
    // minutes 3: consume 1, remaining 2 -> still two exercises
    expect(planActivities({ ...base, minutes: 3 }).map((a) => a.kind)).toEqual(["reading", "comprehension", "writing"]);
    // minutes 2: consume 1, remaining 1 -> production only
    expect(planActivities({ ...base, minutes: 2 }).map((a) => a.kind)).toEqual(["reading", "writing"]);
    // minutes 1: only the content
    expect(planActivities({ ...base, minutes: 1 }).map((a) => a.kind)).toEqual(["reading"]);
  });

  it("never stretches an exercise beyond what it takes", () => {
    // Template session: no quiz, no expressions, a large share.
    const plan = planActivities({ ...base, minutes: 40, durationMinutes: 6, questionCount: 0, expressionCount: 0, productionMode: "speaking" });
    expect(plan.map((a) => [a.kind, a.estimatedMinutes])).toEqual([
      ["reading", 6],
      ["speaking", 8],
    ]);
    // What a capped exercise cannot take goes to the others.
    const full = planActivities({ ...base, minutes: 60, durationMinutes: 6 });
    expect(full.map((a) => [a.kind, a.estimatedMinutes])).toEqual([
      ["reading", 6],
      ["comprehension", 5],
      ["vocabulary", 5],
      ["writing", 15],
    ]);
  });

  it("keeps whole minutes, at least one each, adding up to the budget", () => {
    for (const type of CONTENT_TYPES) {
      for (const durationMinutes of [1, 3, 10, 45]) {
        for (const questionCount of [0, 3]) {
          for (const expressionCount of [0, 1, 5]) {
            for (const productionMode of ["writing", "speaking"] as const) {
              for (let minutes = 1; minutes <= 40; minutes++) {
                const plan = planActivities({ type, durationMinutes, minutes, questionCount, expressionCount, productionMode });
                const total = plan.reduce((sum, a) => sum + a.estimatedMinutes, 0);
                for (const a of plan) {
                  expect(Number.isInteger(a.estimatedMinutes)).toBe(true);
                  expect(a.estimatedMinutes).toBeGreaterThanOrEqual(1);
                }
                expect(total).toBeLessThanOrEqual(minutes);
                // The whole budget is used unless every exercise reached its cap.
                const capped = plan.slice(1).every((a) => a.estimatedMinutes === CAPS[a.kind](questionCount, expressionCount));
                if (minutes >= 2 && !capped) expect(total).toBe(minutes);
              }
            }
          }
        }
      }
    }
  });
});
