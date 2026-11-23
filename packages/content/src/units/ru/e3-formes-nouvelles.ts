import type { UnitSource } from "@dailylingua/schemas";

/**
 * Russian, writing unit E3: the new shapes б г д з и л п (draft, `j4-pr2.md` §1, group 3 of
 * `src/lib/alphabets/ru.ts`). Every Cyrillic word uses only the letters of E1 to E3. Stress: combining acute
 * (U+0301) on every word of two syllables or more in `text` and `word`; `latin` is the letter-by-letter
 * transliteration of `ru.ts`, without the stress mark. Accepted answers of `type` items are in Latin letters.
 */
export const ruA0E3FormesNouvelles = {
  id: "ru-a0-03-formes-nouvelles",
  language: "ru",
  level: "A0",
  order: 3,
  kind: "script",
  voice: "ru_RU-denis-medium",
  title: { fr: "Les formes nouvelles", en: "New shapes" },
  situation: {
    fr: "Sept lettres ont des formes inconnues, mais des sons simples : avec elles, tu lis приве́т et спаси́бо.",
    en: "Seven letters have unfamiliar shapes but simple sounds: with them, you can read приве́т and спаси́бо.",
  },
  minutes: 10,
  canDo: [
    { id: "cd1", text: { fr: "Je peux lire les lettres б, г, д, з, и, л et п.", en: "I can read the letters б, г, д, з, и, л and п." } },
    { id: "cd2", text: { fr: "Je peux lire des mots du quotidien comme дом, хлеб et спаси́бо.", en: "I can read everyday words like дом, хлеб and спаси́бо." } },
  ],
  letters: [
    {
      upper: "Б",
      lower: "б",
      latin: "b",
      name: "бэ",
      kind: "new",
      lookalike: null,
      sound: { fr: "comme « b » dans « bébé » ; la minuscule ressemble à un 6", en: "like the 'b' in 'bed'; the small letter looks like a 6" },
      example: { word: "брат", translation: { fr: "frère", en: "brother" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/e1.mp3" },
    },
    {
      upper: "Г",
      lower: "г",
      latin: "g",
      name: "гэ",
      kind: "new",
      lookalike: null,
      sound: { fr: "comme « g » dans « gare », même devant е et и (jamais comme dans « girafe »)", en: "like the 'g' in 'go', always hard" },
      example: { word: "го́род", translation: { fr: "ville", en: "city, town" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/e2.mp3" },
    },
    {
      upper: "Д",
      lower: "д",
      latin: "d",
      name: "дэ",
      kind: "new",
      lookalike: null,
      sound: { fr: "comme « d » dans « dame »", en: "like the 'd' in 'dog'" },
      example: { word: "дом", translation: { fr: "maison", en: "house, home" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/e3.mp3" },
    },
    {
      upper: "З",
      lower: "з",
      latin: "z",
      name: "зэ",
      kind: "new",
      lookalike: null,
      sound: { fr: "comme « z » dans « zèbre » ; il ressemble à un 3", en: "like the 'z' in 'zoo'; it looks like a 3" },
      example: { word: "зима́", translation: { fr: "hiver", en: "winter" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/e4.mp3" },
    },
    {
      upper: "И",
      lower: "и",
      latin: "i",
      name: "и",
      kind: "new",
      lookalike: null,
      sound: { fr: "comme « i » dans « midi », malgré sa forme de N à l’envers", en: "like the 'ee' in 'see', despite looking like a backwards N" },
      example: { word: "кино́", translation: { fr: "cinéma", en: "cinema" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/e5.mp3" },
    },
    {
      upper: "Л",
      lower: "л",
      latin: "l",
      // The name эль uses э and ь (taught in E5); names are labels, not words to read.
      name: "эль",
      kind: "new",
      lookalike: null,
      sound: { fr: "comme le « l » anglais de « full » : plus sombre que notre « l », la langue un peu creusée ; il ressemble à un petit toit", en: "like the 'l' in 'full', a dark l; it looks like a little roof" },
      example: { word: "ла́мпа", translation: { fr: "lampe", en: "lamp" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/e6.mp3" },
    },
    {
      upper: "П",
      lower: "п",
      latin: "p",
      name: "пэ",
      kind: "new",
      lookalike: null,
      sound: { fr: "comme « p » dans « papa » ; il ressemble au pi grec", en: "like the 'p' in 'spin'; it looks like the Greek pi" },
      example: { word: "парк", translation: { fr: "parc", en: "park" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/e7.mp3" },
    },
  ],
  words: [
    { id: "w01", text: "да", latin: "da", translation: { fr: "oui", en: "yes" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/w01.mp3" },
    { id: "w02", text: "дом", latin: "dom", translation: { fr: "maison", en: "house, home" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/w02.mp3" },
    { id: "w03", text: "друг", latin: "drug", translation: { fr: "ami", en: "friend" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/w03.mp3" },
    { id: "w04", text: "брат", latin: "brat", translation: { fr: "frère", en: "brother" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/w04.mp3" },
    { id: "w05", text: "го́род", latin: "gorod", translation: { fr: "ville", en: "city, town" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/w05.mp3" },
    { id: "w06", text: "кни́га", latin: "kniga", translation: { fr: "livre", en: "book" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/w06.mp3" },
    { id: "w07", text: "вода́", latin: "voda", translation: { fr: "eau", en: "water" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/w07.mp3" },
    { id: "w08", text: "хлеб", latin: "hleb", translation: { fr: "pain", en: "bread" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/w08.mp3" },
    { id: "w09", text: "суп", latin: "sup", translation: { fr: "soupe", en: "soup" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/w09.mp3" },
    { id: "w10", text: "спаси́бо", latin: "spasibo", translation: { fr: "merci", en: "thank you" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/w10.mp3" },
    { id: "w11", text: "приве́т", latin: "privet", translation: { fr: "salut (en arrivant)", en: "hi" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/w11.mp3" },
    { id: "w12", text: "пока́", latin: "poka", translation: { fr: "salut (en partant)", en: "bye" }, audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/w12.mp3" },
  ],
  items: [
    // Lesson 1, letters: recognition.
    {
      id: "i01",
      kind: "match",
      pairs: [
        { left: "б", right: { fr: "« b »", en: "'b'" } },
        { left: "г", right: { fr: "« g »", en: "'g'" } },
        { left: "д", right: { fr: "« d »", en: "'d'" } },
        { left: "з", right: { fr: "« z »", en: "'z'" } },
        { left: "л", right: { fr: "« l »", en: "'l'" } },
      ],
      explain: {
        fr: "Repères : б ressemble à un 6, з à un 3, л à un petit toit.",
        en: "Tips: б looks like a 6, з like a 3, л like a little roof.",
      },
    },
    {
      id: "i02",
      kind: "mcq",
      prompt: { fr: "Comment se lit la lettre И ?", en: "How do you read the letter И?" },
      options: [
        { id: "a", text: "n" },
        { id: "b", text: "i" },
        { id: "c", text: "u" },
      ],
      answer: "b",
      audio: null,
      explain: { fr: "И ressemble à un N à l’envers, mais se lit « i ».", en: "И looks like a backwards N, but reads 'ee' (written i)." },
    },
    {
      id: "i03",
      kind: "mcq",
      prompt: { fr: "Comment se lit la lettre П ?", en: "How do you read the letter П?" },
      options: [
        { id: "a", text: "p" },
        { id: "b", text: "n" },
        { id: "c", text: "l" },
      ],
      answer: "a",
      audio: null,
      explain: { fr: "П, comme le pi grec, se lit « p ».", en: "П, like the Greek pi, reads 'p'." },
    },
    {
      id: "i04",
      kind: "mcq",
      prompt: { fr: "Quelle lettre se lit « z » ?", en: "Which letter reads 'z'?" },
      options: [
        { id: "a", text: "с" },
        { id: "b", text: "в" },
        { id: "c", text: "з" },
      ],
      answer: "c",
      audio: null,
      explain: { fr: "З ressemble à un 3 et se lit « z » ; с se lit « s ».", en: "З looks like a 3 and reads 'z'; с reads 's'." },
    },
    // Lesson 1, sounds: listen, then pick the letter.
    {
      id: "i05",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Par quelle lettre commence ce mot ?", en: "Listen. Which letter does this word start with?" },
      options: [
        { id: "a", text: "б" },
        { id: "b", text: "д" },
        { id: "c", text: "г" },
      ],
      answer: "b",
      audioText: "дом",
      audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/i05.mp3",
      explain: { fr: "Tu as entendu дом (maison) : il commence par д.", en: "You heard дом (house): it starts with д." },
    },
    {
      id: "i06",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Par quelle lettre commence ce mot ?", en: "Listen. Which letter does this word start with?" },
      options: [
        { id: "a", text: "з" },
        { id: "b", text: "с" },
        { id: "c", text: "в" },
      ],
      answer: "a",
      audioText: "зима́",
      audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/i06.mp3",
      explain: { fr: "Tu as entendu зима́ (hiver) : il commence par з, le « z ».", en: "You heard зима́ (winter): it starts with з, the 'z'." },
    },
    {
      id: "i07",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Par quelle lettre commence ce mot ?", en: "Listen. Which letter does this word start with?" },
      options: [
        { id: "a", text: "п" },
        { id: "b", text: "д" },
        { id: "c", text: "л" },
      ],
      answer: "c",
      audioText: "ла́мпа",
      audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/i07.mp3",
      explain: { fr: "Tu as entendu ла́мпа (lampe) : il commence par л.", en: "You heard ла́мпа (lamp): it starts with л." },
    },
    // Lesson 2, words: read a word, find its meaning or its Latin spelling.
    {
      id: "i08",
      kind: "match",
      pairs: [
        { left: "дом", right: { fr: "maison", en: "house, home" } },
        { left: "друг", right: { fr: "ami", en: "friend" } },
        { left: "брат", right: { fr: "frère", en: "brother" } },
        { left: "хлеб", right: { fr: "pain", en: "bread" } },
      ],
      explain: {
        fr: "Lis lettre par lettre : д-о-м, д-р-у-г, б-р-а-т, х-л-е-б. En fin de mot, г et б s’entendent « k » et « p » : on dit à peu près « drouk » et « khliép ».",
        en: "Read letter by letter: д-о-м, д-р-у-г, б-р-а-т, х-л-е-б. At the end of a word, г and б sound like 'k' and 'p': roughly 'drook' and 'khlyep'.",
      },
    },
    {
      id: "i09",
      kind: "match",
      pairs: [
        { left: "вода́", right: { fr: "eau", en: "water" } },
        { left: "кни́га", right: { fr: "livre", en: "book" } },
        { left: "го́род", right: { fr: "ville", en: "city, town" } },
        { left: "суп", right: { fr: "soupe", en: "soup" } },
      ],
      explain: {
        fr: "Dans вода́, l’accent est à la fin : le premier о se dit presque « a » (« vada »).",
        en: "In вода́, the stress is at the end: the first о sounds almost like 'a' ('vada').",
      },
    },
    {
      id: "i10",
      kind: "mcq",
      prompt: { fr: "Comment s’écrit спаси́бо en lettres latines ?", en: "How is спаси́бо written in Latin letters?" },
      options: [
        { id: "a", text: "snasibo" },
        { id: "b", text: "spazibo" },
        { id: "c", text: "spasibo" },
      ],
      answer: "c",
      audio: null,
      explain: {
        fr: "С-п-а-с-и-б-о : spasibo, « merci ». П est un p, с un s.",
        en: "С-п-а-с-и-б-о: spasibo, 'thank you'. П is a p, с an s.",
      },
    },
    {
      id: "i11",
      kind: "type",
      prompt: { fr: "Écris en lettres latines : да", en: "Write in Latin letters: да" },
      accept: ["da"],
      explain: { fr: "Д-а : da, « oui ».", en: "Д-а: da, 'yes'." },
    },
    {
      id: "i12",
      kind: "type",
      prompt: { fr: "Écris en lettres latines : приве́т", en: "Write in Latin letters: приве́т" },
      accept: ["privet"],
      explain: {
        fr: "П-р-и-в-е-т : privet, « salut ». Le е se lit « yé » : « privyét ».",
        en: "П-р-и-в-е-т: privet, 'hi'. The е reads 'ye': 'privyet'.",
      },
    },
    // Lesson 2, reading: listen, then pick the written word.
    {
      id: "i13",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quel mot entends-tu ?", en: "Listen. Which word do you hear?" },
      options: [
        { id: "a", text: "пока́" },
        { id: "b", text: "приве́т" },
        { id: "c", text: "спаси́бо" },
      ],
      answer: "b",
      audioText: "приве́т",
      audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/i13.mp3",
      explain: {
        fr: "Приве́т = salut (en arrivant) ; пока́ = salut (en partant) ; спаси́бо = merci.",
        en: "Приве́т = hi; пока́ = bye; спаси́бо = thank you.",
      },
    },
    {
      id: "i14",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quel mot entends-tu ?", en: "Listen. Which word do you hear?" },
      options: [
        { id: "a", text: "сок" },
        { id: "b", text: "сон" },
        { id: "c", text: "суп" },
      ],
      answer: "c",
      audioText: "суп",
      audio: "/unit-audio/ru/ru-a0-03-formes-nouvelles/i14.mp3",
      explain: {
        fr: "Суп (soupe) : у se dit « ou », п se dit « p ».",
        en: "Суп (soup): у reads 'oo', п reads 'p'.",
      },
    },
    {
      id: "i15",
      kind: "mcq",
      prompt: { fr: "Lequel dit-on en partant ?", en: "Which one do you say when leaving?" },
      options: [
        { id: "a", text: "приве́т" },
        { id: "b", text: "да" },
        { id: "c", text: "пока́" },
      ],
      answer: "c",
      audio: null,
      explain: {
        fr: "Пока́ se dit en partant ; приве́т, en arrivant. Le о de пока́ n’est pas accentué : « paka ».",
        en: "Пока́ is for leaving; приве́т, for arriving. The о of пока́ is unstressed: 'paka'.",
      },
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
    itemIds: ["i02", "i03", "i05", "i06", "i08", "i09", "i10", "i12", "i13", "i15"],
    passScore: 8,
  },
  aiReview: { reviewedOn: "2026-11-24", passes: 2, arbiter: "arbitre-relecture" },
  status: "reviewed",
} satisfies UnitSource;
