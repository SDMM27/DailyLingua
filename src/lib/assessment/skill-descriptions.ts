import type { CefrLevel } from "@/lib/schemas/common";

export type AssessmentSkill = "reading" | "listening" | "writing" | "speaking";

/** The skills in the order of the profile. */
export const ASSESSMENT_SKILLS: AssessmentSkill[] = ["reading", "listening", "writing", "speaking"];

export const SKILL_NAMES: Record<AssessmentSkill, string> = {
  reading: "Comprendre un texte",
  listening: "Comprendre à l’oral",
  writing: "Écrire",
  speaking: "Parler",
};

/**
 * What a learner at each level can do, in everyday French: one sentence per skill and level. No
 * language is named, so the same sentences serve every language; the CEFR level is shown next to
 * them, in small.
 */
export const SKILL_DESCRIPTIONS: Record<AssessmentSkill, Record<CefrLevel, string>> = {
  reading: {
    A1: "Tu comprends des mots familiers et des phrases très simples, comme sur une affiche ou dans un message court.",
    A2: "Tu lis des textes courts et simples sur des sujets de la vie de tous les jours.",
    B1: "Tu suis l’essentiel d’un article sur un sujet courant.",
    B2: "Tu lis des articles et des reportages sur des sujets variés, et tu en saisis les arguments.",
    C1: "Tu lis sans effort des textes longs et exigeants, et tu en perçois les sous-entendus.",
    C2: "Tu comprends presque tout ce que tu lis, même un texte abstrait ou très spécialisé.",
  },
  listening: {
    A1: "Tu reconnais des mots et des phrases très simples quand on parle lentement et distinctement.",
    A2: "Tu comprends l’essentiel d’un message court et clair sur un sujet de tous les jours.",
    B1: "Tu saisis les idées principales si l’on parle clairement d’un sujet familier.",
    B2: "Tu suis un exposé ou un débat sur un sujet courant, même à un rythme naturel.",
    C1: "Tu comprends un long discours, même peu structuré, sans trop d’effort.",
    C2: "Tu comprends n’importe quel propos, même rapide et familier.",
  },
  writing: {
    A1: "Tu écris des phrases très courtes pour te présenter ou remplir une fiche.",
    A2: "Tu racontes et donnes ton avis en phrases simples reliées.",
    B1: "Tu écris un texte simple et cohérent sur des sujets familiers, et tu décris ce que tu as vécu.",
    B2: "Tu écris un texte clair et détaillé, et tu défends un point de vue avec des arguments.",
    C1: "Tu écris un texte structuré et nuancé sur un sujet complexe, avec un style adapté.",
    C2: "Tu écris avec précision et aisance, dans un style adapté à chaque situation.",
  },
  speaking: {
    A1: "Tu te présentes et tu poses des questions simples, avec des phrases très courtes.",
    A2: "Tu te débrouilles dans les situations courantes : commander, demander ton chemin, acheter.",
    B1: "Tu racontes un événement et tu tiens une conversation sur un sujet familier.",
    B2: "Tu discutes avec un natif sans effort et tu défends ton opinion.",
    C1: "Tu t’exprimes avec fluidité et nuance, sur des sujets complexes.",
    C2: "Tu t’exprimes avec précision, finesse et humour, dans toutes les situations.",
  },
};
