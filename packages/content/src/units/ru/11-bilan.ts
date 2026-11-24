import type { UnitSource } from "@dailylingua/schemas";

/**
 * Russian, end-of-path assessment (`j4-pr3.md` §2): ten items drawn from the tests of units 6 to 10, two per unit,
 * units mixed. Passing it confirms A1. The items are those of their units (already reviewed there); this file only
 * chooses and orders them.
 */
export const ruA111Bilan = {
  id: "ru-a1-11-bilan",
  language: "ru",
  level: "A1",
  order: 16,
  kind: "assessment",
  title: { fr: "Bilan A1", en: "A1 check-up" },
  situation: {
    fr: "Dix questions sur les unités 6 à 10, mélangées, sans traduction ni gloses. Avec 8 bonnes réponses, ton niveau A1 est confirmé.",
    en: "Ten questions on units 6 to 10, mixed, with no translations or glosses. With 8 right answers, your A1 level is confirmed.",
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
    { unit: "ru-a1-07-courses", item: "i08" },
    { unit: "ru-a1-09-chez-moi", item: "i05" },
    { unit: "ru-a1-06-journee", item: "i14" },
    { unit: "ru-a1-08-gouts", item: "i08" },
    { unit: "ru-a1-10-week-end", item: "i10" },
    { unit: "ru-a1-09-chez-moi", item: "i12" },
    { unit: "ru-a1-06-journee", item: "i08" },
    { unit: "ru-a1-10-week-end", item: "i06" },
    { unit: "ru-a1-07-courses", item: "i15" },
    { unit: "ru-a1-08-gouts", item: "i14" },
  ],
  aiReview: { reviewedOn: "2026-11-24", passes: 2, arbiter: "arbitre-relecture" },
  status: "reviewed",
} satisfies UnitSource;
