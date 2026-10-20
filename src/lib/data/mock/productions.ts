import { addDays } from "@/lib/domain/dates";
import type { DateKey } from "@/lib/schemas/common";
import type { CorrectionCard } from "@/lib/schemas/correction-card";
import type { ProductionEntry } from "@/lib/schemas/production";
import type { WritingFeedback } from "@/lib/schemas/writing-feedback";

const RUSSIAN_FEEDBACK: WritingFeedback = {
  scores: {
    grammar: { score: 3, comment: "Quelques erreurs d’accord et de conjugaison, mais les phrases restent claires." },
    vocabulary: { score: 4, comment: "Un vocabulaire simple et bien choisi pour parler de littérature." },
    register: { score: 4, comment: "Le ton neutre convient bien à un petit avis de lecture." },
    coherence: { score: 4, comment: "Ton avis, ton exemple et ton projet s’enchaînent naturellement." },
  },
  corrections: [
    {
      original: "он используют",
      corrected: "он использует",
      explanation: "Le verbe s’accorde avec « он » : troisième personne du singulier, « использует ».",
      category: "verb",
    },
    {
      original: "очень странным языком",
      corrected: "очень необычным языком",
      explanation: "« странный » est plutôt négatif ; « необычный » dit simplement que ce n’est pas habituel.",
      category: "word_choice",
    },
  ],
  strength: "Tu relies ton avis à un projet concret de lecture, ce qui rend le texte vivant.",
  nativeVersion:
    "Платонов пишет очень необычным языком. Мне понравилось, что он использует простые слова, но предложения звучат непривычно. На следующей неделе я хочу прочитать его роман «Котлован».",
};

const ITALIAN_FEEDBACK: WritingFeedback = {
  scores: {
    grammar: { score: 4, comment: "Peu d’erreurs, surtout sur les prépositions." },
    vocabulary: { score: 3, comment: "Correct, mais un peu répétitif." },
    register: { score: 4, comment: "Registre adapté à un message à un ami." },
    coherence: { score: 4, comment: "Les idées se suivent bien." },
  },
  corrections: [
    {
      original: "due giorni per settimana",
      corrected: "due giorni alla settimana",
      explanation: "On dit « alla settimana » pour une fréquence.",
      category: "function_word",
    },
  ],
  strength: "Ton exemple personnel rend ton opinion convaincante.",
  nativeVersion:
    "Secondo me lavorare da casa è utile. Lavoro da casa due giorni alla settimana e riesco a concentrarmi di più.",
};

/** Demo "Mes productions": a few reviewed texts and one draft, newest first. */
export function buildMockProductions(today: DateKey): ProductionEntry[] {
  return [
    {
      sessionId: "mock-session-1",
      date: addDays(today, -1),
      language: "ru",
      title: "Как читать Платонова: язык, который сопротивляется",
      sourceName: "Arzamas",
      url: "https://arzamas.academy",
      task: "Напишите короткий отзыв о книге, которую вы читали недавно.",
      body: "Платонов пишет очень странным языком. Мне понравилось, что он используют простые слова, но предложения звучат необычно. Я хочу прочитать его роман «Котлован» на следующей неделе.",
      feedback: RUSSIAN_FEEDBACK,
      cardIndexes: [0],
    },
    {
      sessionId: "mock-session-2",
      date: addDays(today, -4),
      language: "it",
      title: "Il lavoro da remoto: pro e contro",
      sourceName: "Il Post",
      url: "https://www.ilpost.it",
      task: "Secondo te, è meglio lavorare da casa o in ufficio? Spiega perché.",
      body: "Secondo me il lavoro da casa è utile. Io lavoro da casa due giorni per settimana e sono più concentrato.",
      feedback: ITALIAN_FEEDBACK,
      cardIndexes: [0],
    },
    {
      sessionId: "mock-session-3",
      date: addDays(today, -35),
      language: "ru",
      title: "Сибирские города: жизнь после заводов",
      sourceName: "Медуза",
      url: "https://meduza.io",
      body: "Я думаю что города в Сибири очень интересные. Там живут много люди.",
      feedback: {
        scores: {
          grammar: { score: 2, comment: "Des erreurs d’accord fréquentes." },
          vocabulary: { score: 3, comment: "Vocabulaire basique mais adapté." },
          register: { score: 3, comment: "Neutre, acceptable." },
          coherence: { score: 3, comment: "Texte court, idées peu développées." },
        },
        corrections: [
          {
            original: "Там живут много люди",
            corrected: "Там живёт много людей",
            explanation: "« много » veut le génitif pluriel : « людей », et le verbe reste au singulier.",
            category: "agreement",
          },
          {
            original: "Я думаю что",
            corrected: "Я думаю, что",
            explanation: "En russe, une virgule précède toujours « что » introduisant une subordonnée.",
            category: "spelling",
          },
        ],
        strength: "Tu donnes clairement ton opinion dès la première phrase.",
      },
      cardIndexes: [0],
    },
    {
      sessionId: "mock-session-4",
      date: addDays(today, -40),
      language: "it",
      title: "Le città italiane che si svuotano",
      sourceName: "Il Post",
      url: "https://www.ilpost.it",
      body: "Mi piace molto il mio quartiere, ma",
      cardIndexes: [],
    },
  ];
}

const CARD_SEEDS: (Omit<CorrectionCard, "review" | "addedOn"> & {
  box: number;
  dueInDays: number;
  addedDaysAgo: number;
  reviewCount: number;
})[] = [
  {
    id: "c1",
    sessionId: "mock-session-1",
    correctionIndex: 0,
    language: "ru",
    original: "он используют",
    corrected: "он использует",
    explanation: "Le verbe s’accorde avec « он » : troisième personne du singulier, « использует ».",
    category: "verb",
    status: "learning",
    box: 0,
    dueInDays: 0,
    addedDaysAgo: 1,
    reviewCount: 0,
  },
  {
    id: "c2",
    sessionId: "mock-session-3",
    correctionIndex: 0,
    language: "ru",
    original: "Там живут много люди",
    corrected: "Там живёт много людей",
    explanation: "« много » veut le génitif pluriel : « людей », et le verbe reste au singulier.",
    category: "agreement",
    status: "learning",
    box: 1,
    dueInDays: 0,
    addedDaysAgo: 34,
    reviewCount: 2,
  },
  {
    id: "c3",
    sessionId: "mock-session-2",
    correctionIndex: 0,
    language: "it",
    original: "due giorni per settimana",
    corrected: "due giorni alla settimana",
    explanation: "On dit « alla settimana » pour une fréquence.",
    category: "function_word",
    status: "learning",
    box: 2,
    dueInDays: 3,
    addedDaysAgo: 3,
    reviewCount: 1,
  },
];

export function buildMockCorrectionCards(today: DateKey): CorrectionCard[] {
  return CARD_SEEDS.map(({ box, dueInDays, addedDaysAgo, reviewCount, ...card }) => ({
    ...card,
    addedOn: addDays(today, -addedDaysAgo),
    review: {
      box,
      dueOn: addDays(today, dueInDays),
      lastReviewedOn: reviewCount > 0 ? addDays(today, -1) : null,
      reviewCount,
    },
  }));
}
