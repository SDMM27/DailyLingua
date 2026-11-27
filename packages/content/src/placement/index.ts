import type { PlacementBank } from "@dailylingua/schemas";
import { itBank } from "./it";
import { ruBank } from "./ru";

export { itBank, ruBank };

/** Languages whose placement test is offered in `apps/web` (the other languages keep a declared level). */
export const PLACEMENT_LANGUAGES = ["ru", "it"] as const;
export type PlacementLanguage = (typeof PLACEMENT_LANGUAGES)[number];

const BANKS: Record<PlacementLanguage, PlacementBank> = { ru: ruBank, it: itBank };

export function isPlacementLanguage(language: string): language is PlacementLanguage {
  return (PLACEMENT_LANGUAGES as readonly string[]).includes(language);
}

/** The bank of a language that offers the test, or null. Server side: it holds the answer keys. */
export function placementBankOf(language: string): PlacementBank | null {
  return isPlacementLanguage(language) ? BANKS[language] : null;
}
