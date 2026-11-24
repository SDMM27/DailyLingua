import { ruA101Saluer } from "./01-saluer";
import { ruA0E1LettresFamilieres } from "./e1-lettres-familieres";
import { ruA0E2FauxAmis } from "./e2-faux-amis";
import { ruA0E3FormesNouvelles } from "./e3-formes-nouvelles";
import { ruA0E4Chuintantes } from "./e4-chuintantes";
import { ruA0E5VoyellesSignes } from "./e5-voyelles-signes";

/** The Russian unit sources, in path order (the registry validates and sorts them). */
export const RU_UNITS = [
  ruA0E1LettresFamilieres,
  ruA0E2FauxAmis,
  ruA0E3FormesNouvelles,
  ruA0E4Chuintantes,
  ruA0E5VoyellesSignes,
  ruA101Saluer,
] as const;
