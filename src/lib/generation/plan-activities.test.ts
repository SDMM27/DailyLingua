import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/domain/dates";
import { CONTENT_TYPES } from "@/lib/schemas/common";
import { chooseProductionMode, planActivities, productionActivityKind, productionTargetLength } from "./plan-activities";

const CAPS: Record<string, (questions: number, expressions: number, mode: string) => number> = {
  comprehension: (questions) => 2 + questions,
  vocabulary: (_, expressions) => 1 + expressions,
  writing: (_q, _e, mode) => (mode === "spoken" ? 10 : 15),
};

describe("productionTargetLength", () => {
  it("asks for what fits in the planned minutes", () => {
    expect(productionTargetLength("writing", 3)).toBe("25–35 mots");
    expect(productionTargetLength("writing", 15)).toBe("120–180 mots");
    expect(productionTargetLength("writing", 1)).toBe("20–30 mots");
  });

  it("asks a spoken task for the words of half the minutes: the other half is for saying it", () => {
    expect(productionTargetLength("spoken", 8)).toBe(productionTargetLength("writing", 4));
    expect(productionTargetLength("spoken", 8)).toBe("30–50 mots");
    expect(productionTargetLength("spoken", 1)).toBe("20–30 mots");
  });
});

describe("productionActivityKind", () => {
  it("keeps the activity of a spoken task a writing one, and the legacy task a speaking one", () => {
    expect(productionActivityKind("writing")).toBe("writing");
    expect(productionActivityKind("spoken")).toBe("writing");
    expect(productionActivityKind("speaking")).toBe("speaking");
  });
});

describe("chooseProductionMode", () => {
  const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];
  // 2026-10-12 is a Monday.
  const monday = "2026-10-12";
  const wednesday = "2026-10-14";
  const nextMonday = "2026-10-19";

  it("alternates from one day to the next when the language is worked every day", () => {
    const today = "2026-10-13";
    expect(chooseProductionMode(today, EVERY_DAY, 0)).not.toBe(chooseProductionMode(addDays(today, 1), EVERY_DAY, 0));
    expect(chooseProductionMode(today, EVERY_DAY, 0)).toBe(chooseProductionMode(addDays(today, 2), EVERY_DAY, 0));
  });

  it("alternates between the worked days of a Monday-Wednesday language", () => {
    const days = [1, 3];
    const modes = [monday, wednesday, nextMonday, addDays(nextMonday, 2)].map((d) => chooseProductionMode(d, days, 0));
    expect(modes[0]).not.toBe(modes[1]);
    expect(modes[1]).not.toBe(modes[2]);
    expect(modes[2]).not.toBe(modes[3]);
    expect(modes[0]).toBe(modes[2]);
  });

  it("alternates between the worked days of a Monday-Tuesday language", () => {
    const days = [1, 2];
    const modes = [monday, addDays(monday, 1), nextMonday, addDays(nextMonday, 1)].map((d) => chooseProductionMode(d, days, 0));
    expect(modes[0]).not.toBe(modes[1]);
    expect(modes[1]).not.toBe(modes[2]);
    expect(modes[2]).not.toBe(modes[3]);
  });

  it("gives two languages of the same day different modes when their positions differ by one", () => {
    expect(chooseProductionMode(monday, EVERY_DAY, 0)).not.toBe(chooseProductionMode(monday, EVERY_DAY, 1));
    expect(chooseProductionMode(monday, [1, 3], 0)).not.toBe(chooseProductionMode(monday, [1, 3], 1));
    expect(chooseProductionMode(monday, EVERY_DAY, 0)).toBe(chooseProductionMode(monday, EVERY_DAY, 2));
  });

  it("never produces the former speaking-only task, and still uses both modes", () => {
    const modes = new Set<string>();
    for (let day = 0; day < 6; day++) {
      for (let index = 0; index < 4; index++) modes.add(chooseProductionMode(addDays("2026-10-13", day), EVERY_DAY, index));
    }
    expect([...modes].sort()).toEqual(["spoken", "writing"]);
  });

  it("is deterministic, also before the reference date", () => {
    expect(chooseProductionMode("1969-12-31", EVERY_DAY, 0)).toBe(chooseProductionMode("1969-12-31", EVERY_DAY, 0));
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
    // A spoken task is written first: its activity is a writing one.
    expect(planActivities({ ...base, productionMode: "spoken" }).at(-1)).toMatchObject({
      kind: "writing",
      title: "Écrire puis dire à voix haute",
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
    const plan = planActivities({ ...base, minutes: 40, durationMinutes: 6, questionCount: 0, expressionCount: 0, productionMode: "spoken" });
    expect(plan.map((a) => [a.kind, a.estimatedMinutes])).toEqual([
      ["reading", 6],
      ["writing", 10],
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
            for (const productionMode of ["writing", "spoken"] as const) {
              for (let minutes = 1; minutes <= 40; minutes++) {
                const plan = planActivities({ type, durationMinutes, minutes, questionCount, expressionCount, productionMode });
                const total = plan.reduce((sum, a) => sum + a.estimatedMinutes, 0);
                for (const a of plan) {
                  expect(Number.isInteger(a.estimatedMinutes)).toBe(true);
                  expect(a.estimatedMinutes).toBeGreaterThanOrEqual(1);
                }
                expect(total).toBeLessThanOrEqual(minutes);
                // The whole budget is used unless every exercise reached its cap.
                const capped = plan.slice(1).every((a) => a.estimatedMinutes === CAPS[a.kind](questionCount, expressionCount, productionMode));
                if (minutes >= 2 && !capped) expect(total).toBe(minutes);
              }
            }
          }
        }
      }
    }
  });
});
