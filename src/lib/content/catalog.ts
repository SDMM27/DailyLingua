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
 */

const VERIFIED_ON = "2026-10-13";

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
];
