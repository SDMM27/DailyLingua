import type { CefrLevel } from "@/lib/schemas/common";

/**
 * Statements of the declared speaking level, from the easiest to the hardest: the learner ticks
 * those that are true, and `decideSpeaking` takes the highest level reached without a gap. Written
 * for Daily Lingua in the spirit of the CEFR descriptors, not copied from them. No language is
 * named: the same list serves every language.
 */
export interface SpeakingClaim {
  id: string;
  level: CefrLevel;
  text: string;
}

export const SPEAKING_CLAIMS: SpeakingClaim[] = [
  { id: "s1", level: "A1", text: "Je peux me présenter et répondre à des questions simples sur moi, avec des phrases très courtes." },
  { id: "s2", level: "A2", text: "Je peux commander, demander mon chemin ou acheter quelque chose dans une situation courante." },
  { id: "s3", level: "B1", text: "Je peux raconter un événement passé ou un projet, et expliquer brièvement pourquoi." },
  { id: "s4", level: "B1", text: "Je peux me débrouiller dans une conversation sur un sujet familier, même si je cherche parfois mes mots." },
  { id: "s5", level: "B2", text: "Je peux discuter avec un natif sans effort pour lui comme pour moi, et défendre mon opinion avec des arguments." },
  { id: "s6", level: "B2", text: "Je peux suivre une conversation animée entre plusieurs natifs et y prendre part." },
  { id: "s7", level: "C1", text: "Je peux m’exprimer de façon fluide et nuancée, sur des sujets complexes, sans chercher mes mots de façon visible." },
  { id: "s8", level: "C2", text: "Je peux m’exprimer comme un natif cultivé, avec précision, humour et finesse, dans n’importe quelle situation." },
];
