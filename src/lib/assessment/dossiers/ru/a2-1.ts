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
    script: "В субботу погода наконец улучшилась. Мы рано пришли к пристани, купили билеты и сели у окна. Теплоход медленно плыл по реке, а гид рассказывал об истории города. Через час мы вышли на берег и пообедали в маленьком кафе. Вечером я позвонила маме: поездка мне очень понравилась.",
    questions: [
      {
        id: "ru-a2-1-l1",
        prompt: "Quel temps fait-il le samedi ?",
        referenceAnswer: "Il fait enfin beau.",
        expectedPoints: ["il fait beau"],
      },
      {
        id: "ru-a2-1-l2",
        prompt: "Que raconte le guide pendant la promenade sur la rivière ?",
        referenceAnswer: "Il raconte l’histoire de la ville.",
        expectedPoints: ["l’histoire de la ville"],
      },
      {
        id: "ru-a2-1-l3",
        prompt: "Que dit la narratrice à sa mère le soir ?",
        referenceAnswer: "Elle lui dit que le voyage lui a beaucoup plu.",
        expectedPoints: ["elle appelle sa mère", "le voyage lui a beaucoup plu"],
      },
    ],
  },
  writing: {
    prompt: "Écris trois phrases en russe : raconte un voyage ou une sortie que tu as faits, puis dis où tu iras la prochaine fois.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
