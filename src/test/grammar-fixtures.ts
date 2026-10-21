import type { GrammarPoint } from "@/lib/schemas/grammar";

/** A small Italian point for tests: the real courses are content, not fixtures. */
export const FIXTURE_POINT: GrammarPoint = {
  id: "it-a1-present",
  level: "A1",
  title: "Le présent des verbes en -are",
  summary: "Parler, habiter : les terminaisons du présent.",
  rule: ["Le radical reste, la terminaison change selon la personne.", "Le sujet est souvent omis."],
  table: {
    caption: "parlare",
    headers: ["Personne", "Forme"],
    rows: [
      ["io", "parlo"],
      ["tu", "parli"],
    ],
  },
  examples: [
    { text: "Io parlo italiano.", translation: "Je parle italien.", note: "Terminaison -o." },
    { text: "Tu abiti a Roma.", translation: "Tu habites à Rome." },
  ],
  exercises: [
    {
      type: "choose",
      prompt: "Noi ___ a Milano.",
      options: ["abito", "abitiamo", "abitano"],
      answer: 1,
      explanation: "Avec « noi », la terminaison est -iamo.",
    },
    {
      type: "fill",
      prompt: "Tu ___ molto.",
      hint: "parlare",
      answers: ["parli"],
      explanation: "Avec « tu », la terminaison est -i.",
    },
    {
      type: "transform",
      instruction: "Mets la phrase à la 3e personne du pluriel.",
      source: "Io parlo.",
      answers: ["Loro parlano.", "Parlano."],
      explanation: "Avec « loro », la terminaison est -ano.",
    },
  ],
  categories: ["verb"],
  reviewedOn: null,
};
