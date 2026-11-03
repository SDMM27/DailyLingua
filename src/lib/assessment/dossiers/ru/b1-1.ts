import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "ru-b1-1",
  language: "ru",
  level: "B1",
  topic: "société",
  title: "Двор, который починили соседи",
  reading: {
    text: "Жители одного из спальных районов нашего города уже второй год собираются по субботам во дворе старой школы. Всё началось, когда соседи заметили, что детская площадка почти разрушена, а городские службы не спешат её ремонтировать. Вместо того чтобы жаловаться, несколько человек решили действовать сами. Они создали чат, где обсуждали, какие материалы нужны и кто может помочь. Оказалось, что среди жителей есть плотник, два студента-архитектора и пенсионерка, которая раньше преподавала рисование. Сначала многие сомневались, что из этой затеи что-то получится, однако уже через месяц площадка выглядела совсем иначе. Мэрия, узнав об инициативе, предложила выделить краску и инструменты. Жители, впрочем, не хотят зависеть от чужих решений. Теперь инициативная группа занимается не только ремонтом: она организует ярмарки, на которых соседи обмениваются ненужными вещами, и вечера, где старшие учат молодых готовить и шить. Организаторы подчёркивают, что главная ценность проекта не в покрашенных скамейках, а в том, что люди наконец узнали друг друга. Правда, не все довольны: некоторые жильцы жалуются на шум по выходным. Поэтому участники пообещали, что будут заканчивать работу до обеда.",
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
    script: "Соседи, которые сами отремонтировали детскую площадку, теперь говорят о новой цели. Они хотят, чтобы похожие группы появились и в других районах. Для этого они подготовили небольшую инструкцию: как найти единомышленников, с чего начать и как договориться с властями. По словам одной из участниц, главное — не бояться первого шага. Если бы она тогда, когда проект только начинался, промолчала, то площадка до сих пор оставалась бы сломанной. Сегодня к ним приезжают гости из соседних городов, чтобы перенять опыт.",
    questions: [
      {
        id: "ru-b1-1-l1",
        prompt: "Quel nouvel objectif les voisins se fixent-ils ?",
        referenceAnswer: "Que des groupes semblables apparaissent dans d’autres quartiers.",
        expectedPoints: ["des groupes semblables dans d’autres quartiers"],
      },
      {
        id: "ru-b1-1-l2",
        prompt: "Que contient le petit guide qu’ils ont préparé ?",
        referenceAnswer: "Des conseils pour trouver des personnes motivées, savoir par où commencer et s’entendre avec les autorités.",
        expectedPoints: ["trouver des gens motivés", "par où commencer", "s’entendre avec les autorités"],
      },
      {
        id: "ru-b1-1-l3",
        prompt: "Selon une participante, qu’est-ce qui est le plus important, et que se serait-il passé sans cela ?",
        referenceAnswer: "Le plus important est de ne pas avoir peur du premier pas ; sans cela, l’aire de jeux serait encore cassée.",
        expectedPoints: ["ne pas craindre le premier pas", "l’aire de jeux serait encore cassée"],
      },
    ],
  },
  writing: {
    prompt: "Écris quatre phrases en russe : décris un problème de ton quartier ou de ta ville et propose ce que les habitants pourraient faire eux-mêmes pour le résoudre.",
  },
  audio: null,
  reviewedOn: null,
};
