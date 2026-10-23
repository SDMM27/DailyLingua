import type { SourceAccess } from "@/lib/schemas/content";
import type { ContentType } from "@/lib/schemas/common";
import type { ActivityKind } from "@/lib/schemas/mission";
import type { PlacementConfidence } from "@/lib/schemas/placement";
import type { DifficultyMode, LanguagePurpose } from "@/lib/schemas/preferences";
import type { ReviewMode } from "@/lib/schemas/vocabulary";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  article: "Article",
  podcast: "Podcast",
  video: "Vidéo",
  interview: "Interview",
};

export const SOURCE_ACCESS_LABELS: Record<SourceAccess, string> = {
  free: "gratuit",
  metered: "accès limité",
  paywalled: "payant",
};

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  reading: "Lecture",
  listening: "Écoute",
  watching: "Visionnage",
  comprehension: "Compréhension",
  vocabulary: "Expressions",
  writing: "Production écrite",
  speaking: "Production orale",
};

export const DIFFICULTY_LABELS: Record<DifficultyMode, { title: string; hint: string }> = {
  comfortable: { title: "Confort", hint: "Un cran sous ton niveau, pour lire vite" },
  matched: { title: "Adaptée", hint: "À ton niveau actuel" },
  challenge: { title: "Défi", hint: "Un cran au-dessus, pour progresser" },
};

export const LANGUAGE_PURPOSE_LABELS: Record<LanguagePurpose, { title: string; hint: string }> = {
  general: { title: "Général", hint: "Un peu de tout" },
  conversational: { title: "Conversation", hint: "Parler au quotidien, registre familier" },
  professional: { title: "Professionnel", hint: "Réunions, e-mails, registre soutenu" },
  travel: { title: "Voyage", hint: "Situations pratiques sur place" },
  exam: { title: "Examen", hint: "Préparer une certification" },
};

export const PLACEMENT_CONFIDENCE_LABELS: Record<PlacementConfidence, { title: string; hint: string }> = {
  low: { title: "faible", hint: "Tes réponses hésitent autour de ce niveau : prends-le comme une indication." },
  medium: { title: "moyenne", hint: "Tes réponses balancent un peu entre deux niveaux voisins." },
  high: { title: "élevée", hint: "Tes réponses sont nettes de part et d’autre de ce niveau." },
};

export const REVIEW_MODE_LABELS: Record<ReviewMode, string> = {
  flip: "Cartes",
  translate: "Traduire",
  produce: "Écrire le mot",
  listen: "Écouter",
  cloze: "Phrase à trou",
};
