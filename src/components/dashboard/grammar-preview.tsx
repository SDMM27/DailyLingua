import type { Language } from "@/lib/schemas/common";
import { Brief } from "./brief";

/** Compact link to the grammar points: the ones to review today, or an invitation to start. */
export function GrammarPreview({ dueCount, language }: { dueCount: number; language: Language }) {
  return (
    <Brief
      href={`/grammaire?langue=${language}`}
      rubric="Grammaire"
      title={dueCount > 0 ? `${dueCount} fiche${dueCount > 1 ? "s" : ""} à revoir` : "Des fiches de ton niveau t’attendent"}
      hint="Une règle, quelques exercices, puis une révision espacée."
    />
  );
}
