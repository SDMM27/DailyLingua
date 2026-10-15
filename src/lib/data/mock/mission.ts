import type { DateKey } from "@/lib/schemas/common";
import type { Mission } from "@/lib/schemas/mission";

/**
 * Demo mission. Sources are real outlets, but titles and exercises are invented
 * for the UI prototype, so links point to the outlet's homepage rather than to
 * an article that may not exist.
 */
export function buildMockMission(today: DateKey): Mission {
  return {
    id: `mission-${today}`,
    date: today,
    budgetMinutes: 30,
    sessions: [
      {
        id: "ru-session",
        language: "ru",
        content: {
          title: "Городская акустика: как шум меняет пение птиц",
          type: "article",
          language: "ru",
          source: { name: "ПостНаука", homepage: "https://postnauka.org" },
          url: "https://postnauka.org",
          difficulty: "C1",
          durationMinutes: 8,
          summary:
            "Un article de vulgarisation sur l'adaptation des oiseaux urbains au bruit : chants plus aigus, horaires décalés, et ce que les confinements de 2020 ont permis d'observer.",
          transcriptAvailable: true,
        },
        activities: [
          { id: "ru-read", kind: "reading", title: "Lire l'article", estimatedMinutes: 8 },
          { id: "ru-quiz", kind: "comprehension", title: "Questions de compréhension", estimatedMinutes: 5 },
          { id: "ru-vocab", kind: "vocabulary", title: "Cinq expressions à retenir", estimatedMinutes: 3 },
          { id: "ru-write", kind: "writing", title: "Écrire un court paragraphe", estimatedMinutes: 4 },
        ],
        questions: [
          {
            id: "ru-q1",
            prompt: "Почему городские птицы поют выше, чем их лесные сородичи?",
            options: [
              "Чтобы их не заглушал низкочастотный шум транспорта",
              "Потому что в городе в среднем теплее",
              "Из-за круглосуточного искусственного освещения",
            ],
            answerIndex: 0,
            explanation:
              "Le bruit routier occupe surtout les basses fréquences : un chant plus aigu reste audible.",
          },
          {
            id: "ru-q2",
            prompt: "Что заметили исследователи во время локдауна 2020 года?",
            options: [
              "Птицы перестали петь по утрам",
              "Птицы стали петь тише, а их песни — богаче",
              "Птицы массово покинули города",
            ],
            answerIndex: 1,
            explanation:
              "Avec moins de bruit, les oiseaux n'avaient plus besoin de « crier » : chants plus doux et plus variés.",
          },
          {
            id: "ru-q3",
            prompt: "Как автор понимает выражение «не в последнюю очередь» в последнем абзаце?",
            options: ["В конце концов", "В значительной степени, в том числе", "Ни в коем случае"],
            answerIndex: 1,
            explanation:
              "« Не в последнюю очередь » = notamment, pour une bonne part. Un marqueur très fréquent à l'écrit (C1).",
          },
        ],
        expressions: [
          {
            id: "ru-e1",
            text: "приспоса́бливаться к чему́-либо",
            translation: "s'adapter à qqch",
            example: "Птицы приспосабливаются к городскому шуму быстрее, чем считалось.",
            note: "Perfectif : приспособиться",
          },
          {
            id: "ru-e2",
            text: "в ра́зы",
            translation: "plusieurs fois (plus / moins)",
            example: "Ночью уровень шума в разы ниже.",
          },
          {
            id: "ru-e3",
            text: "своди́ться к чему́-либо",
            translation: "se résumer à, se ramener à",
            example: "Проблема не сводится к одному только шуму.",
          },
          {
            id: "ru-e4",
            text: "не в после́днюю о́чередь",
            translation: "notamment, en bonne partie",
            example: "Это произошло не в последнюю очередь благодаря локдауну.",
          },
          {
            id: "ru-e5",
            text: "бить трево́гу",
            translation: "tirer la sonnette d'alarme",
            example: "Орнитологи бьют тревогу уже не первый год.",
          },
        ],
        production: {
          mode: "writing",
          prompt:
            "Как шум в вашем городе влияет на вашу повседневную жизнь? Напишите короткий текст и используйте минимум три выражения из урока.",
          targetLength: "120–150 слов",
          hints: [
            "Commence par une situation concrète (le matin, les transports…)",
            "Utilise un connecteur de C1 : впрочем, тем не менее, иными словами",
            "Termine par une proposition ou une opinion personnelle",
          ],
        },
      },
      {
        id: "it-session",
        language: "it",
        content: {
          title: "La pausa caffè, un rito che cambia",
          type: "podcast",
          language: "it",
          source: { name: "Il Post", homepage: "https://www.ilpost.it/podcasts/" },
          url: "https://www.ilpost.it/podcasts/",
          difficulty: "B2",
          durationMinutes: 4,
          summary:
            "Un court épisode sur l'évolution du café au bar en Italie : prix, habitudes, et ce que le rituel dit du quotidien.",
          transcriptAvailable: false,
        },
        activities: [
          { id: "it-listen", kind: "listening", title: "Écouter l'extrait (4 min)", estimatedMinutes: 4 },
          { id: "it-vocab", kind: "vocabulary", title: "Expressions du quotidien", estimatedMinutes: 2 },
          { id: "it-speak", kind: "speaking", title: "Parler 2 minutes sans t'arrêter", estimatedMinutes: 4 },
        ],
        questions: [],
        expressions: [
          {
            id: "it-e1",
            text: "fare due chiacchiere",
            translation: "bavarder un peu",
            example: "Al bar ci fermiamo sempre a fare due chiacchiere.",
          },
          {
            id: "it-e2",
            text: "al volo",
            translation: "en vitesse, sur le pouce",
            example: "Prendo un caffè al volo e scappo in ufficio.",
          },
          {
            id: "it-e3",
            text: "mica male",
            translation: "pas mal du tout",
            example: "Un espresso a un euro e venti? Mica male.",
          },
          {
            id: "it-e4",
            text: "fare un salto",
            translation: "faire un saut, passer (quelque part)",
            example: "Faccio un salto al bar prima della riunione.",
          },
        ],
        production: {
          mode: "speaking",
          prompt:
            "Registrati per due minuti: racconta la tua routine del mattino. Usa almeno tre espressioni e non fermarti, anche se sbagli.",
          hints: [
            "Parle à voix haute, même seul·e : le but est la fluidité",
            "Si un mot manque, contourne-le (« quella cosa che… »)",
            "Réécoute-toi et note une erreur à corriger demain",
          ],
        },
      },
    ],
  };
}
