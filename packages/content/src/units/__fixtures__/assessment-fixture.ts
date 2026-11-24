import type { AssessmentUnitSource, SituationUnitSource } from "@dailylingua/schemas";
import { fixtureUnit } from "./it-fixture";

/** Id of the fixture situation unit number `nn` (06 to 10). */
export const fixtureUnitId = (nn: string) => `it-a1-${nn}-fixture`;

export const FIXTURE_BILAN_ID = "it-a1-11-bilan";

/** Five situation units numbered 06 to 10 (orders 6 to 10), each the italian fixture unit under another id. */
export function fixtureSituations(): SituationUnitSource[] {
  return ["06", "07", "08", "09", "10"].map((nn, index) => ({ ...fixtureUnit(), id: fixtureUnitId(nn), order: 6 + index }));
}

/** A valid bilan over the five fixture situations: two items of each, in a mixed order. */
export function fixtureBilan(): AssessmentUnitSource {
  const l10n = (fr: string, en = fr) => ({ fr, en });
  const draw = (nn: string, item: string) => ({ unit: fixtureUnitId(nn), item });
  return {
    id: FIXTURE_BILAN_ID,
    language: "it",
    kind: "assessment",
    level: "A1",
    order: 11,
    title: l10n("Bilan A1", "A1 check"),
    situation: l10n("Tu fais le point sur le parcours.", "You take stock of the path."),
    minutes: 10,
    canDo: [
      { id: "c1", text: l10n("Se débrouiller dans cinq situations", "Cope in five situations") },
      { id: "c2", text: l10n("Confirmer le niveau A1", "Confirm level A1") },
    ],
    draws: [
      draw("06", "i1"), draw("08", "i3"), draw("10", "i5"), draw("07", "i2"), draw("09", "i4"),
      draw("08", "i6"), draw("06", "i7"), draw("10", "i8"), draw("09", "i9"), draw("07", "i10"),
    ],
    aiReview: null,
    status: "draft",
  };
}
