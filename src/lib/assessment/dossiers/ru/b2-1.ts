import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "ru-b2-1",
  language: "ru",
  level: "B2",
  topic: "sciences",
  title: "Когда опыт не повторяется",
  reading: {
    text: "Среди учёных давно ведутся споры о том, насколько надёжны опубликованные результаты исследований. Речь идёт о так называемом кризисе воспроизводимости: эксперименты, описанные в научных журналах, нередко не удаётся повторить в других лабораториях. Причины тому самые разные. Для читателя, мало знакомого с наукой, это звучит тревожно, однако сами исследователи относятся к проблеме спокойнее, чем можно было бы ожидать. Одни специалисты считают, что виной всему погоня за сенсациями: редакции охотнее публикуют сенсационные открытия, чем скромные подтверждения уже известных результатов. Другие указывают на недостаточную статистическую подготовку исследователей, которые, не заметив ошибки в расчётах, делают поспешные выводы. Третьи, напротив, убеждены, что проблема преувеличена, поскольку наука по природе своей самокорректируется: неверные гипотезы рано или поздно отбрасываются. Показательным примером служит психология, где повторные эксперименты не раз опровергали некогда общепризнанные выводы. Тем не менее многие институты уже начали менять правила. Заранее зарегистрированные планы экспериментов, открытые данные и обязательная проверка расчётов независимым экспертом постепенно становятся нормой. Финансирующие организации, в свою очередь, начали требовать от грантополучателей подробных отчётов о методах, а журналы — публиковать и отрицательные результаты, которые прежде отправлялись в архив. Разумеется, подобные меры требуют времени и денег, поэтому одни лаборатории переходят на новые правила быстрее, чем другие. Показательно и то, что в ряде университетов появились группы, занимающиеся исключительно повторением чужих опытов. Прежде такая работа считалась неблагодарной, поскольку не приносила ни славы, ни публикаций; теперь же её всё чаще рассматривают как важную часть научной карьеры. Впрочем, скептики напоминают: даже самые строгие процедуры не гарантируют истины, а лишь снижают вероятность ошибки.",
    questions: [
      {
        id: "ru-b2-1-r1",
        prompt: "Quel problème est au cœur de l’article, et pourquoi peut-il inquiéter ?",
        referenceAnswer: "Les résultats publiés sont souvent impossibles à reproduire dans d’autres laboratoires, ce qui fait douter de la fiabilité de la recherche.",
        expectedPoints: ["difficulté à reproduire les expériences", "doute sur la fiabilité des résultats publiés"],
      },
      {
        id: "ru-b2-1-r2",
        prompt: "Quelles positions les spécialistes adoptent-ils sur l’origine du problème ?",
        referenceAnswer: "Pour les uns, la course aux découvertes spectaculaires dans les revues ; pour d’autres, une formation insuffisante en statistiques ; pour d’autres encore, le problème est exagéré car la science se corrige d’elle-même.",
        expectedPoints: ["course aux sensations", "formation statistique insuffisante", "problème exagéré : la science se corrige"],
      },
      {
        id: "ru-b2-1-r3",
        prompt: "Que suggère la remarque finale des sceptiques ?",
        referenceAnswer: "Que même des procédures très strictes ne garantissent pas la vérité : elles réduisent seulement le risque d’erreur, il faut donc rester prudent.",
        expectedPoints: ["aucune procédure ne garantit la vérité", "elles réduisent seulement le risque d’erreur"],
      },
    ],
  },
  listening: {
    source: "youtube",
    video: {
      youtubeId: "sxjqV1e_2SY",
      title: "Russian Listening Practice (B2+) - Our Life as Parents",
      channel: "Russian With Max",
      start: 177,
      end: 266,
      checkedOn: null,
    },
    questions: [
      {
        id: "ru-b2-1-l1",
        prompt: "Comment appelle-t-on cette période en russe et en anglais, et à quel âge se produit-elle ?",
        referenceAnswer: "La « crise des trois ans » en russe, les « terrible two » en anglais ; elle peut commencer vers deux ans et durer jusqu’à quatre ans environ, selon l’enfant.",
        expectedPoints: ["crise des trois ans / terrible two", "de deux à environ quatre ans", "dépend de l’enfant"],
      },
      {
        id: "ru-b2-1-l2",
        prompt: "Que se passe-t-il pour l’enfant pendant cette période, et d’où vient sa frustration ?",
        referenceAnswer: "Il prend conscience d’être une personne à part, avec ses propres désirs ; il découvre que ses désirs ne peuvent pas tous être satisfaits tout de suite, ce qui provoque beaucoup d’émotions et de la frustration.",
        expectedPoints: ["il se perçoit comme une personne à part, avec ses désirs", "tous ses désirs ne peuvent pas être satisfaits immédiatement", "d’où émotions et frustration"],
      },
      {
        id: "ru-b2-1-l3",
        prompt: "Où en est leur fille Sabrina aujourd’hui, d’après Ioulia ?",
        referenceAnswer: "Le pic de la crise est passé ; elle peut encore pleurer, par exemple parce qu’elle veut faire du vélo sous la pluie tout de suite, mais il est bien plus facile de discuter avec elle et de lui expliquer, et elle se calme et passe à autre chose plus vite.",
        expectedPoints: ["le pic est passé", "elle pleure encore parfois (exemple du vélo sous la pluie)", "on peut lui expliquer, elle se calme plus vite"],
      },
    ],
  },
  writing: {
    prompt: "Écris cinq phrases en russe : donne ton opinion sur la nécessité de vérifier les résultats scientifiques avant de les croire, avec au moins un argument et un exemple possible.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
