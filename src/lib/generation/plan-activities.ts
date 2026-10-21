import { diffInDays } from "@/lib/domain/dates";
import type { ContentType, DateKey } from "@/lib/schemas/common";
import type { GeneratedProductionMode, PlannedActivity, ProductionMode } from "@/lib/schemas/generation";
import type { ActivityKind } from "@/lib/schemas/mission";

/**
 * Writing or spoken (written, then said aloud), alternating day by day and between the languages
 * of the same day (parity of the day number plus the language's position), so each language gets
 * both over time and a day never asks for the same production everywhere. Deterministic: no state to store.
 */
export function chooseProductionMode(date: DateKey, index: number): GeneratedProductionMode {
  const day = diffInDays("1970-01-01", date);
  return (((day + index) % 2) + 2) % 2 === 0 ? "writing" : "spoken";
}

/** A spoken production is written first, so its activity is a writing one (ticked on correction). */
export function productionActivityKind(mode: ProductionMode): ActivityKind {
  return mode === "speaking" ? "speaking" : "writing";
}

const CONSUME: Record<ContentType, { kind: ActivityKind; title: string }> = {
  article: { kind: "reading", title: "Lire l’article" },
  podcast: { kind: "listening", title: "Écouter l’épisode" },
  video: { kind: "watching", title: "Regarder la vidéo" },
  interview: { kind: "listening", title: "Écouter l’interview" },
};

/** Share of the time given to the content itself; the rest goes to the exercises. */
const CONSUME_SHARE = 0.45;

/**
 * An exercise is never stretched beyond what it takes: a 2-minute talk is not a 30-minute
 * activity because the day's budget is large. Time beyond every cap is left unplanned.
 */
const MAX_WRITING_MINUTES = 15;
const MAX_SPOKEN_MINUTES = 10;

export interface PlanInput {
  type: ContentType;
  durationMinutes: number;
  /** Time for this language today. */
  minutes: number;
  questionCount: number;
  expressionCount: number;
  productionMode: GeneratedProductionMode;
}

/** Writing pace assumed for a learner, words per minute of the activity (thinking included). */
const WORDS_PER_MINUTE = { min: 8, max: 12 };
/** Spoken: about half of the activity is writing, the other half is saying it aloud. */
const SPOKEN_WRITING_SHARE = 1 / 2;

const roundTo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/**
 * Length asked for the production task, derived from the minutes it was given so the request is
 * doable: "25–35 mots" for 3 minutes of writing; a spoken task counts only the half of the
 * minutes spent writing ("30–50 mots" for 8 minutes, about a minute of talk).
 * Set by the app, in French like the rest of the interface, never by the model.
 */
export function productionTargetLength(mode: GeneratedProductionMode, minutes: number): string {
  const writingMinutes = mode === "spoken" ? minutes * SPOKEN_WRITING_SHARE : minutes;
  const low = roundTo5(Math.max(20, writingMinutes * WORDS_PER_MINUTE.min));
  const high = Math.max(low + 10, roundTo5(writingMinutes * WORDS_PER_MINUTE.max));
  return `${low}–${high} mots`;
}

/** Integer split of `total` in proportion to `weights` (largest remainder), ties to the first. */
function proportional(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (total * w) / weightSum);
  const parts = exact.map(Math.floor);
  let leftover = total - parts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((value, i) => ({ i, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (const { i } of order) {
    if (leftover === 0) break;
    parts[i] += 1;
    leftover -= 1;
  }
  return parts;
}

/**
 * Splits `total` in proportion to `weights` without exceeding `caps`: what a capped activity cannot
 * take is shared again among the others. Every part is >= 1 (callers ensure total >= parts and
 * caps >= 1); the sum is min(total, sum of caps).
 */
function fill(total: number, weights: number[], caps: number[]): number[] {
  const parts = weights.map(() => 0);
  let open = weights.map((_, i) => i);
  let left = Math.min(total, caps.reduce((a, b) => a + b, 0));
  while (left > 0 && open.length > 0) {
    const shares = proportional(
      left,
      open.map((i) => weights[i]),
    );
    open.forEach((i, k) => (parts[i] += shares[k]));
    left = 0;
    for (const i of open) {
      if (parts[i] > caps[i]) {
        left += parts[i] - caps[i];
        parts[i] = caps[i];
      }
    }
    open = open.filter((i) => parts[i] < caps[i]);
  }
  // A proportional share can round to 0: take the minute from the largest share.
  for (let i = 0; i < parts.length; i++) {
    while (parts[i] < 1) {
      const donor = parts.indexOf(Math.max(...parts));
      parts[donor] -= 1;
      parts[i] += 1;
    }
  }
  return parts;
}

/**
 * Activities of one session, in the order the learner does them. The app decides minutes and
 * titles, never the model. Estimated minutes are integers >= 1 and add up to `minutes` (as soon as
 * there is room for at least two activities) unless every exercise reached its cap; when time is
 * short, exercises are dropped (vocabulary first) rather than shrunk below one minute.
 */
export function planActivities(input: PlanInput): PlannedActivity[] {
  const consume = CONSUME[input.type];
  const consumeMinutes = Math.min(input.durationMinutes, Math.max(1, Math.round(input.minutes * CONSUME_SHARE)));
  const remaining = Math.max(0, input.minutes - consumeMinutes);

  const exercises: { kind: ActivityKind; title: string; weight: number; cap: number }[] = [];
  if (input.questionCount > 0) {
    exercises.push({ kind: "comprehension", title: "Questions sur l’accroche", weight: 3, cap: 2 + input.questionCount });
  }
  if (input.expressionCount > 0) {
    exercises.push({
      kind: "vocabulary",
      title:
        input.expressionCount === 1 ? "1 expression à retenir" : `${input.expressionCount} expressions à retenir`,
      weight: 2,
      cap: 1 + input.expressionCount,
    });
  }
  exercises.push(
    input.productionMode === "writing"
      ? { kind: productionActivityKind("writing"), title: "Écrire un court texte", weight: 4, cap: MAX_WRITING_MINUTES }
      : { kind: productionActivityKind("spoken"), title: "Écrire puis dire à voix haute", weight: 4, cap: MAX_SPOKEN_MINUTES },
  );

  // Not enough time for all of them: drop vocabulary, then comprehension.
  for (const droppable of ["vocabulary", "comprehension"] as const) {
    if (remaining >= exercises.length) break;
    const at = exercises.findIndex((e) => e.kind === droppable);
    if (at !== -1) exercises.splice(at, 1);
  }

  const activities: PlannedActivity[] = [
    { kind: consume.kind, title: consume.title, estimatedMinutes: consumeMinutes },
  ];
  if (remaining < exercises.length) return activities;

  const minutes = fill(
    remaining,
    exercises.map((e) => e.weight),
    exercises.map((e) => e.cap),
  );
  exercises.forEach((e, i) => {
    activities.push({ kind: e.kind, title: e.title, estimatedMinutes: minutes[i] });
  });
  return activities;
}
