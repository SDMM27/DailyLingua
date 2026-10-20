import type { Language } from "@/lib/domain/languages";
import type { SourceDefinition, SourceLicense } from "@/lib/schemas/content";

/**
 * Catalogue of authentic content sources: public RSS / Atom feeds only, never scraping.
 *
 * Whatever the licence, the app only stores a feed item's metadata (title, link, date, author,
 * categories, duration) and a short teaser, then sends the reader to the publisher. The licence
 * decides more: whether the source may be used in a paid product (`commercialUse`, see
 * CONTENT_LICENSE_POLICY) and, later, whether exercises may quote the text.
 *
 * Adding a source:
 *  1. find its official feed (a `<link rel="alternate">` on the site, or a documented feed page);
 *  2. read its terms, fill `license` honestly (`all-rights-reserved` + `commercialUse: false` when
 *     in doubt) and write what you checked in `note`, with today's date in `verifiedOn`;
 *  3. run `npm run content:check -- --source <key>`: the feed, the links and the terms page must
 *     answer, and the items must parse.
 *
 * Considered and left out (2026-10-13): Il Post (feed answers 403 to non-browser clients and the
 * terms forbid redistribution), Rai Radio 3 (no official feed since RaiPlay Sound, only unofficial
 * mirrors), VOA Learning English (feed stale since April 2025), El País and Focus (terms page not
 * reachable to verify), NHK (feed not updated since August 2026), Global Voices in German, Swedish,
 * Polish, Czech, Turkish, Korean, Chinese, Indonesian and Hungarian (editions inactive for months).
 *
 * YouTube channels, checked 2026-10-20 (the check also needs a non-Short video inside the 180-day
 * window, and a channel that published in the last 21 days). Titles and speech must be in the
 * studied language: channels whose titles are in English (Dreaming Spanish, Comprehensible
 * Italian/Czech/Russian/Mandarin/Ukrainian/Turkish, Czech-in, Immersive Ukrainian, Simply
 * Indonesian, Learn Greek with Maria, Easy Greek, Practice Portuguese, Portuguese Lab, Speaking
 * Brazilian, Talk To Me In Korean, the Pod101 channels, Mandarin Corner, 몰입한국어) are out, as
 * are the ones that teach the language in English, with one exception (phase F, below): a channel that
 * teaches in English is kept for a language and level that have no French-explained, children's or
 * target-language channel (`instructionLanguage: "en"`).
 * Left out for inactivity or lack of videos: Easy Portuguese, Easy Brazilian Portuguese and
 * Brazilian Portuguese with Anna (Shorts only or nothing recent), Easy Swedish, Easy Czech and
 * Easy Russian (legacy channels, empty feed), Easy Korean, Easy Ukrainian, Ukrainian Lessons and
 * Arabic Online (no recent upload), Svenska med Lisa and Portuguese With Leo (last upload over 4
 * weeks ago), Ukraїner (last video 2026-09-22), Türkçe Talks, Simple English Videos, Nerdologia,
 * the science feeds Centrum Nauki Kopernik, 日本科学情報, 这不科学啊, Arzamas and Ciência Todo Dia
 * (quiet for 3 weeks or more),
 * Español con Pablo y Lucía and Italiano Facile (fewer than 3 usable videos), Nicos
 * Weg (nothing recent), SVT Nyheter and Rai Cultura (no feed entries).
 * Left out on content: CCTV and NTD (state or sectarian line), TVRI, Al Jazeera and Russia-based
 * outlets (state editorial line), TVN24, Polsat News and Romania TV (partisan talk shows),
 * Ελληνική Ιστορία and similar sensational history channels, Galileo (infotainment), RTP and TV
 * Cultura (mostly trailers), 公視 and BBC 中文 (traditional script; the app's Chinese is simplified),
 * Kurzgesagt in Spanish and Russian (no recent upload), ARTE.tv Documentare (Romanian subtitles
 * only, the audio is French or German).
 *
 * Phase F (2026-10-20), every level A1 to C2. The first levels also take channels that teach the
 * language in French (`instructionLanguage: "fr"`, preferred: the app's users read French) and
 * children's content in the language (`audience: "children"`: cartoons, kids' shows and news).
 * The upper levels take demanding native content from public broadcasters, universities and
 * established publishers: debates, long interviews, satire, lectures. Left out in this pass:
 * - no upload for 3 weeks or more: Allemand avec Juselle, Anglais avec un Anglophone, ArabEasy,
 *   Espoir Chinois, Russell de Haan, DilGoOne, École de Turc, Roumain avec Souleymane, AVALANG,
 *   Peppa Pig in Ukrainian, Kyiv-Mohyla Academy, Sesamstraat, UR Barn, Kabaret Moralnego Niepokoju,
 *   Svenska Akademien, Almodaris, J'apprends le grec avec Χαρά (and the NHK channel: 3 videos);
 * - too thin or off topic: Maya (coréen), UCU news bulletins, Kompas TV (live breaking-news streams),
 *   Skavlan and Scuola Normale Superiore (titles and talks mostly in English);
 * - unclear publisher or rights: re-upload channels (晓松闲谈, 纪实说 and other 圆桌派 clips), Arabic
 *   and Turkish kids' channels run by fans or without a named publisher (Toyor Baby, Katuri, Silly
 *   George), Smeshariki's Ukrainian dub (Russian rights holder);
 * - editorial line: Dozhd, Habertürk, 北大人 (promotional), Porta dos Fundos (vulgar humour).
 * Still empty after this pass: Ukrainian C2, Arabic B1 and Chinese C2 (see `npm run content:coverage`);
 * no channel met the bar for them.
 * Known limits: La Polyglotte also posts videos for Greek speakers learning French (the Greek lessons
 * are the ones that matter), and several Peppa Pig and Diva channels publish 24/7 live replays.
 */

const VERIFIED_ON = "2026-10-13";
const YOUTUBE_VERIFIED_ON = "2026-10-20";

// Licences ------------------------------------------------------------------------------------

const GLOBAL_VOICES_LICENSE: SourceLicense = {
  kind: "cc-by",
  name: "CC BY 3.0",
  url: "https://creativecommons.org/licenses/by/3.0/",
  termsUrl: "https://globalvoices.org/about/global-voices-attribution-policy/",
  commercialUse: true,
  attribution: "Global Voices",
  verifiedOn: VERIFIED_ON,
  note: "Licence badge in the footer of every edition; attribution policy asks for author, Global Voices and a link.",
};

const CONVERSATION_LICENSE: SourceLicense = {
  kind: "cc-by-nd",
  name: "CC BY-ND 4.0",
  url: "https://creativecommons.org/licenses/by-nd/4.0/",
  termsUrl: "https://theconversation.com/republishing-guidelines",
  commercialUse: true,
  attribution: "The Conversation",
  verifiedOn: VERIFIED_ON,
  note: "Republishing guidelines: free republication, no edits to the text (ND). We only link and show the feed teaser.",
};

const WIKIPEDIA_LICENSE: SourceLicense = {
  kind: "cc-by-sa",
  name: "CC BY-SA 4.0",
  url: "https://creativecommons.org/licenses/by-sa/4.0/",
  termsUrl: "https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use",
  commercialUse: true,
  attribution: "Wikipédia",
  verifiedOn: VERIFIED_ON,
  note: "Featured article feed of the Wikipedia API. Text under CC BY-SA 4.0 (images may differ: never stored).",
};

/** Publisher keeps all rights; the feed is used as published: title, teaser, link. */
function allRightsReserved(termsUrl: string, note: string, attribution?: string): SourceLicense {
  return {
    kind: "all-rights-reserved",
    name: "Tous droits réservés",
    termsUrl,
    commercialUse: false,
    attribution,
    verifiedOn: VERIFIED_ON,
    note,
  };
}

const BBC_LICENSE = allRightsReserved(
  "https://www.bbc.co.uk/news/10628494",
  "BBC News feeds page: use on a website encouraged with the attribution « BBC News », no BBC logo; " +
    "commercial use not granted there (full Terms of Use apply).",
  "BBC News",
);
const DW_LICENSE = allRightsReserved(
  "https://www.dw.com/de/impressum/a-66180469",
  "Official feeds at rss.dw.com. Impressum reachable, no explicit feed licence found: all rights assumed.",
);

const YOUTUBE_LICENSE: SourceLicense = {
  kind: "all-rights-reserved",
  name: "Tous droits réservés",
  termsUrl: "https://www.youtube.com/t/terms",
  commercialUse: false,
  verifiedOn: YOUTUBE_VERIFIED_ON,
  note:
    "YouTube terms allow playback through the official embedded player (youtube-nocookie.com iframe, loaded " +
    "only when the user taps play). We only store the channel feed's metadata (title, link, date) and the first " +
    "lines of the description; the video itself is never copied. Channel owners keep all rights.",
};

// Helpers for multi-edition publishers -----------------------------------------------------

function globalVoices(language: Language, subdomain: string, name: string): SourceDefinition {
  const host = subdomain ? `${subdomain}.globalvoices.org` : "globalvoices.org";
  return {
    key: `global-voices-${language}`,
    name,
    language,
    homepageUrl: `https://${host}/`,
    feedUrl: `https://${host}/feed/`,
    contentType: "article",
    difficulty: "B2",
    defaultMinutes: 6,
    hosts: [host],
    license: GLOBAL_VOICES_LICENSE,
  };
}

function conversation(language: Language, edition: string, name: string): SourceDefinition {
  return {
    key: `the-conversation-${language}`,
    name,
    language,
    homepageUrl: `https://theconversation.com/${edition}`,
    feedUrl: `https://theconversation.com/${edition}/articles.atom`,
    contentType: "article",
    difficulty: "C1",
    defaultMinutes: 8,
    hosts: ["theconversation.com"],
    license: CONVERSATION_LICENSE,
  };
}

function wikipedia(language: Language): SourceDefinition {
  const host = `${language}.wikipedia.org`;
  return {
    key: `wikipedia-featured-${language}`,
    name: "Wikipédia — article du jour",
    language,
    homepageUrl: `https://${host}/`,
    feedUrl: `https://${host}/w/api.php?action=featuredfeed&feed=featured&feedformat=atom`,
    contentType: "article",
    difficulty: "C1",
    defaultMinutes: 12,
    hosts: [host],
    itemFormat: "wikipedia-featured",
    license: WIKIPEDIA_LICENSE,
  };
}

function bbc(language: Language, service: string, name: string, difficulty: "B1" | "B2" = "B2"): SourceDefinition {
  return {
    key: `bbc-${language}`,
    name,
    language,
    homepageUrl: `https://www.bbc.com/${service}`,
    feedUrl: `https://feeds.bbci.co.uk/${service}/rss.xml`,
    contentType: "article",
    difficulty,
    defaultMinutes: 5,
    hosts: ["bbc.com", "bbc.co.uk"],
    license: BBC_LICENSE,
  };
}

/** Age limit of a YouTube video: learning videos do not expire like news (see `maxAgeDays`). */
const YOUTUBE_MAX_AGE_DAYS = 180;

/** Optional traits of a YouTube channel, see the matching fields of a source definition. */
interface YoutubeOptions {
  /** Reads the level of a video from its title when the channel labels them. */
  levelRules?: SourceDefinition["levelRules"];
  /** The channel teaches the language in French or English (absent: target language only). */
  instructionLanguage?: SourceDefinition["instructionLanguage"];
  /** "children": made for children. */
  audience?: SourceDefinition["audience"];
  /** Keeps only the videos whose title matches (channels that also post off-topic videos). */
  titleFilter?: SourceDefinition["titleFilter"];
}

/** A YouTube channel, read from its public Atom feed. `channelId` is the `UC…` id of the channel. */
function youtube(
  language: Language,
  slug: string,
  name: string,
  channelId: string,
  difficulty: SourceDefinition["difficulty"],
  defaultMinutes: number,
  { levelRules, instructionLanguage, audience, titleFilter }: YoutubeOptions = {},
): SourceDefinition {
  return {
    key: `youtube-${slug}`,
    name,
    language,
    homepageUrl: `https://www.youtube.com/channel/${channelId}`,
    feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    contentType: "video",
    difficulty,
    defaultMinutes,
    maxAgeDays: YOUTUBE_MAX_AGE_DAYS,
    ...(levelRules ? { levelRules } : {}),
    ...(instructionLanguage ? { instructionLanguage } : {}),
    ...(audience ? { audience } : {}),
    ...(titleFilter ? { titleFilter } : {}),
    hosts: ["youtube.com"],
    itemFormat: "youtube",
    license: YOUTUBE_LICENSE,
  };
}

// Catalogue -----------------------------------------------------------------------------------

export const SOURCE_CATALOG: SourceDefinition[] = [
  // Russian
  {
    key: "meduza",
    name: "Медуза",
    language: "ru",
    homepageUrl: "https://meduza.io/",
    feedUrl: "https://meduza.io/rss/all",
    contentType: "article",
    difficulty: "B2",
    defaultMinutes: 6,
    hosts: ["meduza.io"],
    license: allRightsReserved(
      "https://meduza.io/en/pages/about",
      "About page: all materials belong to Meduza, no republication without approval; only selected series are CC BY.",
    ),
  },
  {
    key: "postnauka",
    name: "ПостНаука",
    language: "ru",
    homepageUrl: "https://postnauka.org/",
    feedUrl: "https://postnauka.org/feed",
    contentType: "article",
    difficulty: "C1",
    defaultMinutes: 10,
    hosts: ["postnauka.org", "postnauka.ru"],
    license: allRightsReserved(
      "https://postnauka.org/about",
      "Footer: « © ПостНаука. Все права защищены ». Official RSS feed.",
    ),
  },
  {
    key: "arzamas",
    name: "Arzamas",
    language: "ru",
    homepageUrl: "https://arzamas.academy/",
    feedUrl: "https://arzamas.academy/feed_v1/mag.rss",
    contentType: "article",
    difficulty: "C1",
    defaultMinutes: 10,
    hosts: ["arzamas.academy"],
    license: allRightsReserved(
      "https://arzamas.academy/rules",
      "Magazine feed linked from the site's <head>. Site rules: protected material, no reuse grant to visitors.",
    ),
  },
  globalVoices("ru", "ru", "Global Voices по-русски"),
  bbc("ru", "russian", "Би-би-си"),
  {
    key: "dw-ru",
    name: "DW на русском",
    language: "ru",
    homepageUrl: "https://www.dw.com/ru/",
    feedUrl: "https://rss.dw.com/xml/rss-ru-all",
    contentType: "article",
    difficulty: "B2",
    defaultMinutes: 5,
    hosts: ["dw.com"],
    license: DW_LICENSE,
  },

  // Italian
  globalVoices("it", "it", "Global Voices in italiano"),
  {
    key: "internazionale",
    name: "Internazionale",
    language: "it",
    homepageUrl: "https://www.internazionale.it/",
    feedUrl: "https://www.internazionale.it/sitemaps/rss.xml",
    contentType: "article",
    difficulty: "B2",
    defaultMinutes: 6,
    hosts: ["internazionale.it"],
    access: "metered",
    license: allRightsReserved(
      "https://www.internazionale.it/notelegali",
      "Note legali: all rights reserved. Feed linked from the homepage. Part of the articles for subscribers.",
    ),
  },
  {
    key: "rsi",
    name: "RSI Info",
    language: "it",
    homepageUrl: "https://www.rsi.ch/info/",
    feedUrl: "https://www.rsi.ch/info/?f=rss",
    contentType: "article",
    difficulty: "B1",
    defaultMinutes: 4,
    hosts: ["rsi.ch"],
    license: allRightsReserved(
      "https://www.rsi.ch/la-rsi/Condizioni-di-utilizzo--1869737.html",
      "Swiss public broadcaster (Italian). Condizioni di utilizzo: private, non-commercial use only.",
    ),
  },
  {
    key: "ansa",
    name: "ANSA",
    language: "it",
    homepageUrl: "https://www.ansa.it/",
    feedUrl: "https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml",
    contentType: "article",
    difficulty: "B1",
    defaultMinutes: 3,
    hosts: ["ansa.it"],
    license: allRightsReserved(
      "https://www.ansa.it/sito/static/disclaimer.html",
      "Disclaimer: content for personal information only, any other use needs ANSA's written consent.",
    ),
  },

  // Spanish
  globalVoices("es", "es", "Global Voices en Español"),
  conversation("es", "es", "The Conversation España"),
  bbc("es", "mundo", "BBC News Mundo"),

  // German
  wikipedia("de"),
  {
    key: "dw-langsam",
    name: "DW — Langsam gesprochene Nachrichten",
    language: "de",
    homepageUrl: "https://learngerman.dw.com/de/langsam-gesprochene-nachrichten/s-60040332",
    feedUrl: "https://rss.dw.com/xml/DKpodcast_lgn_de",
    contentType: "podcast",
    difficulty: "B1",
    defaultMinutes: 10,
    hosts: ["dw.com"],
    license: DW_LICENSE,
  },
  {
    key: "tagesschau",
    name: "tagesschau",
    language: "de",
    homepageUrl: "https://www.tagesschau.de/",
    feedUrl: "https://www.tagesschau.de/index~rss2.xml",
    contentType: "article",
    difficulty: "B2",
    defaultMinutes: 4,
    hosts: ["tagesschau.de"],
    license: allRightsReserved(
      "https://www.tagesschau.de/impressum",
      "ARD public broadcaster; RSS linked from the site's <head>. No explicit feed licence found: all rights assumed.",
    ),
  },

  // English
  globalVoices("en", "", "Global Voices"),
  conversation("en", "global", "The Conversation"),
  wikipedia("en"),
  {
    key: "npr-news",
    name: "NPR News",
    language: "en",
    homepageUrl: "https://www.npr.org/",
    feedUrl: "https://feeds.npr.org/1001/rss.xml",
    contentType: "article",
    difficulty: "B2",
    defaultMinutes: 5,
    hosts: ["npr.org"],
    license: allRightsReserved(
      "https://www.npr.org/about-npr/179876898/terms-of-use",
      "Feed linked from the homepage. Terms page did not load during the check: all rights assumed, to re-read.",
    ),
  },

  // Portuguese
  globalVoices("pt", "pt", "Global Voices em Português"),
  bbc("pt", "portuguese", "BBC News Brasil"),
  {
    key: "agencia-brasil",
    name: "Agência Brasil",
    language: "pt",
    homepageUrl: "https://agenciabrasil.ebc.com.br/",
    feedUrl: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml",
    contentType: "article",
    difficulty: "B1",
    defaultMinutes: 4,
    hosts: ["agenciabrasil.ebc.com.br"],
    license: allRightsReserved(
      "https://www.ebc.com.br/sobre/publicidade-legal-e-licenciamento",
      "Long published under CC BY 3.0 BR, but the footer now reads « Todos os direitos reservados pela EBC » " +
        "and the licensing page sends to licenciamento@ebc.com.br: treated as all rights reserved until confirmed.",
    ),
  },

  // Dutch
  globalVoices("nl", "nl", "Global Voices in het Nederlands"),
  {
    key: "nos",
    name: "NOS Nieuws",
    language: "nl",
    homepageUrl: "https://nos.nl/",
    feedUrl: "https://feeds.nos.nl/nosnieuwsalgemeen",
    contentType: "article",
    difficulty: "B1",
    defaultMinutes: 4,
    hosts: ["nos.nl"],
    license: allRightsReserved(
      "https://over.nos.nl/wp-content/uploads/2025/10/NOS-Algemene-Voorwaarden-2025.pdf",
      "Algemene voorwaarden 2025: copyright NOS, reuse other than personal non-commercial needs written consent.",
    ),
  },

  // Swedish
  {
    key: "svt",
    name: "SVT Nyheter",
    language: "sv",
    homepageUrl: "https://www.svt.se/",
    feedUrl: "https://www.svt.se/nyheter/rss.xml",
    contentType: "article",
    difficulty: "B1",
    defaultMinutes: 4,
    hosts: ["svt.se"],
    license: allRightsReserved(
      "https://omoss.svt.se/",
      "Swedish public broadcaster; official RSS. No terms page found (old URL redirects to omoss.svt.se): all rights assumed.",
    ),
  },

  // Polish
  {
    key: "dw-pl",
    name: "DW po polsku",
    language: "pl",
    homepageUrl: "https://www.dw.com/pl/",
    feedUrl: "https://rss.dw.com/xml/rss-pol-all",
    contentType: "article",
    difficulty: "B2",
    defaultMinutes: 5,
    hosts: ["dw.com"],
    license: DW_LICENSE,
  },

  // Czech
  {
    key: "irozhlas",
    name: "iROZHLAS",
    language: "cs",
    homepageUrl: "https://www.irozhlas.cz/",
    feedUrl: "https://www.irozhlas.cz/rss/irozhlas",
    contentType: "article",
    difficulty: "B2",
    defaultMinutes: 5,
    hosts: ["irozhlas.cz"],
    license: allRightsReserved(
      "https://www.rozhlas.cz/podminky-uziti",
      "Czech Radio terms: materials copyrighted, sharing without consent prohibited; linking with " +
        "metadata is the redistribution they describe. Feed on irozhlas.cz.",
    ),
  },

  // Romanian, Greek
  globalVoices("ro", "ro", "Global Voices în română"),
  globalVoices("el", "el", "Global Voices στα Ελληνικά"),

  // Korean
  bbc("ko", "korean", "BBC 코리아"),

  // Ukrainian
  globalVoices("uk", "uk", "Global Voices українською"),
  bbc("uk", "ukrainian", "BBC News Україна"),

  // Turkish
  bbc("tr", "turkce", "BBC News Türkçe"),

  // Arabic
  globalVoices("ar", "ar", "الأصوات العالمية"),
  bbc("ar", "arabic", "بي بي سي عربي"),

  // Chinese (Mandarin, simplified script)
  bbc("zh", "zhongwen/simp", "BBC 中文"),

  // Japanese
  wikipedia("ja"),
  bbc("ja", "japanese", "BBCニュース 日本語"),

  // Indonesian
  conversation("id", "id", "The Conversation Indonesia"),

  // YouTube channels (learning with native speakers; played in the official embedded player)
  youtube("de", "easy-german", "Easy German", "UCbxb2fqe9oNgglAoYqsYOtQ", "B1", 12),
  youtube("de", "dw-learn-german", "Deutsch lernen mit der DW", "UCxUWIEL-USsiPak0Qy6_vVg", "B1", 8),
  youtube("es", "easy-spanish", "Easy Spanish", "UCAL4AMMMXKxHDu3FqZV6CbQ", "B1", 12),
  youtube("it", "easy-italian", "Easy Italian", "UChpDG_WQkf_2tgLUr9xTR0g", "B1", 12),
  youtube("en", "bbc-learning-english", "BBC Learning English", "UCHaHD477h-FeBbVh9Sh7syA", "B1", 6, {
    levelRules: [
      { pattern: /Real Easy English/i, difficulty: "A2" },
      { pattern: /from the News/i, difficulty: "B2" },
    ],
  }),
  youtube("nl", "easy-dutch", "Easy Dutch", "UC1x1Tso1WzjvU7GhcJBVQhg", "B1", 12),
  youtube("pl", "easy-polish", "Easy Polish", "UCPG9JpJITL7xETpVylMyrqA", "B1", 12),
  youtube("tr", "easy-turkish", "Easy Turkish", "UC1U-NW0ci6d1aHLc2gOHv8Q", "B1", 12),
  youtube("ja", "easy-japanese-podcast", "Easy Japanese Podcast", "UC16-9M0osgdFbLKXvCwpXaw", "A2", 10),
  youtube("zh", "easy-mandarin", "Easy Mandarin", "UCw837dYLZNGdhk5G5zjySIg", "B1", 12),
  youtube("id", "easy-indonesian", "Easy Indonesian", "UCfSZ2wSyWK7cRi-TcLp30Ew", "B1", 12),
  youtube("ru", "real-russian-club", "Real Russian Club", "UCyJznKYS9kkP7RWWq3YAbFw", "B1", 12),
  youtube("ru", "russian-progress", "Russian Progress", "UCF0ZeqSkybD1aFtFxjA8z9w", "B1", 12),
  youtube("sv", "swedishpod", "SwedishPod", "UCeeQYUPn4kTWR7IAO3tbiOw", "B1", 10),

  youtube("es", "espanol-con-juan", "Español con Juan", "UCoHJ7PkM6T92LwgJgrnDhWA", "B1", 12),
  youtube("es", "hablando", "¡Hablando!", "UCv8Finl3foOCkvcC9FOUDhA", "A2", 20),
  youtube("es", "quantum-fracture", "QuantumFracture", "UCbdSYaPD-lr1kW27UJuk8Pw", "B2", 15),
  youtube("es", "dw-espanol", "DW Español", "UCT4Jg8h03dD0iN3Pb5L0PMA", "B2", 8),
  youtube("it", "italiano-automatico", "Italiano Automatico", "UChJtl-bJFgQit_BmjL5axtg", "B1", 12),
  youtube("it", "geopop", "Geopop", "UCx7EWheHmjCW3vX8K2d09vg", "B2", 10),
  youtube("it", "rainews", "RaiNews", "UCxqR9g_1XlnfrqwHK9viwCw", "B2", 3),
  youtube("de", "logo", "logo! (ZDF, Kindernachrichten)", "UCuziK4bUFRr3z62bE7FMDPQ", "B1", 6, { audience: "children" }),
  youtube("de", "slow-german", "Slow German mit Annik", "UCXntXBt2YKBO1xDni0EgjXA", "B1", 12),
  youtube("de", "deutsch-mit-rieke", "Deutsch mit Rieke", "UCthmoIZKvuR1-KuwednkjHg", "C1", 10, {
    levelRules: [{ pattern: /B2\s*[/,-]\s*C1/i, difficulty: "B2" }],
  }),
  youtube("de", "quarks", "Quarks", "UC1Y7onDsPyfP-lu--SXF-ew", "B2", 12),
  youtube("de", "terra-x-history", "Terra X History", "UCA3mpqm67CpJ13YfA8qAnow", "B2", 25),
  youtube("en", "learn-english-with-bob", "Learn English with Bob the Canadian", "UCZJJTxA36ZPNTJ1WFIByaeA", "A2", 15),
  youtube("en", "easy-english", "Easy English", "UCvgLaFuTGGRXl0eyvBRCifA", "B1", 12),
  youtube("en", "crash-course", "CrashCourse", "UCX6b17PVsYBQ0ip5gyeme-Q", "B2", 12),
  youtube("en", "kurzgesagt", "Kurzgesagt – In a Nutshell", "UCsXVk37bltHxD1rDPwtNM8Q", "B2", 10),
  youtube("en", "ted", "TED", "UCAuUUnT6oDeKwE6v1NGQxug", "C1", 15),
  youtube("nl", "dutchdialogue", "DutchDialogue", "UCQzCGgbB9hBtgsuxkqtLOdg", "A1", 25),
  youtube("nl", "nos-journaal-makkelijke-taal", "NOS Journaal in Makkelijke Taal", "UCch2JvY2ZSwcjf5gb93HGQw", "A2", 5),
  youtube("nl", "nos-jeugdjournaal", "NOS Jeugdjournaal", "UC-bbHiTZGWKbsCjpzUfrk6Q", "B1", 3, { audience: "children" }),
  youtube("nl", "slow-dutch", "Slow Dutch", "UCPHyhOURDyQzkhxGUjZ9FGg", "B1", 15, {
    levelRules: [{ pattern: /\bA2\b/, difficulty: "A2" }],
  }),
  youtube("nl", "universiteit-van-nederland", "Universiteit van Nederland", "UCSW0CYhKC1J0cpknZvN8MvQ", "C1", 12),
  youtube("sv", "tv4-nyhetsmorgon", "Nyhetsmorgon (TV4)", "UCORLbI_fwmG7hxurck_WmIg", "B2", 6),
  youtube("pl", "polski-dla-obcokrajowcow", "Polski dla obcokrajowców", "UCuqJctV8A8XTTZFuK1lAynA", "B1", 8),
  youtube("pl", "polskie-radio-dwojka", "Polskie Radio Dwójka", "UCGX6SKFDlbE3MLbENmNO9mQ", "B2", 20),
  youtube("ru", "russkiy-v-dialogakh", "Русский в диалогах", "UCDVnEZrGwrA2RLkr9tcrxRQ", "A2", 12),
  youtube("ru", "postnauka", "ПостНаука", "UCSPd93is2UQsd_jZ6yHBfqQ", "C1", 12),
  youtube("ru", "dw-reportazhi", "DW репортажи", "UCm5glKgewJHdzk77qhpXNMw", "B2", 8),
  youtube("pt", "manual-do-mundo", "Manual do Mundo", "UCKHhA5hN2UohhFDfNXB_cvQ", "B1", 15),
  youtube("pt", "drauzio-varella", "Drauzio Varella", "UC9zqTTVeClpqMQ5CLuJdWtw", "B2", 8),
  youtube("pt", "euronews-pt", "Euronews em Português", "UCUmEPYxmnyQDeRUcFkslmQw", "B2", 3),
  youtube("pt", "bbc-news-brasil", "BBC News Brasil (vídeos)", "UCthbIFAxbXTTQEC7EcQvP1Q", "B2", 5),
  youtube("ro", "tvr", "TVR", "UChdrIsYOHZXgEyCLaOHc2Ew", "B2", 5),
  youtube("ro", "euronews-ro", "Euronews România", "UCbATDExtWstHnwWELZnXNZA", "B2", 5),
  youtube("el", "ert", "ΕΡΤ", "UC0jVU-mK53vDQZcSZB5mVHg", "B2", 5),
  youtube("el", "euronews-gr", "euronews (στα ελληνικά)", "UC8HJZNfDPoySgW9DN3YGNaA", "B2", 4),
  youtube("tr", "trt-cocuk", "TRT Çocuk", "UCrFf5dtMe6M1XJHqbKJ4X6Q", "A2", 10, { audience: "children" }),
  youtube("tr", "evrim-agaci", "Evrim Ağacı", "UCatnasFAiXUvWwH8NlSdd3A", "B2", 15),
  youtube("tr", "euronews-tr", "euronews (Türkçe)", "UC7nLr-rPOKYhRE4wRZoLxkg", "B2", 3),
  youtube("ar", "arabicles", "لكل من يريد تعلم العربية", "UC0Js0rww-JwkFY2UGzXcw3w", "A2", 8),
  youtube("ar", "dw-arabic", "DW عربية", "UC30ditU5JI16o5NbFsHde_Q", "B2", 8),
  youtube("ar", "bbc-news-arabic", "BBC News عربي", "UCelk6aHijZq-GJBBB9YpReA", "B2", 6),
  youtube("ar", "france24-arabic", "فرانس 24", "UCdTyuXgmJkG_O8_75eqej-w", "B2", 4),
  youtube("zh", "dw-chinese", "DW 中文", "UC99XkAM3Y82ONvdpwUYmOZg", "B2", 5),
  youtube("ja", "nihongo-con-teppei", "Nihongo con Teppei", "UCH88l3_ltyJm67gAFzDFNRw", "A2", 15),
  youtube("ja", "bbc-news-japan", "BBC News Japan", "UCCcey5CP5GDZeom987gqTdg", "B2", 4),
  youtube("ja", "tbs-news-dig", "TBS NEWS DIG", "UC6AG81pAkf6Lbi_1VC5NmPA", "B2", 10),
  youtube("ko", "speaking-korean", "한국어로 말해요", "UCwgUzX2ey4FaxJU-pVw3ZtA", "A2", 8),
  youtube("ko", "ebs-jisikchaenel-e", "EBS 지식채널e", "UCL44YGs2BXxtM4GZRH-wnrQ", "B2", 5),
  youtube("ko", "kbs-news", "KBS News", "UCcQTRi69dsVYHN3exePtZ1A", "B2", 10),
  youtube("ko", "kbs-docu", "KBS 다큐", "UC4LW3sOslC14Vn5bcoNUBkg", "C1", 30),
  youtube("id", "kok-bisa", "Kok Bisa?", "UCu0yQD7NFMyLu_-TmKa4Hqg", "B1", 8),
  youtube("id", "alamaya", "Alamaya", "UCq8Mzf2SMb_KpMgRiNdaP3g", "B2", 10),
  youtube("id", "narasi-newsroom", "Narasi Newsroom", "UCnOf30K0d0e8M7mc4FUzR0A", "B2", 10),
  youtube("cs", "ct24", "ČT24", "UC0HQLHvU5_MMUJxLz6yl0GA", "B2", 8),
  youtube("cs", "ct-edu", "ČT edu", "UCGoZtkfa-WP4-ZVOdMsm0Fw", "B1", 10),
  youtube("cs", "dokumenty-ct", "Dokumenty České televize", "UC7yXEWDQJF56FdtsyII4OmA", "C1", 40),
  youtube("uk", "suspilne-novyny", "Суспільне Новини", "UCPY6gj8G7dqwPxg9KwHrj5Q", "B2", 4),
  youtube("uk", "suspilne-dokumentalistyka", "Суспільне Документалістика", "UCKwyN6Zgf3foTk1FWaEE-ZA", "C1", 25),

  // Phase F: every CEFR level (A1 to C2) in every language, as far as the channels allow
  // Children's content in the language (cartoons, songs, kids' news): first levels
  youtube("ru", "smeshariki", "Смешарики", "UC5A-Wp9ujcr5g9sYagAafEA", "A1", 7, { audience: "children" }),
  youtube("it", "peppa-pig-it", "Peppa Pig Italiano", "UCS1SHyxP0UhAg84AKamy3jA", "A1", 10, { audience: "children" }),
  youtube("es", "clan-rtve", "Clan (RTVE)", "UCeyFLupSTP9JoeA4BJHwfyA", "A2", 10, { audience: "children" }),
  youtube("de", "zdfchen", "ZDFchen", "UCx-LlEGFXPe74sV83VNfe0Q", "A1", 6, { audience: "children" }),
  youtube("de", "die-maus", "Die Maus (WDR)", "UCRWSxXBnz9IRS4SgRhG2wpQ", "A2", 8, { audience: "children" }),
  youtube("en", "peppa-pig", "Peppa Pig", "UCAOtE1V7Ots4DjM8JLlrYgg", "A1", 10, { audience: "children" }),
  youtube("pt", "peppa-pig-pt", "Peppa Pig em Português", "UCvD9GB-E4q_TuMpwUtFBhLA", "A1", 10, {
    audience: "children",
  }),
  youtube("nl", "ketnet", "Ketnet", "UCD8Sq94-0EXyb59S_GFppuQ", "A2", 15, { audience: "children" }),
  youtube("sv", "bamse", "Bamse", "UCvoi9I4_wUxWsYAb6KKx6Ow", "A1", 3, { audience: "children" }),
  youtube("pl", "peppa-pig-pl", "Świnka Peppa", "UCppKzvf9-RJM_Bxj2J15FlQ", "A1", 10, { audience: "children" }),
  youtube("cs", "peppa-pig-cs", "Prasátko Peppa", "UChuDrNdKmsXF_5xcU8XhIPQ", "A1", 10, { audience: "children" }),
  youtube("uk", "brobaks", "Бробакс", "UCXXz2YlSViz8kJImFSGfx4Q", "A2", 8, { audience: "children" }),
  youtube("uk", "sonechko", "З любов’ю до дітей", "UCpa-I4ppRaNH433rA5GYW9g", "A1", 8, { audience: "children" }),
  youtube("ro", "peppa-pig-ro", "Purcelușa Peppa", "UC46CfmbXJyAJUhc_7CIMs8w", "A1", 10, { audience: "children" }),
  youtube("el", "peppa-pig-gr", "Πέππα το Γουρουνάκι", "UCkiXi3X7fGie4Now_0a5vtA", "A1", 10, {
    audience: "children",
  }),
  youtube("el", "smurfs-gr", "Τα Στρουμφάκια", "UCYYr3k25o4uxywWOOWi-Bkw", "A2", 10, { audience: "children" }),
  youtube("tr", "niloya", "Niloya", "UCKFIi1uWM9BCMb7O_GyvBsQ", "A1", 10, { audience: "children" }),
  youtube("zh", "peppa-pig-zh", "小猪佩奇", "UCRi0sw4PDw-C2C7fS9hrx5Q", "A1", 10, { audience: "children" }),
  youtube("ja", "shimajiro", "しまじろうチャンネル", "UCQOkMREmJU1KbbbnHWhkzxg", "A1", 10, { audience: "children" }),
  youtube("ja", "doraemon", "ドラえもん", "UChX6YTx96D5yEW7EUD7KdZQ", "A2", 10, { audience: "children" }),
  youtube("ko", "ebs-kids", "EBS 키즈", "UCx_dzPI6efSohgtOkAG43-A", "A1", 10, { audience: "children" }),
  youtube("ko", "pororo", "뽀로로", "UCPUeGC_AL-OnDQORKhRm6iA", "A1", 10, { audience: "children" }),
  youtube("id", "diva-the-series", "Diva The Series", "UCG9eNeLwgczW2cI1X51y1fw", "A1", 10, { audience: "children" }),

  // Channels that teach the language in French (instructionLanguage: "fr")
  youtube("ru", "le-russe-fr", "Apprendre le russe (RKI)", "UC8p7cD5y4EXFc4f9r66AbIA", "A1", 8, {
    levelRules: [{ pattern: /[BВ][12]/, difficulty: "B1" }, { pattern: /[AА]2/, difficulty: "A2" }],
    instructionLanguage: "fr",
  }),
  youtube("it", "secrets-de-litalien", "Les secrets de l'italien", "UCFxQ-v9Ht437tayMaUIzr8A", "A2", 10, {
    levelRules: [{ pattern: /\bA1\b|d[ée]butant/i, difficulty: "A1" }, { pattern: /\bB[12]\b/, difficulty: "B1" }],
    instructionLanguage: "fr",
  }),
  youtube("it", "litalien-avec-silvia", "L'italien avec Silvia", "UCOjscfnIVhyqMXCk5np6ndg", "A2", 10, {
    instructionLanguage: "fr",
  }),
  youtube("es", "holamigo", "Holamigo", "UCfY0B43ZgcN1ELb5e_yn5Kg", "A2", 8, {
    levelRules: [{ pattern: /niveau avanc[ée]|\bB[12]\b/i, difficulty: "B1" }, { pattern: /faux[- ]d[ée]butant|\bA2\b/i, difficulty: "A2" }, { pattern: /d[ée]butant|\bA1\b/i, difficulty: "A1" }],
    instructionLanguage: "fr",
  }),
  youtube("es", "espagnol-passion", "Espagnol Passion !", "UCQgi3doSRxDQw_eINZPmuyQ", "A2", 15, {
    levelRules: [{ pattern: /d[ée]butant|bases|\bA1\b/i, difficulty: "A1" }],
    instructionLanguage: "fr",
  }),
  youtube("de", "le-code-allemand", "Le Code Allemand", "UCYEkxo7bS8yiZsnxqfZWk0w", "A2", 15, {
    instructionLanguage: "fr",
  }),
  youtube("en", "anglais-avec-iliass", "Anglais avec Iliass", "UCgWq5FMEiw4HT7Did2AR9Xg", "A1", 10, {
    instructionLanguage: "fr",
  }),
  youtube("pt", "le-portugais-avec-rafa", "Le Portugais avec Rafa", "UCk4kG9u6ttob2d1zN7n8l7w", "A1", 10, {
    instructionLanguage: "fr",
  }),
  youtube("pt", "portugais-bresilien", "Portugais Brésilien", "UCqSfyq4X1UPQRyudhGmHJFw", "A2", 10, {
    levelRules: [{ pattern: /premi[eè]res phrases|d[ée]butant/i, difficulty: "A1" }],
    instructionLanguage: "fr",
  }),
  youtube("pt", "marie-portugais-europeen", "Marie — portugais européen", "UCuV7OSCMBYOATlQSsougNxg", "A2", 10, {
    instructionLanguage: "fr",
  }),
  youtube("el", "la-polyglotte", "La Polyglotte", "UCjPHGGcX0QSkpfGrZJIPDjQ", "A1", 15, {
    levelRules: [{ pattern: /\bA2\b/, difficulty: "A2" }],
    instructionLanguage: "fr",
    // The channel also teaches French to Greek speakers and posts vlogs: only its Greek lessons.
    titleFilter: /grec moderne/i,
  }),
  youtube("ar", "arabica-podcast", "Arabica Podcast", "UCnp3UUCT536IAmn53TBJ5CQ", "A1", 10, {
    instructionLanguage: "fr",
  }),
  youtube("zh", "apprendre-le-chinois", "Apprendre le chinois", "UCQdL2XyMQ1K91FQVMGhjfag", "A1", 10, {
    instructionLanguage: "fr",
  }),
  youtube("ja", "sophie-cours-de-japonais", "Sophie — cours de japonais", "UCQ1Fi2asIi15AM0-EecDvng", "A2", 10, {
    levelRules: [{ pattern: /JLPT N5|d[ée]butant/i, difficulty: "A1" }],
    instructionLanguage: "fr",
  }),
  youtube("ja", "japonais-facile-sayane", "Japonais facile avec Sayané", "UCaUQduB3RqnhDUEtAwb3z2Q", "A1", 10, {
    instructionLanguage: "fr",
  }),
  youtube("ko", "boost-ton-coreen", "Boost ton Coréen", "UC_Pses5-ywyCscVsSYIxAXw", "A2", 10, {
    instructionLanguage: "fr",
  }),
  youtube("id", "indonesien-facile", "Indonésien Facile", "UCLrocFUbtJ6QAA5XCFAgaPQ", "A1", 10, {
    levelRules: [{ pattern: /Le[cç]on (?:2[5-9]|[3-9]\d)\b/, difficulty: "A2" }],
    instructionLanguage: "fr",
  }),

  // Channels that teach the language in English, only where a cell had no French, children's or target-language option (instructionLanguage: "en")
  youtube("sv", "slow-swedish-katrin", "Slow Swedish with Katrin", "UCbG0VOqIo9EqEtfE3Ru2BaQ", "A2", 15, {
    instructionLanguage: "en",
  }),
  youtube("pl", "learn-polish-michal", "Learn Polish with Michał", "UC1_2FI_b2656nTtAEdpceMA", "A2", 12, {
    instructionLanguage: "en",
  }),
  youtube("cs", "cesta-cestiny", "CestaČeštiny", "UCB0qni50TJFxzjNFQ1DL4xA", "A2", 12, {
    levelRules: [{ pattern: /for Beginners/i, difficulty: "A1" }],
    instructionLanguage: "en",
  }),
  youtube("uk", "learn-ukrainian-vakulenko", "Learn Ukrainian with Vakulenko", "UCRAUFwEBnC1WRdeDq3p0paA", "B1", 12, {
    instructionLanguage: "en",
  }),
  youtube("ro", "learn-romanian-nico", "Learn Romanian with Nico", "UCzKrAcUGNwkSMOhLgNuQAwg", "A2", 12, {
    instructionLanguage: "en",
  }),
  youtube("ro", "i-learn-romanian", "I Learn Romanian", "UCIG0Kf1hykrPkNk_l4pfAWQ", "B1", 20, {
    instructionLanguage: "en",
  }),
  youtube("el", "greek-just-like-that", "Greek. Just Like That.", "UCF5d4H7fVEg4sJLuS-udCVg", "B1", 8, {
    instructionLanguage: "en",
  }),

  // Content in the language itself for the intermediate and upper levels (public broadcasters, universities, long interviews, debates, satire)
  youtube("ru", "vdud", "вДудь", "UCMCgOm8GZkHp8zJ6l7_hIuA", "C2", 90),
  youtube("it", "la7-attualita", "La7 Attualità", "UC2_ZJDH5PXEoJJz9zAvBuiA", "C1", 10),
  youtube("it", "festival-della-mente", "Festival della Mente", "UCpIZxLKPR8gkMD80Kl8sTTQ", "C2", 40),
  youtube("es", "aprendemos-juntos", "Aprendemos Juntos", "UCI6QcXatdaEAaRTRjl3dc0w", "C1", 20),
  youtube("es", "uned", "UNED", "UCAQH04GK7-OfQC6nkzAucLw", "C2", 45),
  youtube("de", "sternstunden", "SRF Kultur Sternstunden", "UCh_GQqobenO55IJ9sYZWndA", "C2", 60),
  youtube("de", "zdf-magazin-royale", "ZDF Magazin Royale", "UCNNEMxGKV1LsKZRt4vaIbvw", "C2", 30),
  youtube("en", "oxford-union", "Oxford Union", "UCY7dD6waquGnKTZSumPMTlQ", "C2", 60),
  youtube("en", "intelligence-squared", "Intelligence Squared", "UCaqcvH8EvUtePORpN03jLMg", "C2", 60),
  youtube("pt", "casa-do-saber", "Casa do Saber", "UCtvvTFp0XANyllOdmzZr9VQ", "C1", 20),
  youtube("pt", "roda-viva", "Roda Viva", "UCNVsZnDXOM4PodYIEgM2e4w", "C2", 75),
  youtube("nl", "tegenlicht", "VPRO Tegenlicht", "UCOZCa3XjOpDfWuQFDy5fmQA", "B2", 50),
  youtube("nl", "buitenhof", "Buitenhof", "UCxNAO8eeqqFB-AECp4GHR0A", "C2", 30),
  youtube("sv", "ur-play", "UR Play", "UCMbT7f3uBbPv5dCPu7ND-yA", "C1", 20, {
    levelRules: [{ pattern: /GYMNASIET/, difficulty: "B2" }],
  }),
  youtube("sv", "kva", "Kungl. Vetenskapsakademien", "UC_rlZQ1QRdp6cgW9-Wt9gTQ", "C2", 60),
  youtube("pl", "polskie-radio-24", "Polskie Radio 24", "UCTKxkwZp-aWyNsV3vdV2EpA", "C1", 20),
  youtube("pl", "uniwersytet-warszawski", "Uniwersytet Warszawski", "UCYS8pMgw36ILNPw3XXxx6tg", "C2", 30),
  youtube("cs", "veda-24", "Věda 24 (ČT24)", "UC2wsyTwB2DxTMWd0ezFd4JQ", "C1", 15),
  youtube("cs", "cesky-rozhlas-plus", "Český rozhlas Plus", "UCfDmmHLG-H5mpTF1kt0mT6w", "C2", 40),
  youtube("uk", "hromadske-talk", "hromadske talk", "UCpxXjZGmWWP8jLCrLhBvxSA", "C1", 40),
  youtube("ro", "radio-romania-cultural", "Radio România Cultural", "UCqyDU8hGwMW8_t0CWUHGA_g", "C1", 30),
  youtube("ro", "academia-romana", "Academia Română", "UCuuNmYFXGSVcBHuBKG0KxcA", "C2", 60),
  youtube("el", "pod-gr", "Pod", "UC9X3FnOfjrj0yeN1zsXQS2A", "C1", 40),
  youtube("el", "ekpa", "ΕΚΠΑ", "UCz9D6aUKkfItjR6cPrn1OVw", "C2", 60),
  youtube("tr", "baris-ozcan", "Barış Özcan", "UCv6jcPwFujuTIwFQ11jt1Yw", "C1", 15),
  youtube("tr", "bilkent", "Bilkent Üniversitesi", "UCrU4smtf9hhG7lkdqyDV48A", "C2", 60),
  youtube("ar", "thmanyah", "إذاعة ثمانية", "UCwjLh640nGXSGa9iHRS31ag", "C1", 60),
  youtube("ar", "arab-center", "المركز العربي للأبحاث", "UCmjtP6y9K13fz3sSFJjm4UA", "C2", 45),
  youtube("zh", "yixi", "一席 YiXi", "UCKFB_rVEFEF3l-onQGvGx1A", "C1", 20),
  youtube("zh", "li-yongle", "李永乐老师", "UCvNxfitQbWkmLuCd44UfrYQ", "B2", 15),
  youtube("zh", "daily-chinese-dialogues", "Dialogues quotidiens en chinois", "UCE4zJ6h_UsUY1HpTtdE5Dkw", "A2", 8),
  youtube("ja", "yasashii-nihongo-news", "やさしい日本語ニュース", "UCEKqXIRRtDX_NRp30JTty4w", "B1", 5),
  youtube("ja", "pivot", "PIVOT", "UC8yHePe_RgUBE-waRWy6olw", "C1", 20),
  youtube("ja", "rehacq", "ReHacQ", "UCG_oqDSlIYEspNpd2H4zWhw", "C2", 45),
  youtube("ja", "utokyo", "UTokyo Channel", "UCGkctuF55veBi7xDGCgcYkw", "C2", 60),
  youtube("ko", "king-sejong-institute", "세종학당재단", "UCE6A9IRnKGWMHt5hB4PBTzQ", "B1", 8),
  youtube("ko", "jtbc-news", "JTBC News", "UCsU-I-vHLiaMfV_ceaYz5rQ", "C1", 10),
  youtube("ko", "mbc-100-minute-debate", "MBC 100분 토론", "UCD46H9Pm3nLqCj7vv3pQkPA", "C2", 100),
  youtube("id", "gita-wirjawan", "Gita Wirjawan — Endgame", "UCDaqDYhGmJdrlHr4h9LQ5uw", "C2", 60),
  youtube("id", "harian-kompas", "Harian Kompas", "UCovqoUzPm9_s6mMt9OiWKpA", "C1", 10),
];
