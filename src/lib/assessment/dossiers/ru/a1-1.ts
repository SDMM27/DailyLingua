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
    script: "Сегодня воскресенье. Мы обедаем у бабушки. Она приготовила борщ, а я помогаю накрывать на стол. Мы едим вместе и разговариваем. После обеда бабушка пьёт чай с молоком, а я — чай с лимоном. Потом мы идём гулять в парк. Мне нравится проводить воскресенье с семьёй.",
    questions: [
      {
        id: "ru-a1-1-l1",
        prompt: "Où déjeunent-ils aujourd’hui ?",
        referenceAnswer: "Ils déjeunent chez leur grand-mère.",
        expectedPoints: ["chez leur grand-mère"],
      },
      {
        id: "ru-a1-1-l2",
        prompt: "Que prépare la grand-mère ?",
        referenceAnswer: "Elle prépare du bortsch.",
        expectedPoints: ["du bortsch"],
      },
      {
        id: "ru-a1-1-l3",
        prompt: "Que boivent-ils après le repas ?",
        referenceAnswer: "La grand-mère boit du thé au lait et Anna boit du thé au citron.",
        expectedPoints: ["thé au lait", "thé au citron"],
      },
    ],
  },
  writing: {
    prompt: "Écris trois phrases en russe : dis ce que tu aimes manger et boire le matin, et ce que tu prépares ou manges le dimanche.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
