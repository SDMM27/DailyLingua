import { itA101Saluer } from "./01-saluer";
import { itA102Cafe } from "./02-cafe";
import { itA103NombresPrix } from "./03-nombres-prix";
import { itA104Famille } from "./04-famille";
import { itA105OuEst } from "./05-ou-est";

/** The Italian unit sources, in path order (the registry validates and sorts them). */
export const IT_UNITS = [itA101Saluer, itA102Cafe, itA103NombresPrix, itA104Famille, itA105OuEst] as const;
