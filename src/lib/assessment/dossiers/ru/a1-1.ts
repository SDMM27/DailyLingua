import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "ru-a1-1",
  language: "ru",
  level: "A1",
  topic: "gastronomie",
  title: "Вкусные выходные",
  reading: {
    text: "Меня зовут Анна. Я живу в маленьком городе. Каждое утро я иду на рынок. Там я покупаю хлеб, сыр и яблоки. Хлеб свежий и тёплый. Он очень вкусный. Моя бабушка любит суп. Она готовит борщ. В борще есть мясо, свёкла и капуста. Мы едим вместе в воскресенье. Я пью чай с лимоном. Бабушка пьёт чай с молоком. Дома нам хорошо. Я люблю воскресенье. Потом мы гуляем в парке.",
    questions: [
      {
        id: "ru-a1-1-r1",
        prompt: "Où Anna achète-t-elle le pain, le fromage et les pommes ?",
        referenceAnswer: "Elle les achète au marché.",
        expectedPoints: ["au marché"],
      },
      {
        id: "ru-a1-1-r2",
        prompt: "Que prépare la grand-mère d’Anna ?",
        referenceAnswer: "Elle prépare du bortsch, une soupe avec de la viande, de la betterave et du chou.",
        expectedPoints: ["du bortsch (une soupe)"],
      },
      {
        id: "ru-a1-1-r3",
        prompt: "Quand Anna et sa grand-mère mangent-elles ensemble ?",
        referenceAnswer: "Elles mangent ensemble le dimanche.",
        expectedPoints: ["le dimanche"],
      },
    ],
  },
  listening: {
    source: "youtube",
    video: {
      youtubeId: "it19zi5Fs2A",
      title: "Super Slow Russian | Talking about my hometown | Comprehensible Input | Listening practice Level A1",
      channel: "Sergey Storyteller",
      start: 63,
      end: 118,
      checkedOn: null,
    },
    questions: [
      {
        id: "ru-a1-1-l1",
        prompt: "Dans quelle ville Sergueï est-il né, et où se trouve-t-elle ?",
        referenceAnswer: "Il est né à Irkoutsk, une ville au centre de la Sibérie.",
        expectedPoints: ["Irkoutsk", "au centre de la Sibérie"],
      },
      {
        id: "ru-a1-1-l2",
        prompt: "Combien d’habitants y a-t-il à peu près dans cette ville ?",
        referenceAnswer: "Environ 600 000 habitants.",
        expectedPoints: ["environ 600 000"],
      },
      {
        id: "ru-a1-1-l3",
        prompt: "Que font les gens sur la rivière en hiver ?",
        referenceAnswer: "L’eau de la rivière gèle et les gens y font du patin à glace.",
        expectedPoints: ["la rivière gèle", "ils font du patin à glace"],
      },
    ],
  },
  writing: {
    prompt: "Écris trois phrases en russe : dis ce que tu aimes manger et boire le matin, et ce que tu prépares ou manges le dimanche.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
