import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "ru-b1-1",
  language: "ru",
  level: "B1",
  topic: "société",
  title: "Двор, который починили соседи",
  reading: {
    text: "Жители одного из спальных районов нашего города уже второй год собираются по субботам во дворе старой школы. Всё началось, когда соседи заметили, что детская площадка почти разрушена, а городские службы не спешат её ремонтировать. Вместо того чтобы жаловаться, несколько человек решили действовать сами. Они создали чат, где обсуждали, какие материалы нужны и кто может помочь. Оказалось, что среди жителей есть плотник, два студента-архитектора и пенсионерка, которая раньше преподавала рисование. Сначала многие сомневались, что из этой затеи что-то получится, однако уже через месяц площадка выглядела совсем иначе. Узнав об инициативе, мэрия предложила предоставить краску и инструменты. Жители, впрочем, не хотят, чтобы дальнейшая судьба двора зависела только от решений властей. Теперь инициативная группа занимается не только ремонтом: она организует ярмарки, на которых соседи обмениваются ненужными вещами, и вечера, на которых старшие учат молодых готовить и шить. Организаторы подчёркивают, что главная ценность проекта не в покрашенных скамейках, а в том, что люди наконец узнали друг друга. Правда, не все довольны: некоторые жильцы жалуются на шум по выходным. Поэтому участники пообещали, что будут заканчивать работу до обеда.",
    questions: [
      {
        id: "ru-b1-1-r1",
        prompt: "Pourquoi les habitants ont-ils décidé d’agir eux-mêmes plutôt que d’attendre ?",
        referenceAnswer: "L’aire de jeux était presque détruite et les services municipaux tardaient à la réparer ; ils ont préféré agir plutôt que de se contenter de se plaindre.",
        expectedPoints: ["aire de jeux en mauvais état", "lenteur des services municipaux", "refus de seulement se plaindre"],
      },
      {
        id: "ru-b1-1-r2",
        prompt: "En quoi l’initiative est-elle allée au-delà de son but de départ ?",
        referenceAnswer: "Le groupe organise aussi des foires où l’on échange des objets et des soirées où les aînés enseignent la cuisine et la couture aux jeunes.",
        expectedPoints: ["foires d’échange d’objets", "soirées de transmission entre générations"],
      },
      {
        id: "ru-b1-1-r3",
        prompt: "Selon les organisateurs, qu’est-ce qui compte vraiment dans ce projet, et quelle réserve est exprimée ?",
        referenceAnswer: "Ce qui compte, c’est que les voisins se connaissent enfin, plus que les bancs repeints. Certains habitants se plaignent toutefois du bruit le week-end.",
        expectedPoints: ["les liens entre voisins", "des plaintes à cause du bruit"],
      },
    ],
  },
  listening: {
    source: "youtube",
    video: {
      youtubeId: "OSnJIAqVkkk",
      title: "Выпуск 33 – Прочитал 10 книг, мой топ - Intermediate Russian podcast (sub)",
      channel: "Russian Progress",
      start: 700,
      end: 770,
      checkedOn: null,
    },
    questions: [
      {
        id: "ru-b1-1-l1",
        prompt: "Pourquoi a-t-il choisi ce livre juste après Sapiens ?",
        referenceAnswer: "Il voulait lire quelque chose de plus simple, parce que Sapiens était très long : 17 heures d’écoute.",
        expectedPoints: ["quelque chose de plus simple / plus léger", "Sapiens était très long (17 heures)"],
      },
      {
        id: "ru-b1-1-l2",
        prompt: "De quoi parle ce livre ?",
        referenceAnswer: "De la philosophie de vie des Suédois, le lagom : tout faire avec mesure, chercher le juste milieu.",
        expectedPoints: ["l’approche suédoise de la vie", "tout avec mesure / le juste milieu"],
      },
      {
        id: "ru-b1-1-l3",
        prompt: "Que fait l’écologiste qui suit le lagom quand il ne peut pas trier ses déchets, et pourquoi ?",
        referenceAnswer: "Il jette tout dans une seule poubelle au lieu de chercher pendant des heures : il n’est pas fanatique, il fait ce qui est raisonnable quand c’est possible.",
        expectedPoints: ["il jette tout dans un seul conteneur", "il ne passe pas des heures à chercher", "il n’est pas fanatique / il reste raisonnable"],
      },
    ],
  },
  writing: {
    prompt: "Écris quatre phrases en russe : décris un problème de ton quartier ou de ta ville et propose ce que les habitants pourraient faire eux-mêmes pour le résoudre.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
