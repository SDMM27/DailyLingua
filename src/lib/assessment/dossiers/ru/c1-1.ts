import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "ru-c1-1",
  language: "ru",
  level: "C1",
  topic: "histoire",
  title: "Молчание летописца",
  reading: {
    text: "Историю принято считать наукой о прошлом, однако, строго говоря, она занимается не самим прошлым, которое безвозвратно ушло, а теми следами, которые оно оставило. Следы эти редко бывают полными: письма сохраняются случайно, документы уничтожаются при пожарах и переездах, а то, что кажется современникам слишком очевидным, вообще не записывается. К этому добавляется и то, что сам историк — человек своего времени, и вопросы, которые он задаёт прошлому, подсказаны его собственной эпохой. Исследователь, работающий с источниками, неизбежно оказывается перед выбором: либо довольствоваться немногим, либо достраивать недостающее собственными догадками. Второй путь заманчив, но коварен, ибо любая догадка, повторённая достаточное количество раз, рискует превратиться в факт.\n\nПоказателен случай вымышленного, но вполне типичного уездного города, летопись которого дошла до нас в единственном списке. Составитель, будучи человеком набожным и осторожным, подробно описывал церковные праздники и урожаи, но обходил молчанием споры горожан с наместником, считая их недостойными пера. Любопытно, что он, судя по всему, искренне полагал свои умолчания добродетелью: в его понимании хроника должна была назидать, а не разоблачать. Вследствие этого потомки долгое время представляли себе этот город тихим и благополучным, и лишь случайно найденная счётная книга показала, насколько далеко эта картина отстоит от действительности. Выяснилось, что именно в те годы, которые летописец называл спокойными, в городе то и дело вспыхивали волнения.\n\nОтсюда, впрочем, не следует, что источникам нельзя доверять. Скорее, речь идёт о том, что каждый из них говорит голосом своего автора, отражая его страхи, предрассудки и представления о приличном. Иными словами, молчание источника — такое же свидетельство, как и его слово, хотя прочесть его несравненно труднее. Задача историка, таким образом, состоит не в том, чтобы извлечь из документа «чистую правду», а в том, чтобы научиться читать его между строк, сопоставляя свидетельства, расходящиеся друг с другом. Именно в этих расхождениях, как ни парадоксально, и скрыто наиболее ценное: они позволяют увидеть, о чём люди спорили, чего опасались и что предпочитали забыть.",
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
    script: "Вернёмся к нашему вымышленному городу и представим, что счётная книга с записями о недовольстве так и не нашлась. Вероятно, в учебниках этот город навсегда остался бы образцом покоя и благочестия, и никому не пришло бы в голову сомневаться. Мы бы так и жили с уверенностью, что знаем эту эпоху. Вот что любопытно: забвение редко бывает делом злого умысла; чаще оно складывается из тысячи мелких решений — что сохранить, что выбросить, о чём промолчать. Каждое из них по отдельности кажется безобидным, но, складываясь, они выстраивают целую картину прошлого, которой потомки доверяют без оговорок. Поэтому добросовестный историк обязан постоянно спрашивать себя не только о том, что сказано в документе, но и о том, кто и зачем его сохранил. Ответ на этот вопрос порой оказывается красноречивее самого текста.",
    questions: [
      {
        id: "ru-c1-1-l1",
        prompt: "Quelle hypothèse le locuteur formule-t-il pour le cas où le registre n’aurait jamais été retrouvé ?",
        referenceAnswer: "La ville serait restée dans les manuels un modèle de calme et de piété, sans que personne n’en doute, et l’on croirait connaître l’époque.",
        expectedPoints: ["image de calme et de piété maintenue", "personne ne douterait"],
      },
      {
        id: "ru-c1-1-l2",
        prompt: "Comment, selon le locuteur, l’oubli se produit-il le plus souvent ?",
        referenceAnswer: "Rarement par malveillance ; le plus souvent par une multitude de petits choix anodins (conserver, jeter, taire) qui, ensemble, composent une image du passé.",
        expectedPoints: ["rarement un acte malveillant", "somme de petits choix anodins", "ils composent une image du passé"],
      },
      {
        id: "ru-c1-1-l3",
        prompt: "Quelle question l’historien consciencieux doit-il se poser en plus du contenu du document, et pourquoi ?",
        referenceAnswer: "Qui a conservé le document et pourquoi : la réponse est parfois plus éloquente que le texte lui-même.",
        expectedPoints: ["qui l’a conservé et pourquoi", "la réponse peut être plus parlante que le texte"],
      },
    ],
  },
  writing: {
    prompt: "Écris six phrases en russe : à partir de ce que dit le texte, explique pourquoi il est risqué de se fier à une seule source pour comprendre une époque, en illustrant par une situation de ton choix, réelle ou imaginaire.",
  },
  audio: null,
  reviewedOn: null,
};
