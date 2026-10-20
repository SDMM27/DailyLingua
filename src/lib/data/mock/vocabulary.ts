import { addDays } from "@/lib/domain/dates";
import type { DateKey } from "@/lib/schemas/common";
import type { VocabularyItem, VocabularyList } from "@/lib/schemas/vocabulary";

type Seed = Omit<VocabularyItem, "review" | "addedOn"> & {
  box: number;
  dueInDays: number;
  addedDaysAgo: number;
  reviewCount: number;
};

const SEEDS: Seed[] = [
  {
    id: "v1",
    language: "ru",
    term: "впро́чем",
    translation: "d'ailleurs, du reste",
    definition: "Вводное слово, уточняющее или слегка опровергающее сказанное.",
    example: "Впрочем, это уже совсем другая история.",
    source: { name: "Arzamas", url: "https://arzamas.academy" },
    status: "learning",
    box: 2,
    dueInDays: -1,
    addedDaysAgo: 12,
    reviewCount: 4,
  },
  {
    id: "v2",
    language: "ru",
    term: "закономе́рность",
    translation: "régularité, loi (tendance)",
    definition: "Устойчивая, повторяющаяся связь между явлениями.",
    example: "Исследователи выявили любопытную закономерность.",
    source: { name: "ПостНаука", url: "https://postnauka.org" },
    status: "learning",
    box: 1,
    dueInDays: 0,
    addedDaysAgo: 3,
    reviewCount: 2,
  },
  {
    id: "v3",
    language: "it",
    term: "sbrigarsi",
    translation: "se dépêcher",
    example: "Sbrigati, il treno parte tra cinque minuti!",
    source: { name: "Rai Radio 3", url: "https://www.raiplaysound.it" },
    status: "learning",
    box: 1,
    dueInDays: 0,
    addedDaysAgo: 4,
    reviewCount: 1,
  },
  {
    id: "v4",
    language: "ru",
    term: "из ря́да вон выходя́щий",
    translation: "hors du commun",
    example: "Случай, конечно, из ряда вон выходящий.",
    status: "learning",
    box: 0,
    dueInDays: 0,
    addedDaysAgo: 1,
    reviewCount: 0,
  },
  {
    id: "v5",
    language: "it",
    term: "darsi da fare",
    translation: "se démener, se donner du mal",
    example: "Si è data da fare per organizzare tutto.",
    source: { name: "Il Post", url: "https://www.ilpost.it" },
    status: "learning",
    box: 2,
    dueInDays: 1,
    addedDaysAgo: 9,
    reviewCount: 3,
  },
  {
    id: "v6",
    language: "ru",
    term: "сплошь и ря́дом",
    translation: "à tout bout de champ, très souvent",
    example: "Такие ошибки встречаются сплошь и рядом.",
    source: { name: "Медуза", url: "https://meduza.io" },
    status: "learning",
    box: 3,
    dueInDays: 3,
    addedDaysAgo: 20,
    reviewCount: 5,
  },
  {
    id: "v7",
    language: "it",
    term: "a malapena",
    translation: "à peine",
    example: "Lo conosco a malapena.",
    status: "learning",
    box: 3,
    dueInDays: 6,
    addedDaysAgo: 18,
    reviewCount: 4,
  },
  {
    id: "v8",
    language: "ru",
    term: "тем не ме́нее",
    translation: "néanmoins",
    example: "Тем не менее, проект решили продолжить.",
    status: "known",
    box: 5,
    dueInDays: 25,
    addedDaysAgo: 40,
    reviewCount: 8,
  },
  {
    id: "v9",
    language: "it",
    term: "in bocca al lupo",
    translation: "bonne chance (« merde »)",
    example: "Domani hai l'esame? In bocca al lupo!",
    status: "known",
    box: 6,
    dueInDays: 50,
    addedDaysAgo: 60,
    reviewCount: 9,
  },
  {
    id: "v10",
    language: "ru",
    term: "по большо́му счёту",
    translation: "au fond, globalement",
    example: "По большому счёту, ничего не изменилось.",
    status: "known",
    box: 5,
    dueInDays: 14,
    addedDaysAgo: 35,
    reviewCount: 7,
  },
  {
    id: "v11",
    language: "it",
    term: "mettercela tutta",
    translation: "y mettre tout son cœur",
    example: "Ce l'ha messa tutta per finire in tempo.",
    status: "learning",
    listId: "l1",
    box: 1,
    dueInDays: 2,
    addedDaysAgo: 2,
    reviewCount: 1,
  },
  {
    id: "v12",
    language: "it",
    term: "prendere in giro",
    translation: "se moquer de, taquiner",
    example: "Smettila di prendermi in giro!",
    status: "learning",
    listId: "l1",
    box: 0,
    dueInDays: 1,
    addedDaysAgo: 2,
    reviewCount: 0,
  },
];

const LISTS: VocabularyList[] = [
  { id: "l1", language: "it", name: "Expressions du cours", description: "Les tournures vues en cours du jeudi.", active: true },
];

export function buildMockVocabularyLists(): VocabularyList[] {
  return LISTS.map((list) => ({ ...list }));
}

export function buildMockVocabulary(today: DateKey): VocabularyItem[] {
  return SEEDS.map(({ box, dueInDays, addedDaysAgo, reviewCount, ...item }) => ({
    ...item,
    addedOn: addDays(today, -addedDaysAgo),
    review: {
      box,
      dueOn: addDays(today, dueInDays),
      lastReviewedOn: reviewCount > 0 ? addDays(today, -1) : null,
      reviewCount,
    },
  }));
}
