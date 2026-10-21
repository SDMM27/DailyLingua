import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Eyebrow } from "@/components/ui/primitives";
import type { Language } from "@/lib/schemas/common";

/** Compact link to the grammar points: the ones to review today, or an invitation to start. */
export function GrammarPreview({ dueCount, language }: { dueCount: number; language: Language }) {
  return (
    <Link
      href={`/grammaire?langue=${language}`}
      className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-4 transition-colors hover:bg-surface-sunk"
    >
      <span className="min-w-0 flex-1">
        <Eyebrow>Grammaire</Eyebrow>
        <span className="mt-1 block font-semibold">
          {dueCount > 0 ? `${dueCount} fiche${dueCount > 1 ? "s" : ""} à revoir` : "Des fiches de ton niveau t’attendent"}
        </span>
        <span className="text-xs text-muted">Une règle, quelques exercices, puis une révision espacée.</span>
      </span>
      <ArrowRightIcon width={16} height={16} className="text-muted" />
    </Link>
  );
}
