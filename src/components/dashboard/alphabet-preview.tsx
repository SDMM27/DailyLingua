import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Eyebrow } from "@/components/ui/primitives";
import { ALPHABET_SCRIPT_NAMES } from "@/lib/domain/alphabet";
import type { AlphabetScript } from "@/lib/schemas/alphabet";
import type { Language } from "@/lib/schemas/common";

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
    <Link
      href={`/alphabet?langue=${language}`}
      className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-4 transition-colors hover:bg-surface-sunk"
    >
      <span className="min-w-0 flex-1">
        <Eyebrow>Alphabet</Eyebrow>
        <span className="mt-1 block font-semibold">
          {dueCount > 0
            ? `${dueCount} groupe${dueCount > 1 ? "s" : ""} de lettres à revoir`
            : `Apprendre à lire le ${ALPHABET_SCRIPT_NAMES[script]}`}
        </span>
        <span className="text-xs text-muted">Quelques lettres à la fois, avec des mots à lire et à écouter.</span>
      </span>
      <ArrowRightIcon width={16} height={16} className="text-muted" />
    </Link>
  );
}
