import type { AssessmentDossier } from "@/lib/schemas/assessment";

/** A small Italian A1 dossier for tests: the real dossiers are content, not fixtures. */
export const FIXTURE_DOSSIER: AssessmentDossier & { listening: { source: "script"; script: string } } = {
  id: "it-a1-1",
  language: "it",
  level: "A1",
  topic: "société",
  title: "Una domenica in famiglia",
  reading: {
    text: "Mi chiamo Marta e abito a Torino con mio marito e i miei due figli. La domenica ci svegliamo tardi e facciamo colazione tutti insieme. Mio marito prepara il caffè, io preparo il pane con la marmellata. Poi i bambini giocano in salotto e noi leggiamo il giornale. Alle una arriva mia madre. Lei porta sempre un dolce e resta a pranzo con noi. Dopo pranzo andiamo al parco vicino a casa.",
    questions: [
      { id: "it-a1-1-r1", prompt: "Où habite Marta ?", referenceAnswer: "Elle habite à Turin avec sa famille.", expectedPoints: ["Turin"] },
      { id: "it-a1-1-r2", prompt: "Que fait le mari le dimanche matin ?", referenceAnswer: "Il prépare le café.", expectedPoints: ["il prépare le café"] },
      { id: "it-a1-1-r3", prompt: "Qui arrive à une heure ?", referenceAnswer: "La mère de Marta, avec un gâteau.", expectedPoints: ["la mère de Marta"] },
    ],
  },
  listening: {
    source: "script",
    script: "Al parco i bambini corrono e giocano con il pallone. Mia madre si siede su una panchina e parla con una signora. Io compro un gelato per tutti. Alle cinque torniamo a casa, stanchi e contenti.",
    questions: [
      { id: "it-a1-1-l1", prompt: "Que font les enfants au parc ?", referenceAnswer: "Ils courent et jouent au ballon.", expectedPoints: ["ils jouent au ballon"] },
      { id: "it-a1-1-l2", prompt: "Qu'achète Marta ?", referenceAnswer: "Une glace pour tout le monde.", expectedPoints: ["une glace"] },
      { id: "it-a1-1-l3", prompt: "À quelle heure rentrent-ils ?", referenceAnswer: "À cinq heures.", expectedPoints: ["cinq heures"] },
    ],
  },
  writing: { prompt: "Décris en trois phrases ce que tu fais le dimanche." },
  audio: null,
  reviewedOn: null,
};

/** The same dossier with a listening test on a YouTube passage (A1: 15-60 s). */
export const FIXTURE_YOUTUBE_DOSSIER: AssessmentDossier = {
  ...FIXTURE_DOSSIER,
  listening: {
    source: "youtube",
    video: { youtubeId: "dQw4w9WgXcQ", title: "Una domenica a Torino", channel: "Canale di prova", start: 30, end: 70, checkedOn: null },
    questions: FIXTURE_DOSSIER.listening.questions,
  },
};
