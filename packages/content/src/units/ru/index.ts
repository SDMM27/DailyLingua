import { ruA101Saluer } from "./01-saluer";
import { ruA102Cafe } from "./02-cafe";
import { ruA103NombresPrix } from "./03-nombres-prix";
import { ruA104Famille } from "./04-famille";
import { ruA105OuEst } from "./05-ou-est";
import { ruA106Journee } from "./06-journee";
import { ruA107Courses } from "./07-courses";
import { ruA108Gouts } from "./08-gouts";
import { ruA109ChezMoi } from "./09-chez-moi";
import { ruA110WeekEnd } from "./10-week-end";
import { ruA0E1LettresFamilieres } from "./e1-lettres-familieres";
import { ruA0E2FauxAmis } from "./e2-faux-amis";
import { ruA0E3FormesNouvelles } from "./e3-formes-nouvelles";
import { ruA0E4Chuintantes } from "./e4-chuintantes";
import { ruA0E5VoyellesSignes } from "./e5-voyelles-signes";
import { ruA111Bilan } from "./11-bilan";

/** The Russian unit sources, in path order (the registry validates and sorts them). */
export const RU_UNITS = [
  ruA0E1LettresFamilieres,
  ruA0E2FauxAmis,
  ruA0E3FormesNouvelles,
  ruA0E4Chuintantes,
  ruA0E5VoyellesSignes,
  ruA101Saluer,
  ruA102Cafe,
  ruA103NombresPrix,
  ruA104Famille,
  ruA105OuEst,
  ruA106Journee,
  ruA107Courses,
  ruA108Gouts,
  ruA109ChezMoi,
  ruA110WeekEnd,
  ruA111Bilan,
] as const;
