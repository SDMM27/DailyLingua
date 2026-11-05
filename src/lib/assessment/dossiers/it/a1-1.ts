import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "it-a1-1",
  language: "it",
  level: "A1",
  topic: "voyage",
  title: "In treno a Firenze",
  reading: {
    text: "Mi chiamo Giulia. Oggi vado in treno a Firenze con mia sorella. Il treno parte alle nove. Il biglietto costa poco. In valigia ho un libro, una mappa e due panini. Il viaggio è lungo, ma è bello: fuori c’è il sole. Mia sorella dorme. Io guardo i campi dalla finestra. Alle undici arriviamo in stazione. Dopo prendiamo un taxi e andiamo in albergo. L’albergo è piccolo e vicino al centro.",
    questions: [
      {
        id: "it-a1-1-r1",
        prompt: "Comment Giulia voyage-t-elle, et avec qui ?",
        referenceAnswer: "Giulia voyage en train, avec sa sœur.",
        expectedPoints: ["en train", "avec sa sœur"],
      },
      {
        id: "it-a1-1-r2",
        prompt: "À quelle heure le train part-il ?",
        referenceAnswer: "Le train part à neuf heures.",
        expectedPoints: ["à neuf heures (9 h)"],
      },
      {
        id: "it-a1-1-r3",
        prompt: "Que fait Giulia pendant le voyage ?",
        referenceAnswer: "Elle regarde les champs par la fenêtre, pendant que sa sœur dort.",
        expectedPoints: ["elle regarde les champs / par la fenêtre", "sa sœur dort"],
      },
    ],
  },
  listening: {
    source: "youtube",
    video: {
      youtubeId: "8JGpPHBx7-k",
      title: "La storia di Italo, capitolo 1 - Short stories for beginners in Italian",
      channel: "Podcast Italiano",
      start: 35,
      end: 71,
      checkedOn: null,
    },
    questions: [
      {
        id: "it-a1-1-l1",
        prompt: "Quel âge a Italo ?",
        referenceAnswer: "Il a 30 ans.",
        expectedPoints: ["30 ans"],
      },
      {
        id: "it-a1-1-l2",
        prompt: "Que demande Italo à sa mère ?",
        referenceAnswer: "Il lui demande de lui raconter son enfance, la vérité : il sait qu’elle n’est pas sa vraie mère.",
        expectedPoints: ["raconter son enfance / la vérité", "elle n’est pas sa vraie mère"],
      },
      {
        id: "it-a1-1-l3",
        prompt: "Où Italo est-il né, et pourquoi s’appelle-t-il Italo ?",
        referenceAnswer: "Il est né en Italie, c’est pour cela qu’il s’appelle Italo.",
        expectedPoints: ["en Italie", "son prénom vient de l’Italie"],
      },
    ],
  },
  writing: {
    prompt: "Tu pars en voyage. Écris 3 phrases en italien : où tu vas, comment tu voyages et ce que tu mets dans ta valise.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
