import { describe, expect, it } from "vitest";
import { CEFR_LEVELS } from "@/lib/schemas/common";
import { checkAssessmentDossier } from "../check-dossier";
import { ASSESSMENT_DOSSIERS, assessmentLanguages } from "./index";

describe("pilot dossiers", () => {
  for (const language of assessmentLanguages()) {
    describe(language, () => {
      it("has one dossier per level, in order", () => {
        expect((ASSESSMENT_DOSSIERS[language] ?? []).map((d) => d.level)).toEqual([...CEFR_LEVELS]);
      });

      for (const dossier of ASSESSMENT_DOSSIERS[language] ?? []) {
        it(`${dossier.id} follows the authoring rules`, () => {
          expect(checkAssessmentDossier(language, dossier.level, dossier)).toEqual([]);
        });
      }
    });
  }
});

describe("assessmentLanguages", () => {
  it("lists the pilot languages", () => {
    expect(assessmentLanguages()).toEqual(["ru", "it"]);
  });
});
