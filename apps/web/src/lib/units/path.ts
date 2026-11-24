import { learningDay, valueToLevel } from "@dailylingua/core";
import type { Unit, UnitStep } from "@dailylingua/schemas";
import { firstOpenStep, flatSteps } from "./flow";
import type { UnitProgressView } from "./progress";

/** The levels that have a path of units: the beginner levels. */
const PATH_LEVELS: readonly string[] = ["A0", "A1", "A2"];

/** Whether the mean of the skill estimates of a language is A0 to A2 (no estimate: not a beginner we can tell). */
export function isPathLevel(estimates: readonly { levelValue: number }[]): boolean {
  if (estimates.length === 0) return false;
  const mean = estimates.reduce((sum, estimate) => sum + estimate.levelValue, 0) / estimates.length;
  return PATH_LEVELS.includes(valueToLevel(mean));
}

/** Whether a learner gets the path: a beginner level and at least one visible unit in the language. */
export function hasPath(estimates: readonly { levelValue: number }[], visibleUnits: readonly unknown[]): boolean {
  return visibleUnits.length > 0 && isPathLevel(estimates);
}

export type StationStatus = "done" | "current" | "todo";

/** One station of the line, ready to be shown (plain data, so it can cross to a client component). */
export interface Station {
  type: "station";
  id: string;
  /** Position in the path, from 1, over every unit (writing units included). */
  number: number;
  title: string;
  kind: Unit["kind"];
  status: StationStatus;
  minutes: number;
  /** The first « Je peux… » of the unit. */
  canDo: string;
  goals: string[];
  /** Upper-case letters taught by a writing unit (empty for a situation). */
  letters: string[];
  testSize: number;
  /** A test taken straight away validated it, without the lessons being done. */
  passedByTest: boolean;
  passedOn: string | null;
  /** Position (from 1) and total of the step to do next, and its key in `unit.steps`. */
  step: { position: number; total: number; key: UnitStep } | null;
  /** Whether the learner has done something in this unit. */
  started: boolean;
  /** Missed sentences to redo first, when the warm-up is due. */
  warmup: number;
}

export interface Zone {
  type: "zone";
  zone: "writing" | "situations";
  level: string;
}

export type PathEntry = Zone | Station;

export interface PathModel {
  entries: PathEntry[];
  done: number;
  total: number;
  /** The level shown in the heading: the one of the current station (the last one when all are done). */
  level: string;
  currentId: string | null;
  hasWriting: boolean;
  currentIsWriting: boolean;
}

/** The letters of a writing unit (its `letters` field, upper case); nothing for any other unit. */
export function scriptLetters(unit: Unit): string[] {
  return unit.kind === "script" ? unit.letters.map((letter) => letter.upper) : [];
}

/**
 * The line of a language: its visible units in order, each with its status. The current station is the first unit not
 * passed, whatever the learner has opened before; zone headings appear only when there are writing units (a path of
 * situations alone has none). Only common fields of the units are read.
 */
export function buildPath(
  units: readonly Unit[],
  progress: ReadonlyMap<string, UnitProgressView>,
  options: { locale: "fr" | "en"; warmups?: ReadonlyMap<string, number>; passedOn?(passedAt: string): string },
): PathModel {
  const { locale, warmups, passedOn } = options;
  const currentIndex = units.findIndex((unit) => progress.get(unit.id)?.passedAt == null);
  const hasWriting = units.some((unit) => unit.kind === "script");
  const entries: PathEntry[] = [];
  let previousKind: Unit["kind"] | null = null;
  units.forEach((unit, index) => {
    if (hasWriting && unit.kind !== previousKind) entries.push({ type: "zone", zone: unit.kind === "script" ? "writing" : "situations", level: unit.level });
    previousKind = unit.kind;
    const view = progress.get(unit.id) ?? null;
    const status: StationStatus = view?.passedAt != null ? "done" : index === currentIndex ? "current" : "todo";
    const steps = flatSteps(unit);
    const open = firstOpenStep(unit, view);
    const lessonsDone = steps.filter((step) => step.step !== "test").every((step) => view !== null && Object.hasOwn(view.steps, step.key));
    entries.push({
      type: "station",
      id: unit.id,
      number: index + 1,
      title: unit.title[locale],
      kind: unit.kind,
      status,
      minutes: unit.minutes,
      canDo: unit.canDo[0]?.text[locale] ?? "",
      goals: unit.canDo.map((goal) => goal.text[locale]),
      letters: scriptLetters(unit),
      testSize: unit.test.itemIds.length,
      passedByTest: status === "done" && !lessonsDone,
      passedOn: view?.passedAt && passedOn ? passedOn(view.passedAt) : null,
      step: steps[open] ? { position: open + 1, total: steps.length, key: steps[open].step } : null,
      started: steps.some((step) => view !== null && (step.step === "test" ? view.passedAt !== null : Object.hasOwn(view.steps, step.key))),
      warmup: warmups?.get(unit.id) ?? 0,
    });
  });
  const stations = entries.filter((entry): entry is Station => entry.type === "station");
  const current = stations.find((station) => station.status === "current") ?? null;
  const shown = current ?? stations.at(-1) ?? null;
  const shownUnit = units.find((unit) => unit.id === shown?.id);
  return {
    entries,
    done: stations.filter((station) => station.status === "done").length,
    total: stations.length,
    level: shownUnit?.level ?? "A1",
    currentId: current?.id ?? null,
    hasWriting,
    currentIsWriting: current?.kind === "script",
  };
}

/** Whether a failed test is old enough for its warm-up: from the learning day after the test (the learner's time zone). */
export function warmupDue(testedAt: string, now: Date, timeZone: string): boolean {
  return learningDay(new Date(testedAt), timeZone) < learningDay(now, timeZone);
}

/** Minutes left in a unit, in proportion to the steps left (at least 1). */
export function minutesLeft(minutes: number, position: number, total: number): number {
  return Math.max(1, Math.round((minutes * (total - position + 1)) / Math.max(1, total)));
}
