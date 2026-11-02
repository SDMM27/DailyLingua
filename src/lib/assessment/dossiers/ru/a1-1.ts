import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "ru-a1-1",
  language: "ru",
  level: "A1",
  topic: "gastronomie",
  title: "Вкусные выходные",
  reading: {
    text: "Меня зовут Анна. Я живу в маленьком городе. Каждое утро я иду на рынок. Там я покупаю хлеб, сыр и яблоки. Хлеб свежий и тёплый. Он очень вкусный. Моя бабушка любит суп. Она готовит борщ. В борще есть мясо, свёкла и капуста. Мы едим вместе в воскресенье. Я пью чай с лимоном. Бабушка пьёт чай с молоком. Нам хорошо дома. Я люблю воскресенье. Потом мы гуляем в парке.",
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
    script: "Сегодня суббота. Мы идём в кафе. Мой брат Иван заказывает пиццу. Я заказываю салат и воду. Салат маленький, но вкусный. Иван говорит: «Пицца горячая!» Мы смеёмся. Потом мы пьём кофе и едим торт. Торт очень сладкий.",
    questions: [
      {
        id: "ru-a1-1-l1",
        prompt: "Où vont-ils aujourd’hui ?",
        referenceAnswer: "Ils vont au café.",
        expectedPoints: ["au café"],
      },
      {
        id: "ru-a1-1-l2",
        prompt: "Que commande Ivan ?",
        referenceAnswer: "Il commande une pizza.",
        expectedPoints: ["une pizza"],
      },
      {
        id: "ru-a1-1-l3",
        prompt: "Que prennent-ils à la fin du repas ?",
        referenceAnswer: "Ils boivent du café et mangent un gâteau très sucré.",
        expectedPoints: ["du café", "un gâteau"],
      },
    ],
  },
  writing: {
    prompt: "Écris trois phrases en russe : dis ce que tu aimes manger et boire le matin, et ce que tu prépares ou manges le dimanche.",
  },
  audio: null,
  reviewedOn: null,
};
