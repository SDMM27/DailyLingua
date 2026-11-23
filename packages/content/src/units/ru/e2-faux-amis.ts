import type { UnitSource } from "@dailylingua/schemas";

/**
 * Russian, writing unit E2: the false friends в н р с у х (draft, `j4-pr2.md` §1, group 2 of
 * `src/lib/alphabets/ru.ts`). Every Cyrillic word uses only the letters of E1 and E2. Stress: combining acute
 * (U+0301) on every word of two syllables or more in `text` and `word`; `latin` is the letter-by-letter
 * transliteration of `ru.ts`, without the stress mark. Accepted answers of `type` items are in Latin letters.
 */
export const ruA0E2FauxAmis = {
  id: "ru-a0-02-faux-amis",
  language: "ru",
  level: "A0",
  order: 2,
  kind: "script",
  voice: "ru_RU-denis-medium",
  title: { fr: "Les faux amis", en: "False friends" },
  situation: {
    fr: "Six lettres ressemblent à des lettres latines mais ne se lisent pas pareil : c’est là que l’œil se trompe.",
    en: "Six letters look like Latin letters but don't read the same: this is where the eye gets fooled.",
  },
  minutes: 10,
  canDo: [
    { id: "cd1", text: { fr: "Je peux lire les lettres в, н, р, с, у et х sans les confondre.", en: "I can read the letters в, н, р, с, у and х without mixing them up." } },
    { id: "cd2", text: { fr: "Je peux lire des mots comme нет, сестра́ et Москва́.", en: "I can read words like нет, сестра́ and Москва́." } },
  ],
  letters: [
    {
      upper: "В",
      lower: "в",
      latin: "v",
      name: "вэ",
      kind: "false-friend",
      lookalike: "b",
      sound: { fr: "comme « v » dans « vache », pas un b", en: "like the 'v' in 'van', not a b" },
      example: { word: "вот", translation: { fr: "voici, voilà", en: "here is, there is" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/e1.mp3" },
    },
    {
      upper: "Н",
      lower: "н",
      latin: "n",
      name: "эн",
      kind: "false-friend",
      lookalike: "h",
      sound: { fr: "comme « n » dans « nuit », pas un h", en: "like the 'n' in 'net', not an h" },
      example: { word: "нос", translation: { fr: "nez", en: "nose" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/e2.mp3" },
    },
    {
      upper: "Р",
      lower: "р",
      latin: "r",
      name: "эр",
      kind: "false-friend",
      lookalike: "p",
      sound: {
        fr: "un « r » roulé avec la pointe de la langue, comme en italien ; pas un p",
        en: "a rolled 'r' made with the tip of the tongue, as in Spanish or Italian; not a p",
      },
      example: { word: "рот", translation: { fr: "bouche", en: "mouth" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/e3.mp3" },
    },
    {
      upper: "С",
      lower: "с",
      latin: "s",
      name: "эс",
      kind: "false-friend",
      lookalike: "c",
      sound: { fr: "comme « s » dans « sac » ; même entre deux voyelles, jamais « z » comme dans « rose » ; pas un c", en: "like the 's' in 'sun', never a 'z'; not a c" },
      example: { word: "сок", translation: { fr: "jus", en: "juice" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/e4.mp3" },
    },
    {
      upper: "У",
      lower: "у",
      latin: "u",
      name: "у",
      kind: "false-friend",
      lookalike: "y",
      sound: { fr: "comme « ou » dans « loup », pas un y", en: "like the 'oo' in 'food', not a y" },
      example: { word: "у́тро", translation: { fr: "matin", en: "morning" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/e5.mp3" },
    },
    {
      upper: "Х",
      lower: "х",
      latin: "h",
      name: "ха",
      kind: "false-friend",
      lookalike: "x",
      sound: {
        fr: "un « h » frotté au fond de la bouche, comme le « ch » allemand de « Bach » ou le « j » espagnol de « jota », en plus léger ; pas un x",
        en: "a rough breath at the back of the throat, like the 'ch' in Scottish 'loch'; not an x",
      },
      example: { word: "у́хо", translation: { fr: "oreille", en: "ear" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/e6.mp3" },
    },
  ],
  words: [
    { id: "w01", text: "нет", latin: "net", translation: { fr: "non", en: "no" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/w01.mp3" },
    { id: "w02", text: "он", latin: "on", translation: { fr: "il", en: "he" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/w02.mp3" },
    { id: "w03", text: "она́", latin: "ona", translation: { fr: "elle", en: "she" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/w03.mp3" },
    { id: "w04", text: "сон", latin: "son", translation: { fr: "sommeil, rêve", en: "sleep, dream" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/w04.mp3" },
    { id: "w05", text: "мост", latin: "most", translation: { fr: "pont", en: "bridge" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/w05.mp3" },
    { id: "w06", text: "сто", latin: "sto", translation: { fr: "cent", en: "a hundred" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/w06.mp3" },
    { id: "w07", text: "текст", latin: "tekst", translation: { fr: "texte", en: "text" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/w07.mp3" },
    { id: "w08", text: "рука́", latin: "ruka", translation: { fr: "main, bras", en: "hand, arm" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/w08.mp3" },
    { id: "w09", text: "сестра́", latin: "sestra", translation: { fr: "sœur", en: "sister" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/w09.mp3" },
    { id: "w10", text: "ко́мната", latin: "komnata", translation: { fr: "pièce, chambre", en: "room" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/w10.mp3" },
    { id: "w11", text: "рестора́н", latin: "restoran", translation: { fr: "restaurant", en: "restaurant" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/w11.mp3" },
    { id: "w12", text: "Москва́", latin: "Moskva", translation: { fr: "Moscou", en: "Moscow" }, audio: "/unit-audio/ru/ru-a0-02-faux-amis/w12.mp3" },
  ],
  items: [
    // Lesson 1, letters: recognition, false friends first.
    {
      id: "i01",
      kind: "match",
      pairs: [
        { left: "в", right: { fr: "« v »", en: "'v'" } },
        { left: "н", right: { fr: "« n »", en: "'n'" } },
        { left: "р", right: { fr: "« r » roulé", en: "rolled 'r'" } },
        { left: "с", right: { fr: "« s »", en: "'s'" } },
      ],
      explain: {
        fr: "Ne te fie pas à la forme : в n’est pas un b, н pas un h, р pas un p, с pas un c.",
        en: "Don't trust the shape: в isn't a b, н isn't an h, р isn't a p, с isn't a c.",
      },
    },
    {
      id: "i02",
      kind: "mcq",
      prompt: { fr: "Comment se lit la lettre Н ?", en: "How do you read the letter Н?" },
      options: [
        { id: "a", text: "h" },
        { id: "b", text: "n" },
        { id: "c", text: "m" },
      ],
      answer: "b",
      audio: null,
      explain: { fr: "Н ressemble à un H, mais se lit « n ».", en: "Н looks like an H, but reads 'n'." },
    },
    {
      id: "i03",
      kind: "mcq",
      prompt: { fr: "Comment se lit la lettre Р ?", en: "How do you read the letter Р?" },
      options: [
        { id: "a", text: "p" },
        { id: "b", text: "b" },
        { id: "c", text: "r" },
      ],
      answer: "c",
      audio: null,
      explain: { fr: "Р ressemble à un P, mais se lit « r » (roulé).", en: "Р looks like a P, but reads 'r' (rolled)." },
    },
    {
      id: "i04",
      kind: "mcq",
      prompt: { fr: "Quelle lettre latine transcrit У ?", en: "Which Latin letter transcribes У?" },
      options: [
        { id: "a", text: "u" },
        { id: "b", text: "y" },
        { id: "c", text: "i" },
      ],
      answer: "a",
      audio: null,
      explain: {
        fr: "У ressemble à un y, mais se lit « ou » ; en lettres latines, on l’écrit u.",
        en: "У looks like a y, but reads 'oo'; in Latin letters, it is written u.",
      },
    },
    // Lesson 1, sounds: listen, then pick the letter.
    {
      id: "i05",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Par quelle lettre commence ce mot ?", en: "Listen. Which letter does this word start with?" },
      options: [
        { id: "a", text: "н" },
        { id: "b", text: "х" },
        { id: "c", text: "р" },
      ],
      answer: "a",
      audioText: "нос",
      audio: "/unit-audio/ru/ru-a0-02-faux-amis/i05.mp3",
      explain: { fr: "Tu as entendu нос (nez) : il commence par н, le « n ».", en: "You heard нос (nose): it starts with н, the 'n'." },
    },
    {
      id: "i06",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Par quelle lettre commence ce mot ?", en: "Listen. Which letter does this word start with?" },
      options: [
        { id: "a", text: "с" },
        { id: "b", text: "в" },
        { id: "c", text: "н" },
      ],
      answer: "b",
      audioText: "вот",
      audio: "/unit-audio/ru/ru-a0-02-faux-amis/i06.mp3",
      explain: { fr: "Tu as entendu вот (voici) : il commence par в, le « v ».", en: "You heard вот (here is): it starts with в, the 'v'." },
    },
    {
      id: "i07",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quelle consonne entends-tu au milieu ?", en: "Listen. Which consonant do you hear in the middle?" },
      options: [
        { id: "a", text: "к" },
        { id: "b", text: "с" },
        { id: "c", text: "х" },
      ],
      answer: "c",
      audioText: "у́хо",
      audio: "/unit-audio/ru/ru-a0-02-faux-amis/i07.mp3",
      explain: {
        fr: "У́хо (oreille) : le х est un « h » frotté au fond de la bouche, plus doux que к.",
        en: "У́хо (ear): х is a rough breath, softer than к.",
      },
    },
    // Lesson 2, words: read a word, find its meaning or its Latin spelling.
    {
      id: "i08",
      kind: "match",
      pairs: [
        { left: "нет", right: { fr: "non", en: "no" } },
        { left: "сок", right: { fr: "jus", en: "juice" } },
        { left: "рот", right: { fr: "bouche", en: "mouth" } },
        { left: "нос", right: { fr: "nez", en: "nose" } },
      ],
      explain: {
        fr: "Сок et нос ressemblent à « cok » et « hoc » écrits en lettres latines, mais se lisent « sok » et « nos ».",
        en: "Сок and нос look like 'cok' and 'hoc' in Latin letters, but read 'sok' and 'nos'.",
      },
    },
    {
      id: "i09",
      kind: "match",
      pairs: [
        { left: "рука́", right: { fr: "main, bras", en: "hand, arm" } },
        { left: "сестра́", right: { fr: "sœur", en: "sister" } },
        { left: "у́тро", right: { fr: "matin", en: "morning" } },
        { left: "мост", right: { fr: "pont", en: "bridge" } },
      ],
      explain: {
        fr: "Lis lettre par lettre : р-у-к-а, с-е-с-т-р-а, у-т-р-о, м-о-с-т.",
        en: "Read letter by letter: р-у-к-а, с-е-с-т-р-а, у-т-р-о, м-о-с-т.",
      },
    },
    {
      id: "i10",
      kind: "mcq",
      prompt: { fr: "Comment s’écrit нет en lettres latines ?", en: "How is нет written in Latin letters?" },
      options: [
        { id: "a", text: "het" },
        { id: "b", text: "net" },
        { id: "c", text: "pet" },
      ],
      answer: "b",
      audio: null,
      explain: {
        fr: "Н-е-т : net, « non ». On l’entend « niét » : le е adoucit le н.",
        en: "Н-е-т: net, 'no'. It sounds like 'nyet': the е softens the н.",
      },
    },
    {
      id: "i11",
      kind: "mcq",
      prompt: { fr: "Comment s’écrit сок en lettres latines ?", en: "How is сок written in Latin letters?" },
      options: [
        { id: "a", text: "cok" },
        { id: "b", text: "kos" },
        { id: "c", text: "sok" },
      ],
      answer: "c",
      audio: null,
      explain: { fr: "С est toujours un « s » : sok, « jus ».", en: "С is always an 's': sok, 'juice'." },
    },
    {
      id: "i12",
      kind: "type",
      prompt: { fr: "Écris en lettres latines : рот", en: "Write in Latin letters: рот" },
      accept: ["rot"],
      explain: { fr: "Р-о-т : rot, « bouche ».", en: "Р-о-т: rot, 'mouth'." },
    },
    {
      id: "i13",
      kind: "type",
      prompt: { fr: "Écris en lettres latines : Москва́", en: "Write in Latin letters: Москва́" },
      accept: ["Moskva"],
      explain: {
        fr: "М-о-с-к-в-а : Moskva, « Moscou ». Le о n’est pas accentué : on entend « maskva ».",
        en: "М-о-с-к-в-а: Moskva, 'Moscow'. The о is unstressed: it sounds like 'maskva'.",
      },
    },
    // Lesson 2, reading: listen, then pick the written word.
    {
      id: "i14",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quel mot entends-tu ?", en: "Listen. Which word do you hear?" },
      options: [
        { id: "a", text: "сок" },
        { id: "b", text: "нос" },
        { id: "c", text: "сон" },
      ],
      answer: "c",
      audioText: "сон",
      audio: "/unit-audio/ru/ru-a0-02-faux-amis/i14.mp3",
      explain: {
        fr: "Сон (sommeil) finit par н ; сок (jus), par к ; нос (nez) commence par н.",
        en: "Сон (sleep) ends with н; сок (juice), with к; нос (nose) starts with н.",
      },
    },
    {
      id: "i15",
      kind: "listen_mcq",
      prompt: { fr: "Écoute. Quel mot entends-tu ?", en: "Listen. Which word do you hear?" },
      options: [
        { id: "a", text: "он" },
        { id: "b", text: "она́" },
        { id: "c", text: "сон" },
      ],
      answer: "b",
      audioText: "она́",
      audio: "/unit-audio/ru/ru-a0-02-faux-amis/i15.mp3",
      explain: {
        fr: "Она́ (elle) a deux syllabes ; он (il), une seule. Le premier о de она́ se dit presque « a ».",
        en: "Она́ (she) has two syllables; он (he), only one. The first о of она́ sounds almost like 'a'.",
      },
    },
    {
      id: "i16",
      kind: "mcq",
      prompt: { fr: "Lequel veut dire « pièce, chambre » ?", en: "Which one means 'room'?" },
      options: [
        { id: "a", text: "рестора́н" },
        { id: "b", text: "ко́мната" },
        { id: "c", text: "сестра́" },
      ],
      answer: "b",
      audio: null,
      explain: {
        fr: "Ко́мната = pièce ; рестора́н = restaurant ; сестра́ = sœur.",
        en: "Ко́мната = room; рестора́н = restaurant; сестра́ = sister.",
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
        { step: "words", itemIds: ["i08", "i09", "i10", "i11", "i12", "i13"], threshold: 0.6 },
        { step: "reading", itemIds: ["i14", "i15", "i16"], threshold: 0.5 },
      ],
    },
    {
      id: "l3",
      // The test's items are in `test` below; this step only places the test in lesson 3.
      steps: [{ step: "test", itemIds: [], threshold: 0.8 }],
    },
  ],
  test: {
    itemIds: ["i02", "i03", "i05", "i06", "i08", "i10", "i11", "i12", "i14", "i16"],
    passScore: 8,
  },
  aiReview: { reviewedOn: "2026-11-23", passes: 2, arbiter: "arbitre-relecture" },
  status: "reviewed",
} satisfies UnitSource;
