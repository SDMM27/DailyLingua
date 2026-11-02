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
        referenceAnswer: "Giulia viaggia in treno, con sua sorella.",
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
    script: "Siamo in albergo. La camera è al secondo piano. C’è un letto grande e un balcone. Chiedo alla signora: «Dov’è il museo?». Lei risponde: «È vicino, a dieci minuti a piedi». Che bello! Andiamo subito.",
    questions: [
      {
        id: "it-a1-1-l1",
        prompt: "À quel étage se trouve la chambre ?",
        referenceAnswer: "La chambre est au deuxième étage.",
        expectedPoints: ["au deuxième étage"],
      },
      {
        id: "it-a1-1-l2",
        prompt: "Qu’y a-t-il dans la chambre ?",
        referenceAnswer: "Il y a un grand lit et un balcon.",
        expectedPoints: ["un grand lit", "un balcon"],
      },
      {
        id: "it-a1-1-l3",
        prompt: "Où est le musée, d’après la dame ?",
        referenceAnswer: "Le musée est tout près, à dix minutes à pied.",
        expectedPoints: ["tout près", "dix minutes à pied"],
      },
    ],
  },
  writing: {
    prompt: "Vous partez en voyage. Écrivez 3 phrases en italien : où vous allez, comment vous voyagez et ce que vous mettez dans votre valise.",
  },
  audio: null,
  reviewedOn: null,
};
