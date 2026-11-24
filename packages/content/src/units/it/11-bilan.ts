import type { UnitSource } from "@dailylingua/schemas";

/**
 * Italian, end-of-path assessment (`j4-pr3.md` §2): ten items drawn from the tests of units 6 to 10, two per unit,
 * units mixed. Passing it confirms A1. The items are those of their units (already reviewed there); this file only
 * chooses and orders them.
 */
export const itA111Bilan = {
  id: "it-a1-11-bilan",
  language: "it",
  level: "A1",
  order: 11,
  kind: "assessment",
  title: { fr: "Bilan A1", en: "A1 check-up" },
  situation: {
    fr: "Dix questions sur les unités 6 à 10, mélangées, sans revoir les leçons. Il faut au moins 8 bonnes réponses sur 10 pour confirmer ton niveau A1.",
    en: "Ten questions on units 6 to 10, mixed, without going back to the lessons. You need at least 8 right answers out of 10 to confirm your A1 level.",
  },
  minutes: 10,
  canDo: [
    {
      id: "cd1",
      text: { fr: "Je peux parler de ma journée, de mes goûts et de mon logement.", en: "I can talk about my day, what I like and where I live." },
    },
    { id: "cd2", text: { fr: "Je peux faire des courses simples.", en: "I can do simple shopping." } },
  ],
  draws: [
    { unit: "it-a1-06-journee", item: "i08" },
    { unit: "it-a1-07-courses", item: "i07" },
    { unit: "it-a1-08-gouts", item: "i08" },
    { unit: "it-a1-09-chez-moi", item: "i05" },
    { unit: "it-a1-10-week-end", item: "i05" },
    { unit: "it-a1-06-journee", item: "i13" },
    { unit: "it-a1-08-gouts", item: "i15" },
    { unit: "it-a1-07-courses", item: "i05" },
    { unit: "it-a1-10-week-end", item: "i11" },
    { unit: "it-a1-09-chez-moi", item: "i06" },
  ],
  aiReview: { reviewedOn: "2026-11-24", passes: 2, arbiter: "arbitre-relecture" },
  status: "published",
} satisfies UnitSource;
