import { addDays } from "@/lib/domain/dates";
import type { DateKey } from "@/lib/schemas/common";
import type { GrammarCard } from "@/lib/schemas/grammar";

type Seed = Omit<GrammarCard, "review" | "addedOn"> & {
  box: number;
  dueInDays: number;
  addedDaysAgo: number;
  reviewCount: number;
};

// Ids of the curriculum (src/lib/grammar/curriculum.ts), for the languages of the demo profile.
const SEEDS: Seed[] = [
  { id: "g1", pointId: "ru-a2-genitive", language: "ru", status: "learning", box: 1, dueInDays: 0, addedDaysAgo: 9, reviewCount: 2 },
  { id: "g2", pointId: "ru-a1-gender", language: "ru", status: "learning", box: 4, dueInDays: 12, addedDaysAgo: 40, reviewCount: 5 },
  { id: "g3", pointId: "it-a2-passato-prossimo", language: "it", status: "learning", box: 2, dueInDays: 3, addedDaysAgo: 6, reviewCount: 2 },
  { id: "g4", pointId: "it-a1-articles", language: "it", status: "learning", box: 0, dueInDays: -2, addedDaysAgo: 5, reviewCount: 1 },
];

export function buildMockGrammarCards(today: DateKey): GrammarCard[] {
  return SEEDS.map(({ box, dueInDays, addedDaysAgo, reviewCount, ...card }) => ({
    ...card,
    addedOn: addDays(today, -addedDaysAgo),
    review: {
      box,
      dueOn: addDays(today, dueInDays),
      lastReviewedOn: addDays(today, -1),
      reviewCount,
    },
  }));
}
