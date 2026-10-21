import type { CefrLevel } from "@/lib/schemas/common";

/**
 * The points each course must contain, in teaching order (checked by `checkGrammarCourse`).
 * Pilot (phase H1): Russian and Italian, A1 to B1, six points per level. Ids are stable: cards
 * point to them, so a point is never renamed, only added.
 */
export const GRAMMAR_CURRICULUM: Partial<Record<string, readonly { id: string; level: CefrLevel; topic: string }[]>> = {
  ru: [
    { id: "ru-a1-gender", level: "A1", topic: "Genre des noms (masculin, féminin, neutre) et он/она/оно" },
    { id: "ru-a1-present-first", level: "A1", topic: "Présent, 1re conjugaison (читать, делать, жить)" },
    { id: "ru-a1-present-second", level: "A1", topic: "Présent, 2e conjugaison (говорить, смотреть) et alternances (люблю)" },
    { id: "ru-a1-plural", level: "A1", topic: "Pluriel des noms au nominatif (règle des 7 lettres)" },
    { id: "ru-a1-prepositional", level: "A1", topic: "Prépositionnel du lieu : в / на + -е (où ?)" },
    { id: "ru-a1-possessives", level: "A1", topic: "Possessifs мой, твой, наш, ваш, его, её, их" },
    { id: "ru-a2-accusative", level: "A2", topic: "Accusatif : objet direct, animé et inanimé ; в / на + accusatif (où vas-tu ?)" },
    { id: "ru-a2-genitive", level: "A2", topic: "Génitif : у меня есть / нет, absence, possession, после de quantité (много, мало)" },
    { id: "ru-a2-past", level: "A2", topic: "Passé : -л, -ла, -ло, -ли, accord en genre" },
    { id: "ru-a2-motion", level: "A2", topic: "Verbes de mouvement : идти / ходить, ехать / ездить" },
    { id: "ru-a2-dative", level: "A2", topic: "Datif : мне нравится, l'âge (мне 20 лет), к + datif" },
    { id: "ru-a2-instrumental", level: "A2", topic: "Instrumental : с + instrumental, работать / быть / стать кем" },
    { id: "ru-b1-aspect", level: "B1", topic: "Aspect perfectif et imperfectif : processus, répétition, résultat" },
    { id: "ru-b1-future", level: "B1", topic: "Futur composé (буду + imperfectif) et futur simple (perfectif)" },
    { id: "ru-b1-imperative", level: "B1", topic: "Impératif : formation et choix de l'aspect" },
    { id: "ru-b1-numbers", level: "B1", topic: "Nombres et cas : 1 / 2-4 / 5+ (один стол, два стола, пять столов)" },
    { id: "ru-b1-relative", level: "B1", topic: "Pronom relatif который : genre, nombre, cas" },
    { id: "ru-b1-prefixed-motion", level: "B1", topic: "Verbes de mouvement préfixés : при-, у-, в-, вы-, пере-, за-" },
  ],
  it: [
    { id: "it-a1-articles", level: "A1", topic: "Articles définis et indéfinis (il, lo, la, l', un, uno, una, un')" },
    { id: "it-a1-nouns", level: "A1", topic: "Genre et pluriel des noms et adjectifs (-o/-i, -a/-e, -e/-i)" },
    { id: "it-a1-present", level: "A1", topic: "Présent des verbes réguliers en -are, -ere, -ire (dont -isc-)" },
    { id: "it-a1-essere-avere", level: "A1", topic: "Essere et avere, c'è / ci sono" },
    { id: "it-a1-prepositions", level: "A1", topic: "Prépositions simples et articulées (nel, sulla, dal...)" },
    { id: "it-a1-possessives", level: "A1", topic: "Possessifs avec article (il mio libro) et sans article pour la famille (mia madre)" },
    { id: "it-a2-passato-prossimo", level: "A2", topic: "Passato prossimo : choix de essere ou avere, accord du participe" },
    { id: "it-a2-reflexive", level: "A2", topic: "Verbes pronominaux (alzarsi, chiamarsi), au présent et au passé" },
    { id: "it-a2-imperfetto", level: "A2", topic: "Imperfetto et opposition avec le passato prossimo" },
    { id: "it-a2-direct-pronouns", level: "A2", topic: "Pronoms complément d'objet direct (lo, la, li, le) et accord au passé" },
    { id: "it-a2-piacere", level: "A2", topic: "Pronoms indirects et piacere (mi piace, mi piacciono)" },
    { id: "it-a2-futuro", level: "A2", topic: "Futur simple : formation, irréguliers, futur de probabilité" },
    { id: "it-b1-combined-pronouns", level: "B1", topic: "Pronoms combinés (me lo, glielo, te ne)" },
    { id: "it-b1-ci-ne", level: "B1", topic: "Particules ci et ne" },
    { id: "it-b1-condizionale", level: "B1", topic: "Conditionnel présent et passé : souhait, politesse, conseil" },
    { id: "it-b1-congiuntivo", level: "B1", topic: "Subjonctif présent après penso che, credo che, è importante che" },
    { id: "it-b1-relatives", level: "B1", topic: "Pronoms relatifs che, cui, il quale" },
    { id: "it-b1-imperativo", level: "B1", topic: "Impératif (tu, Lei, voi), avec pronoms (dimmi, fallo)" },
  ],
};
