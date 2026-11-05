import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "ru-a2-1",
  language: "ru",
  level: "A2",
  topic: "voyage",
  title: "Поездка в Казань",
  reading: {
    text: "Прошлым летом я ездила в Казань к подруге Ольге. Мы не виделись два года, поэтому я очень ждала эту поездку. Я купила билет заранее и поехала на поезде. Дорога заняла целую ночь, но я хорошо спала. Утром Ольга встретила меня на вокзале с цветами. В тот день шёл дождь, и мы остались дома: пили горячий чай и смотрели старые фотографии. Вечером мы составили план. Завтра мы пойдём в музей, а в субботу поедем на экскурсию по реке. Ольга обещала показать мне свои любимые места. Она сказала, что мы обязательно попробуем местные пирожки. Я взяла с собой фотоаппарат и тёплую куртку, потому что вечером у реки может быть прохладно даже летом.",
    questions: [
      {
        id: "ru-a2-1-r1",
        prompt: "Comment la narratrice est-elle allée à Kazan ?",
        referenceAnswer: "Elle y est allée en train, avec un trajet qui a duré toute la nuit.",
        expectedPoints: ["en train", "un trajet d’une nuit"],
      },
      {
        id: "ru-a2-1-r2",
        prompt: "Que font les deux amies le jour de l’arrivée, et pourquoi ?",
        referenceAnswer: "Elles restent à la maison parce qu’il pleut ; elles boivent du thé chaud et regardent de vieilles photos.",
        expectedPoints: ["elles restent à la maison", "parce qu’il pleut", "thé et vieilles photos"],
      },
      {
        id: "ru-a2-1-r3",
        prompt: "Que prévoient-elles pour les jours suivants ?",
        referenceAnswer: "Elles iront au musée le lendemain et feront une excursion sur la rivière le samedi.",
        expectedPoints: ["le musée le lendemain", "une excursion sur la rivière samedi"],
      },
    ],
  },
  listening: {
    source: "youtube",
    video: {
      youtubeId: "8OlKzxWUlBk",
      title: "Slow Russian - My Morning Routine",
      channel: "Russian With Max",
      start: 334,
      end: 372,
      checkedOn: null,
    },
    questions: [
      {
        id: "ru-a2-1-l1",
        prompt: "Que se prépare-t-il toujours au petit-déjeuner, et qui d’autre aime ça ?",
        referenceAnswer: "Du café ; Sabrina aussi aime le café.",
        expectedPoints: ["du café", "Sabrina aussi"],
      },
      {
        id: "ru-a2-1-l2",
        prompt: "Que mange-t-il le plus souvent au petit-déjeuner, et quoi d’autre parfois ?",
        referenceAnswer: "Le plus souvent des œufs ; parfois des blinis, de la kacha (bouillie) ou simplement des sandwichs.",
        expectedPoints: ["des œufs le plus souvent", "parfois blinis, kacha ou sandwichs (au moins un)"],
      },
      {
        id: "ru-a2-1-l3",
        prompt: "Que font-ils le plus souvent le matin, et qu’est-ce que cela les oblige à faire ?",
        referenceAnswer: "Le plus souvent, ils sortent le matin, ils vont quelque part ; il faut donc s’habiller.",
        expectedPoints: ["ils sortent / vont quelque part", "il faut s’habiller"],
      },
    ],
  },
  writing: {
    prompt: "Écris trois phrases en russe : raconte un voyage ou une sortie que tu as faits, puis dis où tu iras la prochaine fois.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
