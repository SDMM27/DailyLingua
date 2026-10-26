import type { Language } from "@/lib/schemas/common";
import type { GrammarCourse, GrammarPoint } from "@/lib/schemas/grammar";
import { arCourse } from "./ar";
import { csCourse } from "./cs";
import { deCourse } from "./de";
import { elCourse } from "./el";
import { enCourse } from "./en";
import { esCourse } from "./es";
import { idCourse } from "./id";
import { itCourse } from "./it";
import { jaCourse } from "./ja";
import { koCourse } from "./ko";
import { nlCourse } from "./nl";
import { plCourse } from "./pl";
import { ptCourse } from "./pt";
import { roCourse } from "./ro";
import { ruCourse } from "./ru";
import { svCourse } from "./sv";
import { trCourse } from "./tr";
import { ukCourse } from "./uk";
import { zhCourse } from "./zh";

const ALL_COURSES: Record<Language, GrammarCourse> = {
  ru: ruCourse,
  it: itCourse,
  es: esCourse,
  de: deCourse,
  en: enCourse,
  pt: ptCourse,
  nl: nlCourse,
  sv: svCourse,
  pl: plCourse,
  cs: csCourse,
  uk: ukCourse,
  ro: roCourse,
  el: elCourse,
  tr: trCourse,
  ar: arCourse,
  zh: zhCourse,
  ja: jaCourse,
  ko: koCourse,
  id: idCourse,
};

/**
 * Curated grammar courses as authored, for the languages that have points (an empty course file is
 * a language not written yet). Server side only: a page passes one point to the client, never the
 * whole map.
 */
export const GRAMMAR_COURSES: Partial<Record<Language, GrammarCourse>> = Object.fromEntries(
  Object.entries(ALL_COURSES).filter(([, course]) => course.points.length > 0),
);

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
