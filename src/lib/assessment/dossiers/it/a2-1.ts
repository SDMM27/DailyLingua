import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "it-a2-1",
  language: "it",
  level: "A2",
  topic: "gastronomie",
  title: "Una domenica in trattoria",
  reading: {
    text: "Domenica scorsa sono andato con i miei amici in una piccola trattoria di campagna. Era un posto semplice: i tavoli erano di legno e la cucina profumava di pomodoro e di basilico. Il cuoco, un signore anziano, ci ha salutati con un grande sorriso. Mentre aspettavamo, ci ha portato del pane caldo con un po’ d’olio. Poi abbiamo ordinato la pasta fatta in casa. Io ho preso le tagliatelle al ragù, mentre la mia amica Sara ha scelto una zuppa di verdure perché non aveva molta fame. Tutto era buonissimo, ma il dolce era il migliore: una torta di mele ancora tiepida. Alla fine abbiamo speso poco e siamo usciti molto contenti. Quando ero piccolo, la nonna cucinava così, e quel pranzo mi ha fatto tornare in mente le domeniche a casa sua.",
    questions: [
      {
        id: "it-a2-1-r1",
        prompt: "Où le narrateur est-il allé dimanche dernier, et avec qui ?",
        referenceAnswer: "Il est allé dans une petite trattoria de campagne avec ses amis.",
        expectedPoints: ["dans une petite trattoria de campagne", "avec ses amis"],
      },
      {
        id: "it-a2-1-r2",
        prompt: "Pourquoi Sara a-t-elle choisi une soupe de légumes ?",
        referenceAnswer: "Parce qu’elle n’avait pas très faim.",
        expectedPoints: ["elle n’avait pas très faim"],
      },
      {
        id: "it-a2-1-r3",
        prompt: "Quel était le dessert, et dans quel état était-il ?",
        referenceAnswer: "C’était une tarte aux pommes encore tiède.",
        expectedPoints: ["une tarte aux pommes", "encore tiède"],
      },
    ],
  },
  listening: {
    source: "youtube",
    video: {
      youtubeId: "lBOlnDV8aJg",
      title: "La storia di Italo, capitolo 2 - Short stories for beginners in Italian",
      channel: "Podcast Italiano",
      start: 80,
      end: 125,
      checkedOn: null,
    },
    questions: [
      {
        id: "it-a2-1-l1",
        prompt: "Quand Italo part-il, et quel est son problème ?",
        referenceAnswer: "Il part le 5 août, mais il ne parle pas italien : il connaît seulement « ciao », « arrivederci », « pizza » et « pasta ».",
        expectedPoints: ["le 5 août", "il ne parle pas italien"],
      },
      {
        id: "it-a2-1-l2",
        prompt: "Combien de temps a-t-il pour apprendre l’italien ?",
        referenceAnswer: "Six mois.",
        expectedPoints: ["six mois"],
      },
      {
        id: "it-a2-1-l3",
        prompt: "Qui est Patrizia ?",
        referenceAnswer: "C’est sa professeure d’italien, dans sa ville ; elle parle mal anglais mais très bien italien, et elle enseignait les lettres à l’université de Bologne.",
        expectedPoints: ["sa professeure d’italien", "elle parle mal anglais", "ancienne professeure à l’université de Bologne"],
      },
    ],
  },
  writing: {
    prompt: "Raconte un repas que tu as apprécié. Écris 3 phrases en italien, au passé : où tu étais, avec qui, et ce que tu as mangé.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
