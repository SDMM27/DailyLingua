import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "ru-c1-1",
  language: "ru",
  level: "C1",
  topic: "histoire",
  title: "Молчание летописца",
  reading: {
    text: "Историю принято считать наукой о прошлом, однако, строго говоря, она занимается не самим прошлым, которое безвозвратно ушло, а теми следами, которые оно оставило. Следы эти редко бывают полными: письма сохраняются случайно, документы уничтожаются при пожарах и переездах, а то, что кажется современникам слишком очевидным, вообще не записывается. К этому добавляется и то, что сам историк — человек своего времени, и вопросы, которые он задаёт прошлому, подсказаны его собственной эпохой. Исследователь, работающий с источниками, неизбежно оказывается перед выбором: либо довольствоваться немногим, либо достраивать недостающее собственными догадками. Второй путь заманчив, но коварен, поскольку любая догадка, повторённая достаточное количество раз, рискует превратиться в факт.\n\nПоказателен случай вымышленного, но вполне типичного уездного города, летопись которого дошла до нас в единственном списке. Составитель, будучи человеком набожным и осторожным, подробно описывал церковные праздники и урожаи, но обходил молчанием споры горожан с местным начальством, считая их недостойными пера. Любопытно, что он, судя по всему, искренне считал умолчание об этих спорах добродетелью: в его понимании хроника должна была назидать, а не разоблачать. Вследствие этого потомки долгое время представляли себе этот город тихим и благополучным, и лишь случайно найденная счётная книга показала, насколько эта картина расходится с действительностью. Выяснилось, что именно в те годы, которые летописец называл спокойными, в городе то и дело вспыхивали волнения.\n\nОтсюда, впрочем, не следует, что источникам нельзя доверять. Скорее, речь идёт о том, что каждый из них говорит голосом своего автора, отражая его страхи, предрассудки и представления о приличном. Иными словами, молчание источника — такое же свидетельство, как и то, что в нём сказано, хотя прочесть его несравненно труднее. Задача историка, таким образом, состоит не в том, чтобы извлечь из документа «чистую правду», а в том, чтобы научиться читать его между строк, сопоставляя свидетельства, расходящиеся друг с другом. Именно в этих расхождениях, как ни парадоксально, и скрыто наиболее ценное: они позволяют увидеть, о чём люди спорили, чего опасались и что предпочитали забыть.",
    questions: [
      {
        id: "ru-c1-1-r1",
        prompt: "Que veut dire l’auteur en affirmant que l’histoire s’occupe des traces plutôt que du passé lui-même ?",
        referenceAnswer: "Que le passé a disparu pour toujours ; l’historien ne dispose que de vestiges incomplets, conservés au hasard, qu’il lui faut interpréter, au risque de combler les vides par des conjectures.",
        expectedPoints: ["le passé lui-même est inaccessible", "les traces sont lacunaires et dues au hasard", "risque de conjectures prises pour des faits"],
      },
      {
        id: "ru-c1-1-r2",
        prompt: "Pourquoi l’exemple de la chronique de la ville fictive est-il révélateur ?",
        referenceAnswer: "Le chroniqueur, par piété et prudence, a passé sous silence les conflits et conçu sa chronique comme édifiante ; l’image paisible de la ville était donc trompeuse, démentie par un registre comptable retrouvé par hasard.",
        expectedPoints: ["silence volontaire sur les conflits", "image trompeuse d’une ville paisible", "démentie par une découverte fortuite"],
      },
      {
        id: "ru-c1-1-r3",
        prompt: "Quelle attitude l’auteur recommande-t-il envers les sources, et où situe-t-il leur plus grande valeur ?",
        referenceAnswer: "Ni confiance naïve ni rejet : lire entre les lignes en confrontant les témoignages. Les contradictions sont précieuses car elles révèlent ce dont les gens débattaient, ce qu’ils craignaient et voulaient oublier.",
        expectedPoints: ["lire entre les lignes, confronter les témoignages", "la valeur est dans les divergences", "elles révèlent débats, peurs et oublis"],
      },
    ],
  },
  listening: {
    source: "youtube",
    video: {
      youtubeId: "taOi3Zm-H8g",
      title: "Естественные и гуманитарные науки — Григорий Юдин",
      channel: "ПостНаука",
      start: 929,
      end: 1026,
      checkedOn: null,
    },
    questions: [
      {
        id: "ru-c1-1-l1",
        prompt: "Que propose le conférencier quand il parle du naturalisme ?",
        referenceAnswer: "Il propose de retourner la perspective : étudier le naturalisme lui-même comme un phénomène de l’histoire humaine, et se demander ce qui le provoque, comme le feraient les sciences humaines.",
        expectedPoints: ["étudier le naturalisme lui-même comme un phénomène humain / historique", "se demander ce qui le provoque"],
      },
      {
        id: "ru-c1-1-l2",
        prompt: "D’après lui, pourquoi cherche-t-on aujourd’hui à expliquer les différences entre les gens par des causes naturelles ?",
        referenceAnswer: "Parce que la société manque de solidarité et que l’on a du mal à trouver un langage commun ; ramener les différences à la nature, présentées comme données et immuables, dispense de chercher ce langage commun.",
        expectedPoints: ["manque de solidarité / mal à trouver un langage commun", "cela dispense de chercher ce langage commun"],
      },
      {
        id: "ru-c1-1-l3",
        prompt: "À quoi fait-il allusion en parlant de conséquences « pas très gaies » à la fin du XIXe et au début du XXe siècle, et quelle est son intention ?",
        referenceAnswer: "C’est une litote : il évoque sans les nommer les doctrines qui, en présentant les différences comme naturelles, ont ouvert la voie à l’élimination de ceux qui étaient jugés différents. Il met en garde contre la naturalisation des différences.",
        expectedPoints: ["une litote / une allusion à des faits graves", "l’élimination de ceux jugés différents par nature", "une mise en garde"],
      },
    ],
  },
  writing: {
    prompt: "Écris six phrases en russe : à partir de ce que dit le texte, explique pourquoi il est risqué de se fier à une seule source pour comprendre une époque, en illustrant par une situation de ton choix, réelle ou imaginaire.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
