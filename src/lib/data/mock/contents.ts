import { SOURCE_CATALOG } from "@/lib/content/catalog";
import { sourceDefinitionSchema, type ContentListItem, type SourceInfo } from "@/lib/schemas/content";

/** Every source of the catalogue, as the sources screen shows it. Never fetched in the demo. */
export function buildMockSources(): SourceInfo[] {
  return SOURCE_CATALOG.map((definition) => {
    const s = sourceDefinitionSchema.parse(definition);
    return {
      key: s.key,
      name: s.name,
      language: s.language,
      homepage: s.homepageUrl,
      contentType: s.contentType,
      access: s.access,
      license: { kind: s.license.kind, name: s.license.name, url: s.license.url, termsUrl: s.license.termsUrl },
      lastFetchedAt: null,
    };
  });
}

/**
 * Demo reading list: invented titles and teasers, attributed to real sources of the catalogue and
 * linked to their homepage (like the phase 1 demo mission), dated relative to `now`.
 */
const DEMO_ITEMS: { source: string; hoursAgo: number; title: string; summary: string; minutes?: number }[] = [
  {
    source: "postnauka",
    hoursAgo: 3,
    title: "Как города меняют язык: диалекты в эпоху мегаполисов",
    summary: "Лингвист рассказывает, почему городская речь выравнивается быстрее сельской и какие черты говоров всё-таки сохраняются.",
  },
  {
    source: "global-voices-ru",
    hoursAgo: 9,
    title: "Библиотеки Средней Азии переходят в цифровой формат",
    summary: "Как небольшие команды оцифровывают рукописи и газеты, чтобы сделать их доступными исследователям по всему миру.",
  },
  {
    source: "arzamas",
    hoursAgo: 30,
    title: "Зачем читать Лескова сегодня",
    summary: "Краткое введение в язык и мир Николая Лескова: сказ, народная этимология и неожиданный юмор.",
  },
  {
    source: "youtube-russian-progress",
    hoursAgo: 20,
    title: "Выходные в деревне: влог для изучающих русский",
    summary: "Короткий влог о поездке за город: простая речь, субтитры и бытовая лексика.",
  },
  {
    source: "global-voices-it",
    hoursAgo: 5,
    title: "Le lingue minoritarie trovano spazio sui social",
    summary: "Da TikTok ai podcast, giovani creatori usano dialetti e lingue regionali per raccontare la vita quotidiana.",
  },
  {
    source: "internazionale",
    hoursAgo: 14,
    title: "Il ritorno dei treni notturni in Europa",
    summary: "Più passeggeri, nuove linee e qualche difficoltà: perché i viaggi in cuccetta tornano di moda.",
  },
  {
    source: "rsi",
    hoursAgo: 26,
    title: "Ghiacciai alpini, un’estate da record",
    summary: "I dati delle stazioni di misura confermano una perdita di volume superiore alla media degli ultimi dieci anni.",
  },
];

export function buildMockContents(now: Date): ContentListItem[] {
  const sources = new Map(buildMockSources().map((s) => [s.key, s]));
  return DEMO_ITEMS.map((item, index) => {
    const source = sources.get(item.source);
    const definition = SOURCE_CATALOG.find((s) => s.key === item.source);
    if (!source || !definition) throw new Error(`source de démo inconnue : ${item.source}`);
    return {
      id: `demo-content-${index + 1}`,
      language: source.language,
      type: source.contentType,
      title: item.title,
      url: source.homepage,
      difficulty: definition.difficulty,
      durationMinutes: item.minutes ?? definition.defaultMinutes,
      summary: item.summary,
      publishedAt: new Date(now.getTime() - item.hoursAgo * 3_600_000).toISOString(),
      source: {
        key: source.key,
        name: source.name,
        homepage: source.homepage,
        access: source.access,
        license: source.license,
      },
    };
  });
}
