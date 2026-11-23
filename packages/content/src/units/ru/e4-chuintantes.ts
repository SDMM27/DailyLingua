import type { UnitSource } from "@dailylingua/schemas";

/**
 * Russian, writing unit E4: the hushing sounds and the others, ж й ф ц ч ш щ ы (draft, `j4-pr2.md` §1, group 4
 * of `src/lib/alphabets/ru.ts`). Every Cyrillic word uses only the letters of E1 to E4. Stress: combining acute
 * (U+0301) on every word of two syllables or more in `text` and `word`; `latin` is the letter-by-letter
 * transliteration of `ru.ts` (ž, č, š, šč, j, c, y), without the stress mark. `type` items also accept the common
 * English-style spelling (zh, ch, sh) where a letter needs a diacritic, since a phone keyboard hides them.
 */
export const ruA0E4Chuintantes = {
  id: "ru-a0-04-chuintantes",
  language: "ru",
  level: "A0",
  order: 4,
  kind: "script",
  voice: "ru_RU-denis-medium",
  title: { fr: "Les chuintantes et les autres", en: "Hushing sounds and others" },
  situation: {
    fr: "Huit lettres pour les sons « ch », « j », « ts », « tch », et le fameux ы, qui n’existe pas en français.",
    en: "Eight letters for the sounds 'sh', 'zh', 'ts', 'ch', and the famous ы, which English doesn't have.",
  },
  minutes: 12,
  canDo: [
    { id: "cd1", text: { fr: "Je peux lire les lettres ж, й, ф, ц, ч, ш, щ et ы.", en: "I can read the letters ж, й, ф, ц, ч, ш, щ and ы." } },
    { id: "cd2", text: { fr: "Je peux distinguer ш de щ et lire des mots comme чай et хорошо́.", en: "I can tell ш from щ and read words like чай and хорошо́." } },
  ],
  letters: [
    {
      upper: "Ж",
      lower: "ж",
      latin: "ž",
      name: "жэ",
      kind: "new",
      lookalike: null,
      sound: {
        fr: "comme « j » dans « jour », mais plus grave, la langue plus en arrière ; il ne s’adoucit jamais, même devant е ou и",
        en: "like the 's' in 'pleasure', but deeper, with the tongue further back; it never softens, even before е or и",
      },
      example: { word: "жена́", translation: { fr: "épouse, femme (mariée)", en: "wife" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/e1.mp3" },
    },
    {
      upper: "Й",
      lower: "й",
      latin: "j",
      name: "и кра́ткое",
      kind: "new",
      lookalike: null,
      sound: {
        fr: "un « y » bref, comme « ill » dans « travail » ; il suit presque toujours une voyelle",
        en: "a short 'y', as in 'boy'; it almost always comes after a vowel",
      },
      example: { word: "мой", translation: { fr: "mon", en: "my" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/e2.mp3" },
    },
    {
      upper: "Ф",
      lower: "ф",
      latin: "f",
      name: "эф",
      kind: "new",
      lookalike: null,
      sound: { fr: "comme « f » dans « fou »", en: "like the 'f' in 'fun'" },
      example: { word: "фо́то", translation: { fr: "photo", en: "photo" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/e3.mp3" },
    },
    {
      upper: "Ц",
      lower: "ц",
      latin: "c",
      name: "цэ",
      kind: "new",
      lookalike: null,
      sound: { fr: "comme « ts » dans « tsé-tsé » ; il a une petite queue en bas", en: "like the 'ts' in 'cats'; it has a little tail at the bottom" },
      example: { word: "цирк", translation: { fr: "cirque", en: "circus" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/e4.mp3" },
    },
    {
      upper: "Ч",
      lower: "ч",
      latin: "č",
      name: "че",
      kind: "new",
      lookalike: null,
      sound: { fr: "comme « tch » dans « tchèque », toujours doux", en: "like the 'ch' in 'cheese', always soft" },
      example: { word: "чай", translation: { fr: "thé", en: "tea" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/e5.mp3" },
    },
    {
      upper: "Ш",
      lower: "ш",
      latin: "š",
      name: "ша",
      kind: "new",
      lookalike: null,
      sound: {
        fr: "comme « ch » dans « chat », mais plus grave ; il ne s’adoucit jamais, même devant е ou и",
        en: "like the 'sh' in 'shop', but deeper; it never softens, even before е or и",
      },
      example: { word: "шарф", translation: { fr: "écharpe", en: "scarf" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/e6.mp3" },
    },
    {
      upper: "Щ",
      lower: "щ",
      latin: "šč",
      name: "ща",
      kind: "new",
      lookalike: null,
      sound: {
        fr: "un « ch » doux et long, la langue contre le palais ; c’est un ш avec un petit crochet",
        en: "a soft, long 'sh', the tongue against the palate, as in 'fresh sheet'; it is a ш with a little hook",
      },
      example: { word: "борщ", translation: { fr: "bortsch (soupe de betterave)", en: "borscht (beetroot soup)" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/e7.mp3" },
    },
    {
      upper: "Ы",
      lower: "ы",
      latin: "y",
      name: "ы",
      kind: "new",
      lookalike: null,
      sound: {
        fr: "dis « ou », puis étire les lèvres comme pour « i » sans bouger la langue : un « i » dit la langue en arrière ; jamais en début de mot",
        en: "say 'oo', then spread your lips as for 'ee' without moving your tongue: an 'i' with the tongue pulled back; never at the start of a word",
      },
      example: { word: "сын", translation: { fr: "fils", en: "son" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/e8.mp3" },
    },
  ],
  words: [
    { id: "w01", text: "мы", latin: "my", translation: { fr: "nous", en: "we" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/w01.mp3" },
    { id: "w02", text: "ты", latin: "ty", translation: { fr: "tu", en: "you (informal, one person)" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/w02.mp3" },
    { id: "w03", text: "вы", latin: "vy", translation: { fr: "vous", en: "you (polite or plural)" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/w03.mp3" },
    { id: "w04", text: "муж", latin: "muž", translation: { fr: "mari", en: "husband" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/w04.mp3" },
    { id: "w05", text: "ры́ба", latin: "ryba", translation: { fr: "poisson", en: "fish" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/w05.mp3" },
    { id: "w06", text: "хорошо́", latin: "horošo", translation: { fr: "bien", en: "good, well" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/w06.mp3" },
    { id: "w07", text: "ча́шка", latin: "čaška", translation: { fr: "tasse", en: "cup" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/w07.mp3" },
    { id: "w08", text: "шко́ла", latin: "škola", translation: { fr: "école", en: "school" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/w08.mp3" },
    { id: "w09", text: "у́лица", latin: "ulica", translation: { fr: "rue", en: "street" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/w09.mp3" },
    { id: "w10", text: "же́нщина", latin: "ženščina", translation: { fr: "femme", en: "woman" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/w10.mp3" },
    { id: "w11", text: "плащ", latin: "plašč", translation: { fr: "imperméable", en: "raincoat" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/w11.mp3" },
    { id: "w12", text: "музе́й", latin: "muzej", translation: { fr: "musée", en: "museum" }, audio: "/unit-audio/ru/ru-a0-04-chuintantes/w12.mp3" },
  ],
  items: [
    // Lesson 1, letters: recognition.
    {
      id: "i01",
      kind: "match",
      pairs: [
        { left: "ж", right: { fr: "« j » de « jour »", en: "'s' in 'pleasure'" } },
        { left: "ш", right: { fr: "« ch » de « chat »", en: "'sh' in 'shop'" } },
        { left: "ч", right: { fr: "« tch » de « tchèque »", en: "'ch' in 'cheese'" } },
        { left: "ц", right: { fr: "« ts » de « tsé-tsé »", en: "'ts' in 'cats'" } },
      ],
      explain: {
        fr: "En russe, chacun de ces sons s’écrit avec une seule lettre ; en français, il en faut souvent deux ou trois (ch, tch, ts).",
        en: "In Russian, each of these sounds takes a single letter; English often needs two (sh, ch, ts).",
      },
    },
    {
      id: "i02",
      kind: "mcq",
      prompt: { fr: "Quelle lettre se lit comme un « ch » doux et long ?", en: "Which letter reads like a soft, long 'sh'?" },
      options: [
        { id: "a", text: "ш" },
        { id: "b", text: "щ" },
        { id: "c", text: "ц" },
      ],
      answer: "b",
      audio: null,
      explain: {
        fr: "Щ, c’est ш avec un petit crochet en bas : un « ch » plus doux et plus long.",
        en: "Щ is ш with a little hook at the bottom: a softer, longer 'sh'.",
      },
    },
    {
      id: "i03",
      kind: "mcq",
      prompt: { fr: "Quelle lettre se lit « f » ?", en: "Which letter reads 'f'?" },
      options: [
        { id: "a", text: "в" },
        { id: "b", text: "ж" },
        { id: "c", text: "ф" },
      ],
      answer: "c",
      audio: null,
      explain: { fr: "Ф se lit « f » ; в se lit « v ».", en: "Ф reads 'f'; в reads 'v'." },
    },
    {
      id: "i04",
      kind: "mcq",
      prompt: { fr: "Quelle est la différence entre и et й ?", en: "What is the difference between и and й?" },
      options: [
        { id: "a", text: "и = i, й = j" },
        { id: "b", text: "и = i, й = u" },
        { id: "c", text: "и = n, й = i" },
      ],
      answer: "a",
      audio: null,
      explain: {
        fr: "Й, c’est и avec un petit arc : un « y » bref, transcrit j, comme dans мой (« moy »).",
        en: "Й is и with a little arc: a short 'y', written j, as in мой ('moy').",
      },
    },
    // Lesson 1, sounds: listen, then pick the letter.
    {
      id: "i05",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Par quelle lettre commence ce mot ?", en: "Listen. Which letter does this word start with?" },
      options: [
        { id: "a", text: "ч" },
        { id: "b", text: "ш" },
        { id: "c", text: "щ" },
      ],
      answer: "a",
      audioText: "чай",
      audio: "/unit-audio/ru/ru-a0-04-chuintantes/i05.mp3",
      explain: { fr: "Tu as entendu чай (thé) : « tch », c’est ч.", en: "You heard чай (tea): 'ch' is ч." },
    },
    {
      id: "i06",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Par quelle lettre commence ce mot ?", en: "Listen. Which letter does this word start with?" },
      options: [
        { id: "a", text: "щ" },
        { id: "b", text: "ж" },
        { id: "c", text: "ш" },
      ],
      answer: "c",
      audioText: "шарф",
      audio: "/unit-audio/ru/ru-a0-04-chuintantes/i06.mp3",
      explain: {
        fr: "Tu as entendu шарф (écharpe) : un « ch » dur, c’est ш.",
        en: "You heard шарф (scarf): a hard 'sh' is ш.",
      },
    },
    {
      id: "i07",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quelle voyelle entends-tu ?", en: "Listen. Which vowel do you hear?" },
      options: [
        { id: "a", text: "и" },
        { id: "b", text: "ы" },
        { id: "c", text: "у" },
      ],
      answer: "b",
      audioText: "сын",
      audio: "/unit-audio/ru/ru-a0-04-chuintantes/i07.mp3",
      explain: {
        fr: "Tu as entendu сын (fils) : ы, un « i » dit avec la langue en arrière.",
        en: "You heard сын (son): ы, an 'i' said with the tongue pulled back.",
      },
    },
    // Lesson 2, words: read a word, find its meaning or its Latin spelling.
    {
      id: "i08",
      kind: "match",
      pairs: [
        { left: "муж", right: { fr: "mari", en: "husband" } },
        { left: "ры́ба", right: { fr: "poisson", en: "fish" } },
        { left: "шко́ла", right: { fr: "école", en: "school" } },
        { left: "у́лица", right: { fr: "rue", en: "street" } },
      ],
      explain: {
        fr: "En fin de mot, ж perd sa voix et se prononce comme ш : муж se dit « mouch ».",
        en: "At the end of a word, ж loses its voicing and sounds like ш: муж sounds like 'moosh'.",
      },
    },
    {
      id: "i09",
      kind: "match",
      pairs: [
        { left: "ча́шка", right: { fr: "tasse", en: "cup" } },
        { left: "же́нщина", right: { fr: "femme", en: "woman" } },
        { left: "плащ", right: { fr: "imperméable", en: "raincoat" } },
        { left: "музе́й", right: { fr: "musée", en: "museum" } },
      ],
      explain: {
        fr: "Repère les chuintantes : ч et ш dans ча́шка, ж et щ dans же́нщина, щ dans плащ.",
        en: "Spot the hushing sounds: ч and ш in ча́шка, ж and щ in же́нщина, щ in плащ.",
      },
    },
    {
      id: "i10",
      kind: "mcq",
      prompt: { fr: "Comment s’écrit хорошо́ en lettres latines ?", en: "How is хорошо́ written in Latin letters?" },
      options: [
        { id: "a", text: "horošo" },
        { id: "b", text: "horoščo" },
        { id: "c", text: "horožo" },
      ],
      answer: "a",
      audio: null,
      explain: {
        fr: "Х-о-р-о-ш-о : horošo, « bien ». Seul le dernier о est accentué : on entend « kharacho ».",
        en: "Х-о-р-о-ш-о: horošo, 'good'. Only the last о is stressed: it sounds like 'kharasho'.",
      },
    },
    {
      id: "i11",
      kind: "type",
      prompt: { fr: "Écris en lettres latines : мы", en: "Write in Latin letters: мы" },
      accept: ["my"],
      explain: { fr: "М-ы : my, « nous ». Ы se transcrit y.", en: "М-ы: my, 'we'. Ы is written y." },
    },
    {
      id: "i12",
      kind: "type",
      prompt: { fr: "Écris en lettres latines : муж", en: "Write in Latin letters: муж" },
      // "muzh" accepted besides the scholarly "muž" (ž is hard to type on a phone).
      accept: ["muž", "muzh"],
      explain: { fr: "М-у-ж : muž (ou muzh), « mari ».", en: "М-у-ж: muž (or muzh), 'husband'." },
    },
    // Lesson 2, reading: listen, then pick the written word.
    {
      id: "i13",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quel mot entends-tu ?", en: "Listen. Which word do you hear?" },
      options: [
        { id: "a", text: "вы" },
        { id: "b", text: "мы" },
        { id: "c", text: "ты" },
      ],
      answer: "b",
      audioText: "мы",
      audio: "/unit-audio/ru/ru-a0-04-chuintantes/i13.mp3",
      explain: { fr: "Мы = nous ; ты = tu ; вы = vous.", en: "Мы = we; ты = you (informal, one person); вы = you (polite or plural)." },
    },
    {
      id: "i14",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quel mot entends-tu ?", en: "Listen. Which word do you hear?" },
      options: [
        { id: "a", text: "борщ" },
        { id: "b", text: "муж" },
        { id: "c", text: "плащ" },
      ],
      answer: "c",
      audioText: "плащ",
      audio: "/unit-audio/ru/ru-a0-04-chuintantes/i14.mp3",
      explain: {
        fr: "Плащ (imperméable) et борщ finissent tous deux par щ, mais плащ commence par « pl ».",
        en: "Плащ (raincoat) and борщ both end in щ, but плащ starts with 'pl'.",
      },
    },
    {
      id: "i15",
      kind: "mcq",
      prompt: { fr: "Lequel veut dire « bien » ?", en: "Which one means 'good, well'?" },
      options: [
        { id: "a", text: "шко́ла" },
        { id: "b", text: "хорошо́" },
        { id: "c", text: "у́лица" },
      ],
      answer: "b",
      audio: null,
      explain: { fr: "Хорошо́ = bien ; шко́ла = école ; у́лица = rue.", en: "Хорошо́ = good, well; шко́ла = school; у́лица = street." },
    },
  ],
  lessons: [
    {
      id: "l1",
      steps: [
        { step: "letters", itemIds: ["i01", "i02", "i03", "i04"], threshold: 0.5 },
        { step: "sounds", itemIds: ["i05", "i06", "i07"], threshold: 0.5 },
      ],
    },
    {
      id: "l2",
      steps: [
        { step: "words", itemIds: ["i08", "i09", "i10", "i11", "i12"], threshold: 0.6 },
        { step: "reading", itemIds: ["i13", "i14", "i15"], threshold: 0.5 },
      ],
    },
    {
      id: "l3",
      // The test's items are in `test` below; this step only places the test in lesson 3.
      steps: [{ step: "test", itemIds: [], threshold: 0.8 }],
    },
  ],
  test: {
    itemIds: ["i02", "i03", "i05", "i06", "i07", "i08", "i10", "i12", "i13", "i15"],
    passScore: 8,
  },
  aiReview: { reviewedOn: "2026-11-24", passes: 2, arbiter: "arbitre-relecture" },
  status: "reviewed",
} satisfies UnitSource;
