import type { UnitSource } from "@dailylingua/schemas";

/**
 * Russian, writing unit E1: the familiar letters а к м о т е (draft, `j4-pr2.md` §1, group 1 of
 * `src/lib/alphabets/ru.ts`). Every Cyrillic word uses only these six letters. Stress: combining acute (U+0301)
 * on every word of two syllables or more in `text` and `word`; `latin` is the letter-by-letter transliteration of
 * `ru.ts`, written without the stress mark (`units:check` recomputes it that way). Accepted answers of `type` items
 * are in Latin letters, without stress.
 */
export const ruA0E1LettresFamilieres = {
  id: "ru-a0-01-lettres-familieres",
  language: "ru",
  level: "A0",
  order: 1,
  kind: "script",
  voice: "ru-RU-SvetlanaNeural",
  title: { fr: "Les lettres familières", en: "Familiar letters" },
  situation: {
    fr: "Six lettres russes ressemblent aux nôtres : cinq se lisent presque pareil, et е cache un « y ». Avec elles, tu lis déjà tes premiers mots.",
    en: "Six Russian letters look like ours: five read almost the same, and е hides a 'y' sound. With them, you can already read your first words.",
  },
  minutes: 8,
  canDo: [
    { id: "cd1", text: { fr: "Je peux lire les lettres а, к, м, о, т et е.", en: "I can read the letters а, к, м, о, т and е." } },
    { id: "cd2", text: { fr: "Je peux lire des mots courts comme ма́ма et кот.", en: "I can read short words like ма́ма and кот." } },
  ],
  letters: [
    {
      upper: "А",
      lower: "а",
      latin: "a",
      name: "а",
      kind: "same",
      lookalike: null,
      sound: {
        fr: "comme « a » dans « papa » ; sans accent tonique, il devient plus faible",
        en: "like the 'a' in 'father'; when unstressed, it gets weaker",
      },
      example: { word: "там", translation: { fr: "là-bas", en: "there" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/e1.mp3" },
    },
    {
      upper: "К",
      lower: "к",
      latin: "k",
      name: "ка",
      kind: "same",
      lookalike: null,
      sound: { fr: "comme « k » dans « kilo »", en: "like the 'k' in 'kit', without the puff of air" },
      example: { word: "кот", translation: { fr: "chat", en: "cat" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/e2.mp3" },
    },
    {
      upper: "М",
      lower: "м",
      latin: "m",
      // The names эм and тэ use э (taught in E5); names are shown as labels, not as words to read.
      name: "эм",
      kind: "same",
      lookalike: null,
      sound: { fr: "comme « m » dans « mère »", en: "like the 'm' in 'mother'" },
      example: { word: "ма́ма", translation: { fr: "maman", en: "mum" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/e3.mp3" },
    },
    {
      upper: "О",
      lower: "о",
      latin: "o",
      name: "о",
      kind: "same",
      lookalike: null,
      sound: {
        fr: "comme « o » dans « porte » quand il est accentué ; sans accent, il se prononce plutôt « a »",
        en: "like the 'o' in 'more' when stressed; unstressed, it sounds more like 'a'",
      },
      example: { word: "том", translation: { fr: "tome, volume", en: "volume (of a book)" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/e4.mp3" },
    },
    {
      upper: "Т",
      lower: "т",
      latin: "t",
      name: "тэ",
      kind: "same",
      lookalike: null,
      sound: {
        fr: "comme « t » dans « table » ; en minuscule cursive, il ressemble à un m",
        en: "like the 't' in 'stop'; in handwriting, the small letter looks like an m",
      },
      example: { word: "так", translation: { fr: "ainsi, comme ça", en: "so, like this" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/e5.mp3" },
    },
    {
      upper: "Е",
      lower: "е",
      latin: "e",
      name: "е",
      // A false friend: the shape of a Latin e, but it reads "yé" (ru.ts classes it "same").
      kind: "false-friend",
      lookalike: "e",
      sound: {
        fr: "« yé », comme dans « yéti » ; après une consonne, il l’adoucit : те́ма se dit à peu près « t’yéma »",
        en: "'ye', as in 'yes'; after a consonant, it softens it: те́ма sounds roughly like 't-yema'",
      },
      example: { word: "те́ма", translation: { fr: "thème, sujet", en: "topic, theme" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/e6.mp3" },
    },
  ],
  words: [
    { id: "w01", text: "кот", latin: "kot", translation: { fr: "chat", en: "cat" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/w01.mp3" },
    { id: "w02", text: "ма́ма", latin: "mama", translation: { fr: "maman", en: "mum" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/w02.mp3" },
    { id: "w03", text: "там", latin: "tam", translation: { fr: "là-bas", en: "there" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/w03.mp3" },
    { id: "w04", text: "так", latin: "tak", translation: { fr: "ainsi, comme ça", en: "so, like this" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/w04.mp3" },
    { id: "w05", text: "как", latin: "kak", translation: { fr: "comment", en: "how" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/w05.mp3" },
    { id: "w06", text: "кто", latin: "kto", translation: { fr: "qui", en: "who" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/w06.mp3" },
    { id: "w07", text: "мак", latin: "mak", translation: { fr: "coquelicot", en: "poppy" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/w07.mp3" },
    { id: "w08", text: "том", latin: "tom", translation: { fr: "tome, volume", en: "volume (of a book)" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/w08.mp3" },
    { id: "w09", text: "те́ма", latin: "tema", translation: { fr: "thème, sujet", en: "topic, theme" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/w09.mp3" },
    { id: "w10", text: "коме́та", latin: "kometa", translation: { fr: "comète", en: "comet" }, audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/w10.mp3" },
  ],
  items: [
    // Lesson 1, letters: recognition.
    {
      id: "i01",
      kind: "match",
      pairs: [
        { left: "м", right: { fr: "« m »", en: "'m'" } },
        { left: "т", right: { fr: "« t »", en: "'t'" } },
        { left: "о", right: { fr: "« o »", en: "'o'" } },
        { left: "е", right: { fr: "« yé »", en: "'ye'" } },
      ],
      explain: {
        fr: "Ces lettres se lisent comme en français, sauf е, qui commence par un « y ».",
        en: "These letters read as in English, except е, which starts with a 'y' sound.",
      },
    },
    {
      id: "i02",
      kind: "mcq",
      prompt: { fr: "Quelle lettre se lit « yé » ?", en: "Which letter reads 'ye'?" },
      options: [
        { id: "a", text: "о" },
        { id: "b", text: "е" },
        { id: "c", text: "а" },
      ],
      answer: "b",
      audio: null,
      explain: {
        fr: "Е ressemble au e français, mais se lit « yé ».",
        en: "Е looks like an English e, but reads 'ye'.",
      },
    },
    {
      id: "i03",
      kind: "mcq",
      prompt: { fr: "Quelle lettre se lit « k » ?", en: "Which letter reads 'k'?" },
      options: [
        { id: "a", text: "м" },
        { id: "b", text: "т" },
        { id: "c", text: "к" },
      ],
      answer: "c",
      audio: null,
      explain: { fr: "К se lit « k », comme chez nous.", en: "К reads 'k', just like ours." },
    },
    {
      id: "i04",
      kind: "mcq",
      prompt: { fr: "Quelle est la minuscule de Т ?", en: "What is the small letter of Т?" },
      options: [
        { id: "a", text: "т" },
        { id: "b", text: "м" },
        { id: "c", text: "к" },
      ],
      answer: "a",
      audio: null,
      explain: {
        fr: "La minuscule т est un petit T. Attention : à la main, on l’écrit comme un m.",
        en: "The small т is a little T. Careful: in handwriting, it is written like an m.",
      },
    },
    // Lesson 1, sounds: listen, then pick the letter.
    {
      id: "i05",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Par quelle lettre commence ce mot ?", en: "Listen. Which letter does this word start with?" },
      options: [
        { id: "a", text: "т" },
        { id: "b", text: "к" },
        { id: "c", text: "м" },
      ],
      answer: "b",
      audioText: "кот",
      audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/i05.mp3",
      explain: { fr: "Tu as entendu кот (chat) : il commence par к.", en: "You heard кот (cat): it starts with к." },
    },
    {
      id: "i06",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quelle voyelle entends-tu ?", en: "Listen. Which vowel do you hear?" },
      options: [
        { id: "a", text: "а" },
        { id: "b", text: "о" },
        { id: "c", text: "е" },
      ],
      answer: "a",
      audioText: "там",
      audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/i06.mp3",
      explain: { fr: "Tu as entendu там (là-bas) : un « a » bien net.", en: "You heard там (there): a clear 'a'." },
    },
    // Lesson 2, words: read a word, find its meaning or its Latin spelling.
    {
      id: "i07",
      kind: "match",
      pairs: [
        { left: "кот", right: { fr: "chat", en: "cat" } },
        { left: "ма́ма", right: { fr: "maman", en: "mum" } },
        { left: "там", right: { fr: "là-bas", en: "there" } },
        { left: "кто", right: { fr: "qui", en: "who" } },
      ],
      explain: {
        fr: "Lis lettre par lettre : к-о-т, м-а-м-а, т-а-м, к-т-о.",
        en: "Read letter by letter: к-о-т, м-а-м-а, т-а-м, к-т-о.",
      },
    },
    {
      id: "i08",
      kind: "match",
      pairs: [
        { left: "так", right: { fr: "ainsi, comme ça", en: "so, like this" } },
        { left: "как", right: { fr: "comment", en: "how" } },
        { left: "мак", right: { fr: "coquelicot", en: "poppy" } },
        { left: "коме́та", right: { fr: "comète", en: "comet" } },
      ],
      explain: {
        fr: "Так, как et мак ne diffèrent que par la première lettre. Dans коме́та, le premier о n’est pas accentué : il se dit presque « a ».",
        en: "Так, как and мак differ only in their first letter. In коме́та, the first о is unstressed: it sounds almost like 'a'.",
      },
    },
    {
      id: "i09",
      kind: "mcq",
      prompt: { fr: "Comment s’écrit кто en lettres latines ?", en: "How is кто written in Latin letters?" },
      options: [
        { id: "a", text: "kot" },
        { id: "b", text: "kto" },
        { id: "c", text: "tok" },
      ],
      answer: "b",
      audio: null,
      explain: { fr: "К-т-о : kto, « qui ».", en: "К-т-о: kto, 'who'." },
    },
    {
      id: "i10",
      kind: "type",
      prompt: { fr: "Écris en lettres latines : мак", en: "Write in Latin letters: мак" },
      accept: ["mak"],
      explain: { fr: "М-а-к : mak, « coquelicot ».", en: "М-а-к: mak, 'poppy'." },
    },
    {
      id: "i11",
      kind: "type",
      prompt: { fr: "Écris en lettres latines : том", en: "Write in Latin letters: том" },
      accept: ["tom"],
      explain: { fr: "Т-о-м : tom, « tome, volume ».", en: "Т-о-м: tom, 'volume'." },
    },
    // Lesson 2, reading: listen, then pick the written word.
    {
      id: "i12",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quel mot entends-tu ?", en: "Listen. Which word do you hear?" },
      options: [
        { id: "a", text: "как" },
        { id: "b", text: "там" },
        { id: "c", text: "так" },
      ],
      answer: "c",
      audioText: "так",
      audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/i12.mp3",
      explain: {
        fr: "Так commence par т ; как, par к ; там finit par м.",
        en: "Так starts with т; как, with к; там ends with м.",
      },
    },
    {
      id: "i13",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quel mot entends-tu ?", en: "Listen. Which word do you hear?" },
      options: [
        { id: "a", text: "ма́ма" },
        { id: "b", text: "те́ма" },
        { id: "c", text: "том" },
      ],
      answer: "b",
      audioText: "те́ма",
      audio: "/unit-audio/ru/ru-a0-01-lettres-familieres/i13.mp3",
      explain: {
        fr: "Те́ма : le е se lit « yé » et adoucit le т.",
        en: "Те́ма: the е reads 'ye' and softens the т.",
      },
    },
    {
      id: "i14",
      kind: "mcq",
      prompt: { fr: "Lequel veut dire « chat » ?", en: "Which one means 'cat'?" },
      options: [
        { id: "a", text: "кто" },
        { id: "b", text: "мак" },
        { id: "c", text: "кот" },
      ],
      answer: "c",
      audio: null,
      explain: { fr: "Кот = chat ; кто = qui ; мак = coquelicot.", en: "Кот = cat; кто = who; мак = poppy." },
    },
  ],
  lessons: [
    {
      id: "l1",
      steps: [
        { step: "letters", itemIds: ["i01", "i02", "i03", "i04"], threshold: 0.5 },
        { step: "sounds", itemIds: ["i05", "i06"], threshold: 0.5 },
      ],
    },
    {
      id: "l2",
      steps: [
        { step: "words", itemIds: ["i07", "i08", "i09", "i10", "i11"], threshold: 0.6 },
        { step: "reading", itemIds: ["i12", "i13", "i14"], threshold: 0.5 },
      ],
    },
    {
      id: "l3",
      // The test's items are in `test` below; this step only places the test in lesson 3.
      steps: [{ step: "test", itemIds: [], threshold: 0.8 }],
    },
  ],
  test: {
    itemIds: ["i02", "i04", "i05", "i06", "i08", "i09", "i10", "i12", "i13", "i14"],
    passScore: 8,
  },
  aiReview: { reviewedOn: "2026-11-23", passes: 2, arbiter: "arbitre-relecture" },
  status: "published",
} satisfies UnitSource;
