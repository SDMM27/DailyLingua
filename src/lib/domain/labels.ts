import type { ContentType } from "@/lib/schemas/common";
import type { ActivityKind } from "@/lib/schemas/mission";
import type { DifficultyMode } from "@/lib/schemas/preferences";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  article: "Article",
  podcast: "Podcast",
  video: "Vidéo",
  interview: "Interview",
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
