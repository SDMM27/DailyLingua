import type { Language } from "@/lib/schemas/common";
import type { GrammarCourse, GrammarPoint } from "@/lib/schemas/grammar";
import { itCourse } from "./it";
import { ruCourse } from "./ru";

/**
 * Curated grammar courses as authored, for the pilot languages (phase H1). Server side only: a
 * page passes one point to the client, never the whole map.
 */
export const GRAMMAR_COURSES: Partial<Record<Language, GrammarCourse>> = {
  ru: ruCourse,
  it: itCourse,
};

/** The point with this id, whatever its language and review state (visibility is `policy.ts`). */
export function grammarPoint(id: string): GrammarPoint | undefined {
  for (const course of Object.values(GRAMMAR_COURSES)) {
    const point = course.points.find((p) => p.id === id);
    if (point) return point;
  }
  return undefined;
}

/** Languages that have a course. */
export function grammarLanguages(): Language[] {
  return Object.keys(GRAMMAR_COURSES) as Language[];
}
