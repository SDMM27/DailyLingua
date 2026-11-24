import { buildRegistry, getUnit } from "@dailylingua/content";
import { isAssessmentUnit, type AssessmentUnit, type SituationUnit, type Unit } from "@dailylingua/schemas";

/**
 * A bilan for the tests of the screens, built the way the registry does it: five copies of the first Italian unit
 * numbered 06 to 10, and a bilan drawing its two single-choice test items from each (so a test can answer them all).
 * Test helper only, the real bilan content is written elsewhere.
 */
export const BILAN_ID = "it-a1-11-bilan";
export const BILAN_SOURCE_NUMBERS = ["06", "07", "08", "09", "10"] as const;
export const bilanSourceId = (nn: string) => `it-a1-${nn}-source`;

export function testBilan(): { bilan: AssessmentUnit; sources: Unit[] } {
  const base = getUnit("it-a1-01-saluer") as SituationUnit;
  const source: Partial<SituationUnit> = { ...base };
  delete source.version;
  const choices = base.test.itemIds.filter((id) => base.items.find((item) => item.id === id)?.kind === "mcq").slice(0, 2);
  const sources = BILAN_SOURCE_NUMBERS.map((nn, index) => ({ ...source, id: bilanSourceId(nn), order: 6 + index, title: { fr: `Source ${nn}`, en: `Source ${nn}` } }));
  const bilanSource = {
    id: BILAN_ID,
    language: "it",
    kind: "assessment",
    level: "A1",
    order: 11,
    title: { fr: "Bilan A1", en: "A1 check-up" },
    situation: { fr: "Le point sur le parcours.", en: "Taking stock." },
    minutes: 10,
    canDo: base.canDo,
    draws: BILAN_SOURCE_NUMBERS.flatMap((nn) => choices.map((item) => ({ unit: bilanSourceId(nn), item }))),
    aiReview: base.aiReview ?? { reviewedOn: "2026-11-24", passes: 2, arbiter: "arbitre-relecture" },
    status: "published",
  };
  const registry = buildRegistry([...sources, bilanSource]);
  const bilan = registry[BILAN_ID];
  if (!bilan || !isAssessmentUnit(bilan)) throw new Error("the test bilan did not resolve");
  return { bilan, sources: sources.map((entry) => registry[entry.id] as Unit) };
}
