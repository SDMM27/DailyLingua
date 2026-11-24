import { itA101Saluer } from "./01-saluer";
import { itA102Cafe } from "./02-cafe";
import { itA103NombresPrix } from "./03-nombres-prix";
import { itA104Famille } from "./04-famille";
import { itA105OuEst } from "./05-ou-est";
import { itA106Journee } from "./06-journee";
import { itA107Courses } from "./07-courses";
import { itA108Gouts } from "./08-gouts";
import { itA109ChezMoi } from "./09-chez-moi";
import { itA110WeekEnd } from "./10-week-end";
import { itA111Bilan } from "./11-bilan";

/** The Italian unit sources, in path order (the registry validates and sorts them). */
export const IT_UNITS = [itA101Saluer, itA102Cafe, itA103NombresPrix, itA104Famille, itA105OuEst, itA106Journee, itA107Courses, itA108Gouts, itA109ChezMoi, itA110WeekEnd, itA111Bilan] as const;
