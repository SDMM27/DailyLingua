import type { CefrLevel, Language } from "@/lib/schemas/common";
import { arCurriculum } from "./curricula/ar";
import { csCurriculum } from "./curricula/cs";
import { deCurriculum } from "./curricula/de";
import { elCurriculum } from "./curricula/el";
import { enCurriculum } from "./curricula/en";
import { esCurriculum } from "./curricula/es";
import { idCurriculum } from "./curricula/id";
import { itCurriculum } from "./curricula/it";
import { jaCurriculum } from "./curricula/ja";
import { koCurriculum } from "./curricula/ko";
import { nlCurriculum } from "./curricula/nl";
import { plCurriculum } from "./curricula/pl";
import { ptCurriculum } from "./curricula/pt";
import { roCurriculum } from "./curricula/ro";
import { ruCurriculum } from "./curricula/ru";
import { svCurriculum } from "./curricula/sv";
import { trCurriculum } from "./curricula/tr";
import { ukCurriculum } from "./curricula/uk";
import { zhCurriculum } from "./curricula/zh";

export type CurriculumEntry = { id: string; level: CefrLevel; topic: string };

/** One list per language, in `curricula/<code>.ts`; an empty list = no course yet. */
const ALL_CURRICULA: Record<Language, readonly CurriculumEntry[]> = {
  ru: ruCurriculum,
  it: itCurriculum,
  es: esCurriculum,
  de: deCurriculum,
  en: enCurriculum,
  pt: ptCurriculum,
  nl: nlCurriculum,
  sv: svCurriculum,
  pl: plCurriculum,
  cs: csCurriculum,
  uk: ukCurriculum,
  ro: roCurriculum,
  el: elCurriculum,
  tr: trCurriculum,
  ar: arCurriculum,
  zh: zhCurriculum,
  ja: jaCurriculum,
  ko: koCurriculum,
  id: idCurriculum,
};

/**
 * The points each course must contain, in teaching order (checked by `checkGrammarCourse`), for
 * the languages that have a course: A1 to B1, six points per level. Ids are stable: cards point to
 * them, so a point is never renamed, only added.
 */
export const GRAMMAR_CURRICULUM: Partial<Record<string, readonly CurriculumEntry[]>> = Object.fromEntries(
  Object.entries(ALL_CURRICULA).filter(([, entries]) => entries.length > 0),
);
