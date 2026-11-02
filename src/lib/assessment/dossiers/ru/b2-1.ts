import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "ru-b2-1",
  language: "ru",
  level: "B2",
  topic: "sciences",
  title: "Когда опыт не повторяется",
  reading: {
    text: "Среди учёных давно ведутся споры о том, насколько надёжны опубликованные результаты исследований. Речь идёт о так называемом кризисе воспроизводимости: эксперименты, описанные в научных журналах, нередко не удаётся повторить в других лабораториях. Причины тому самые разные. Для читателя, далёкого от науки, это звучит тревожно, однако сами исследователи относятся к проблеме спокойнее, чем можно было бы ожидать. Одни специалисты считают, что виной всему погоня за сенсациями: редакции охотнее печатают яркие открытия, нежели скромные подтверждения уже известного. Другие указывают на недостаточную статистическую подготовку исследователей, которые, не заметив ошибки в расчётах, делают поспешные выводы. Третьи, напротив, убеждены, что проблема преувеличена, поскольку наука по природе своей самокорректируется: неверные гипотезы рано или поздно отбрасываются. Показательным примером служит психология, где повторные эксперименты не раз опровергали некогда общепризнанные выводы. Тем не менее многие институты уже начали менять правила. Заранее зарегистрированные планы экспериментов, открытые данные и обязательная проверка расчётов независимым экспертом постепенно становятся нормой. Финансирующие организации, в свою очередь, начали требовать от грантополучателей подробных отчётов о методах, а журналы — публиковать и отрицательные результаты, которые прежде отправлялись в архив. Разумеется, подобные меры требуют времени и денег, поэтому одни лаборатории перестраиваются быстрее, чем другие. Показательно и то, что в ряде университетов появились группы, занимающиеся исключительно повторением чужих опытов. Прежде такая работа считалась неблагодарной, поскольку не приносила ни славы, ни публикаций; теперь же её всё чаще рассматривают как важную часть научной карьеры. Впрочем, скептики напоминают: даже самые строгие процедуры не гарантируют истины, а лишь снижают вероятность ошибки.",
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
    script: "Ну что ж, давайте посмотрим, как проверка чужих опытов выглядит на практике. Представьте себе молодого биолога, который, э-э, потратил полгода на повторение чужого опыта и получил совсем другой результат. Раньше он, скорее всего, промолчал бы, ведь ссориться с авторами известной статьи — значит рисковать карьерой. Сегодня же он может опубликовать свои данные в открытом архиве, и коллеги, проверив их, либо подтвердят его вывод, либо найдут ошибку. Согласитесь, это совсем другая атмосфера. Конечно, спор между авторами и проверяющими не всегда проходит гладко: бывает, что обе стороны остаются при своём мнении. Но, как ни странно, именно такие споры и двигают науку вперёд, потому что заставляют всех работать тщательнее.",
    questions: [
      {
        id: "ru-b2-1-l1",
        prompt: "Quelle différence y a-t-il entre hier et aujourd’hui pour un jeune chercheur dont le résultat contredit une étude connue ?",
        referenceAnswer: "Autrefois il se serait tu pour ne pas risquer sa carrière ; aujourd’hui il peut publier ses données dans une archive ouverte.",
        expectedPoints: ["autrefois il se taisait par crainte pour sa carrière", "aujourd’hui il publie ses données en archive ouverte"],
      },
      {
        id: "ru-b2-1-l2",
        prompt: "Que peuvent faire les collègues une fois ces données publiées ?",
        referenceAnswer: "Après vérification, ils confirment sa conclusion ou découvrent une erreur.",
        expectedPoints: ["ils vérifient les données", "ils confirment ou trouvent une erreur"],
      },
      {
        id: "ru-b2-1-l3",
        prompt: "Pourquoi le locuteur juge-t-il ces désaccords finalement utiles ?",
        referenceAnswer: "Parce qu’ils obligent tous les chercheurs à travailler avec plus de soin et font ainsi avancer la science, même sans accord final.",
        expectedPoints: ["les désaccords poussent à plus de rigueur", "ils font avancer la science"],
      },
    ],
  },
  writing: {
    prompt: "Écris cinq phrases en russe : donne ton opinion sur la nécessité de vérifier les résultats scientifiques avant de les croire, avec au moins un argument et un exemple possible.",
  },
  audio: null,
  reviewedOn: null,
};
