import { addDays } from "@/lib/domain/dates";
import type { DateKey } from "@/lib/schemas/common";
import type { AlphabetCard } from "@/lib/schemas/alphabet";

type Seed = Omit<AlphabetCard, "review" | "addedOn"> & {
  box: number;
  dueInDays: number;
  addedDaysAgo: number;
  reviewCount: number;
};

// Ids of the Russian alphabet (src/lib/alphabets/ru.ts), a demo-profile language.
const SEEDS: Seed[] = [
  { id: "a1", groupId: "ru-alphabet-1", language: "ru", status: "learning", box: 3, dueInDays: 6, addedDaysAgo: 30, reviewCount: 4 },
  { id: "a2", groupId: "ru-alphabet-2", language: "ru", status: "learning", box: 1, dueInDays: 0, addedDaysAgo: 8, reviewCount: 2 },
];

export function buildMockAlphabetCards(today: DateKey): AlphabetCard[] {
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
