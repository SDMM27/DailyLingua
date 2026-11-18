import { ALPHABET_SCRIPT_NAMES } from "@/lib/domain/alphabet";
import type { AlphabetScript } from "@/lib/schemas/alphabet";
import type { Language } from "@/lib/schemas/common";
import { Brief } from "./brief";

/** Compact link to an alphabet: the groups of letters to review today, or an invitation to learn to read. */
export function AlphabetPreview({
  dueCount,
  language,
  script,
}: {
  dueCount: number;
  language: Language;
  script: AlphabetScript;
}) {
  return (
    <Brief
      href={`/alphabet?langue=${language}`}
      rubric="Alphabet"
      title={
        dueCount > 0
          ? `${dueCount} groupe${dueCount > 1 ? "s" : ""} de lettres à revoir`
          : `Apprendre à lire ${ALPHABET_SCRIPT_NAMES[script]}`
      }
      hint="Quelques lettres à la fois, avec des mots à lire et à écouter."
    />
  );
}
