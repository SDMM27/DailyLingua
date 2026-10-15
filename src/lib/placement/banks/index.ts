import type { Language } from "@/lib/schemas/common";
import type { PlacementBank, PlacementItem, PlacementVariant } from "@/lib/schemas/placement";
import { arBank } from "./ar";
import { csBank } from "./cs";
import { deBank } from "./de";
import { elBank } from "./el";
import { enBank } from "./en";
import { esBank } from "./es";
import { idBank } from "./id";
import { itBank } from "./it";
import { jaBank } from "./ja";
import { koBank } from "./ko";
import { nlBank } from "./nl";
import { plBank } from "./pl";
import { ptBank } from "./pt";
import { roBank } from "./ro";
import { ruBank } from "./ru";
import { svBank } from "./sv";
import { trBank } from "./tr";
import { ukBank } from "./uk";
import { zhBank } from "./zh";

/**
 * Curated placement banks, one per study language (a unit test checks every language of the
 * registry has a valid one). Server side only: a page passes the questions of one language and
 * variant to the client, never the whole map.
 */
export const PLACEMENT_BANKS: Record<Language, PlacementBank> = {
  ru: ruBank,
  it: itBank,
  es: esBank,
  de: deBank,
  en: enBank,
  pt: ptBank,
  nl: nlBank,
  sv: svBank,
  pl: plBank,
  cs: csBank,
  uk: ukBank,
  ro: roBank,
  el: elBank,
  tr: trBank,
  ar: arBank,
  zh: zhBank,
  ja: jaBank,
  ko: koBank,
  id: idBank,
};

export function placementItems(language: Language, variant: PlacementVariant): PlacementItem[] {
  return PLACEMENT_BANKS[language].variants[variant];
}
