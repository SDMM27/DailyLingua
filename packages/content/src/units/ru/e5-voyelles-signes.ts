import type { UnitSource } from "@dailylingua/schemas";

/**
 * Russian, writing unit E5: the iotated vowels and the signs, ё э ю я ь ъ (draft, `j4-pr2.md` §1, group 5 of
 * `src/lib/alphabets/ru.ts`). With it, the learner has seen the whole alphabet. Stress: combining acute (U+0301)
 * on every word of two syllables or more in `text` and `word`, except where ё carries it (ё is always stressed and
 * takes no extra mark); `latin` is the letter-by-letter transliteration of `ru.ts` (ë, è, ju, ja, ʹ, ʺ), without
 * the stress mark. `type` items also accept the common English-style spelling (ya, yu) besides ja, ju.
 */
export const ruA0E5VoyellesSignes = {
  id: "ru-a0-05-voyelles-signes",
  language: "ru",
  level: "A0",
  order: 5,
  kind: "script",
  voice: "ru_RU-denis-medium",
  title: { fr: "Voyelles en « y » et signes", en: "'Y' vowels and signs" },
  situation: {
    fr: "Les dernières lettres : quatre voyelles, dont trois commencent par un « y », et deux signes qui ne se prononcent pas.",
    en: "The last letters: four vowels, three of which start with a 'y' sound, and two signs that are not pronounced.",
  },
  minutes: 12,
  canDo: [
    { id: "cd1", text: { fr: "Je peux lire les lettres ё, э, ю, я, ь et ъ.", en: "I can read the letters ё, э, ю, я, ь and ъ." } },
    { id: "cd2", text: { fr: "Je peux lire tous les mots russes, lettre par lettre, comme семья́ ou Росси́я.", en: "I can read any Russian word, letter by letter, like семья́ or Росси́я." } },
  ],
  letters: [
    {
      upper: "Ё",
      lower: "ё",
      latin: "ë",
      name: "ё",
      kind: "new",
      lookalike: null,
      sound: {
        fr: "« yo », comme dans « yoyo » ; toujours accentué, donc jamais d’accent ajouté ; dans les textes courants, on l’écrit souvent е",
        en: "'yo', as in 'yogurt'; always stressed, so it never takes an extra stress mark; in everyday texts, it is often written е",
      },
      example: { word: "мёд", translation: { fr: "miel", en: "honey" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/e1.mp3" },
    },
    {
      upper: "Э",
      lower: "э",
      latin: "è",
      name: "э оборо́тное",
      kind: "new",
      lookalike: null,
      sound: {
        fr: "comme « è » dans « père », sans « y » devant : c’est le е sans son « y »",
        en: "like the 'e' in 'pet', with no 'y' before it: it is е without the 'y' sound",
      },
      example: { word: "э́то", translation: { fr: "ceci, c’est", en: "this, this is" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/e2.mp3" },
    },
    {
      upper: "Ю",
      lower: "ю",
      latin: "ju",
      name: "ю",
      kind: "new",
      lookalike: null,
      sound: { fr: "« you », comme dans « youpi »", en: "'yoo', as in 'you'" },
      example: { word: "юг", translation: { fr: "sud", en: "south" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/e3.mp3" },
    },
    {
      upper: "Я",
      lower: "я",
      latin: "ja",
      name: "я",
      kind: "new",
      lookalike: null,
      sound: { fr: "« ya », comme dans « yak » ; ce n’est pas un R à l’envers", en: "'ya', as in 'yard'; it is not a backwards R" },
      example: { word: "я́блоко", translation: { fr: "pomme", en: "apple" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/e4.mp3" },
    },
    {
      upper: "Ь",
      lower: "ь",
      latin: "ʹ",
      name: "мя́гкий знак",
      kind: "sign",
      lookalike: null,
      sound: {
        fr: "aucun son : le « signe mou » adoucit la consonne d’avant, comme si un petit « y » la suivait",
        en: "no sound: the 'soft sign' softens the consonant before it, as if a tiny 'y' followed it",
      },
      example: { word: "день", translation: { fr: "jour", en: "day" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/e5.mp3" },
    },
    {
      upper: "Ъ",
      lower: "ъ",
      latin: "ʺ",
      name: "твёрдый знак",
      kind: "sign",
      lookalike: null,
      sound: {
        fr: "aucun son : le « signe dur », rare, sépare la consonne de la voyelle qui suit, dont on entend alors le « y » : подъе́зд se dit à peu près « pad-yèst »",
        en: "no sound: the 'hard sign', rare, keeps the consonant apart from the vowel after it, whose 'y' you then hear: подъе́зд sounds roughly like 'pad-yest'",
      },
      // подъе́зд (building entrance) replaces объе́кт from ru.ts as the example: more everyday; объе́кт is kept in words.
      example: { word: "подъе́зд", translation: { fr: "entrée d’immeuble", en: "building entrance" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/e6.mp3" },
    },
  ],
  words: [
    { id: "w01", text: "я", latin: "ja", translation: { fr: "je, moi", en: "I, me" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/w01.mp3" },
    { id: "w02", text: "ёлка", latin: "ëlka", translation: { fr: "sapin", en: "fir tree" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/w02.mp3" },
    { id: "w03", text: "тётя", latin: "tëtja", translation: { fr: "tante", en: "aunt" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/w03.mp3" },
    { id: "w04", text: "э́тот", latin: "ètot", translation: { fr: "ce, cet", en: "this (one)" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/w04.mp3" },
    { id: "w05", text: "ю́бка", latin: "jubka", translation: { fr: "jupe", en: "skirt" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/w05.mp3" },
    { id: "w06", text: "мя́со", latin: "mjaso", translation: { fr: "viande", en: "meat" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/w06.mp3" },
    { id: "w07", text: "мать", latin: "matʹ", translation: { fr: "mère", en: "mother" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/w07.mp3" },
    { id: "w08", text: "семья́", latin: "semʹja", translation: { fr: "famille", en: "family" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/w08.mp3" },
    { id: "w09", text: "друзья́", latin: "druzʹja", translation: { fr: "amis", en: "friends" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/w09.mp3" },
    { id: "w10", text: "Росси́я", latin: "Rossija", translation: { fr: "Russie", en: "Russia" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/w10.mp3" },
    { id: "w11", text: "люблю́", latin: "ljublju", translation: { fr: "j’aime", en: "I love" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/w11.mp3" },
    { id: "w12", text: "объе́кт", latin: "obʺekt", translation: { fr: "objet (d’étude), site", en: "object (of study), site" }, audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/w12.mp3" },
  ],
  items: [
    // Lesson 1, letters: recognition.
    {
      id: "i01",
      kind: "match",
      pairs: [
        { left: "я", right: { fr: "« ya »", en: "'ya'" } },
        { left: "ю", right: { fr: "« you »", en: "'yoo'" } },
        { left: "ё", right: { fr: "« yo »", en: "'yo'" } },
        { left: "э", right: { fr: "« è »", en: "'e' in 'pet'" } },
      ],
      explain: {
        fr: "Я, ю, ё (et е) commencent par un « y » ; э, non.",
        en: "Я, ю, ё (and е) start with a 'y' sound; э doesn't.",
      },
    },
    {
      id: "i02",
      kind: "mcq",
      prompt: { fr: "Comment se lit la lettre Я ?", en: "How do you read the letter Я?" },
      options: [
        { id: "a", text: "r" },
        { id: "b", text: "ja" },
        { id: "c", text: "e" },
      ],
      answer: "b",
      audio: null,
      explain: {
        fr: "Я ressemble à un R à l’envers, mais se lit « ya » (transcrit ja). C’est aussi le mot « je » : я.",
        en: "Я looks like a backwards R, but reads 'ya' (written ja). It is also the word 'I': я.",
      },
    },
    {
      id: "i03",
      kind: "mcq",
      prompt: { fr: "Quelle lettre ne se prononce pas et adoucit la consonne d’avant ?", en: "Which letter is silent and softens the consonant before it?" },
      options: [
        { id: "a", text: "ъ" },
        { id: "b", text: "ы" },
        { id: "c", text: "ь" },
      ],
      answer: "c",
      audio: null,
      explain: {
        fr: "Ь, le signe mou, adoucit la consonne : день, мать. Ъ, le signe dur, sépare ; ы est une voyelle.",
        en: "Ь, the soft sign, softens the consonant: день, мать. Ъ, the hard sign, separates; ы is a vowel.",
      },
    },
    {
      id: "i04",
      kind: "mcq",
      prompt: { fr: "Quelle lettre se lit « è », sans « y » devant ?", en: "Which letter reads like the 'e' in 'pet', with no 'y' before it?" },
      options: [
        { id: "a", text: "е" },
        { id: "b", text: "э" },
        { id: "c", text: "ё" },
      ],
      answer: "b",
      audio: null,
      explain: {
        fr: "Э se lit « è » ; е se lit « yé », ё se lit « yo ».",
        en: "Э reads like the 'e' in 'pet'; е reads 'ye', ё reads 'yo'.",
      },
    },
    // Lesson 1, sounds: listen, then pick the letter.
    {
      id: "i05",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Par quelle lettre commence ce mot ?", en: "Listen. Which letter does this word start with?" },
      options: [
        { id: "a", text: "у" },
        { id: "b", text: "я" },
        { id: "c", text: "ю" },
      ],
      answer: "c",
      audioText: "юг",
      audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/i05.mp3",
      explain: { fr: "Tu as entendu юг (sud) : « you », c’est ю.", en: "You heard юг (south): 'yoo' is ю." },
    },
    {
      id: "i06",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quelle voyelle s’écrit dans ce mot ?", en: "Listen. Which vowel is written in this word?" },
      options: [
        { id: "a", text: "ё" },
        { id: "b", text: "е" },
        { id: "c", text: "о" },
      ],
      answer: "a",
      audioText: "мёд",
      audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/i06.mp3",
      explain: {
        fr: "Tu as entendu мёд (miel) : « myot », avec ё. Le д final se dit presque « t ».",
        en: "You heard мёд (honey): 'myot', with ё. The final д sounds almost like 't'.",
      },
    },
    // Lesson 2, words: read a word, find its meaning or its Latin spelling.
    {
      id: "i07",
      kind: "match",
      pairs: [
        { left: "я", right: { fr: "je, moi", en: "I, me" } },
        { left: "мать", right: { fr: "mère", en: "mother" } },
        { left: "тётя", right: { fr: "tante", en: "aunt" } },
        { left: "семья́", right: { fr: "famille", en: "family" } },
      ],
      explain: {
        fr: "Dans семья́, le ь adoucit le м, et le я garde son « y » bien audible : on entend à peu près « sim’-ya ».",
        en: "In семья́, ь softens the м, and я keeps a clear 'y' sound: it sounds roughly like 'sim-ya'.",
      },
    },
    {
      id: "i08",
      kind: "match",
      pairs: [
        { left: "ю́бка", right: { fr: "jupe", en: "skirt" } },
        { left: "мя́со", right: { fr: "viande", en: "meat" } },
        { left: "я́блоко", right: { fr: "pomme", en: "apple" } },
        { left: "ёлка", right: { fr: "sapin", en: "fir tree" } },
      ],
      explain: {
        fr: "Après une consonne, я et ю l’adoucissent : мя́со se dit « mya-sa ».",
        en: "After a consonant, я and ю soften it: мя́со sounds like 'mya-sa'.",
      },
    },
    {
      id: "i09",
      kind: "mcq",
      prompt: { fr: "Comment s’écrit э́то en lettres latines ?", en: "How is э́то written in Latin letters?" },
      options: [
        { id: "a", text: "jeto" },
        { id: "b", text: "ëto" },
        { id: "c", text: "èto" },
      ],
      answer: "c",
      audio: null,
      explain: {
        fr: "Э-т-о : èto, « ceci, c’est ». Э n’a pas de « y » devant.",
        en: "Э-т-о: èto, 'this is'. Э has no 'y' before it.",
      },
    },
    {
      id: "i10",
      kind: "mcq",
      prompt: { fr: "Comment s’écrit семья́ en lettres latines ?", en: "How is семья́ written in Latin letters?" },
      options: [
        { id: "a", text: "semʹja" },
        { id: "b", text: "semʺja" },
        { id: "c", text: "semyja" },
      ],
      answer: "a",
      audio: null,
      explain: {
        fr: "С-е-м-ь-я : semʹja. Le signe mou ь se transcrit ʹ, le signe dur ъ se transcrit ʺ.",
        en: "С-е-м-ь-я: semʹja. The soft sign ь is written ʹ, the hard sign ъ is written ʺ.",
      },
    },
    {
      id: "i11",
      kind: "type",
      prompt: { fr: "Écris en lettres latines : юг", en: "Write in Latin letters: юг" },
      // "yug" accepted besides the transliteration "jug" of ru.ts.
      accept: ["jug", "yug"],
      explain: { fr: "Ю-г : jug (ou yug), « sud ».", en: "Ю-г: jug (or yug), 'south'." },
    },
    {
      id: "i12",
      kind: "type",
      prompt: { fr: "Écris en lettres latines : мя́со", en: "Write in Latin letters: мя́со" },
      accept: ["mjaso", "myaso"],
      explain: { fr: "М-я-с-о : mjaso (ou myaso), « viande ».", en: "М-я-с-о: mjaso (or myaso), 'meat'." },
    },
    // Lesson 2, reading: listen, then pick the written word.
    {
      id: "i13",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quel mot entends-tu ?", en: "Listen. Which word do you hear?" },
      options: [
        { id: "a", text: "семья́" },
        { id: "b", text: "Росси́я" },
        { id: "c", text: "друзья́" },
      ],
      answer: "b",
      audioText: "Росси́я",
      audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/i13.mp3",
      explain: {
        fr: "Росси́я (Russie) : deux с, et я à la fin. Семья́ et друзья́ ont un ь avant le я.",
        en: "Росси́я (Russia): two с, and я at the end. Семья́ and друзья́ have a ь before the я.",
      },
    },
    {
      id: "i14",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quel mot entends-tu ?", en: "Listen. Which word do you hear?" },
      options: [
        { id: "a", text: "э́тот" },
        { id: "b", text: "те́ма" },
        { id: "c", text: "тётя" },
      ],
      answer: "c",
      audioText: "тётя",
      audio: "/unit-audio/ru/ru-a0-05-voyelles-signes/i14.mp3",
      explain: {
        fr: "Тётя (tante) : « tyo-tya », avec ё puis я, qui adoucissent tous les deux le т.",
        en: "Тётя (aunt): 'tyo-tya', with ё then я, which both soften the т.",
      },
    },
    {
      id: "i15",
      kind: "mcq",
      prompt: { fr: "Lequel veut dire « ceci, c’est » ?", en: "Which one means 'this is'?" },
      options: [
        { id: "a", text: "э́тот" },
        { id: "b", text: "э́то" },
        { id: "c", text: "я" },
      ],
      answer: "b",
      audio: null,
      explain: {
        fr: "Э́то = ceci, c’est ; э́тот = ce, cet (devant un nom) ; я = je.",
        en: "Э́то = this is; э́тот = this (before a noun); я = I.",
      },
    },
    {
      id: "i16",
      kind: "mcq",
      prompt: { fr: "Lequel veut dire « j’aime » ?", en: "Which one means 'I love'?" },
      options: [
        { id: "a", text: "люблю́" },
        { id: "b", text: "друзья́" },
        { id: "c", text: "ю́бка" },
      ],
      answer: "a",
      audio: null,
      explain: {
        fr: "Люблю́ = j’aime : л-ю-б-л-ю, deux fois ю. Друзья́ = amis ; ю́бка = jupe.",
        en: "Люблю́ = I love: л-ю-б-л-ю, ю twice. Друзья́ = friends; ю́бка = skirt.",
      },
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
        { step: "words", itemIds: ["i07", "i08", "i09", "i10", "i11", "i12"], threshold: 0.6 },
        { step: "reading", itemIds: ["i13", "i14", "i15", "i16"], threshold: 0.5 },
      ],
    },
    {
      id: "l3",
      // The test's items are in `test` below; this step only places the test in lesson 3.
      steps: [{ step: "test", itemIds: [], threshold: 0.8 }],
    },
  ],
  test: {
    itemIds: ["i02", "i03", "i04", "i05", "i06", "i07", "i09", "i10", "i13", "i15"],
    passScore: 8,
  },
  aiReview: { reviewedOn: "2026-11-24", passes: 2, arbiter: "arbitre-relecture" },
  status: "reviewed",
} satisfies UnitSource;
