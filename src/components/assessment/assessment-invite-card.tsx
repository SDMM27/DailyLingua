"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { Eyebrow } from "@/components/ui/primitives";
import { inviteVisible, type AssessmentInviteKind } from "@/lib/domain/assessment";
import { languageInfo } from "@/lib/domain/languages";
import type { DateKey, Language } from "@/lib/schemas/common";

const subscribe = () => () => {};

/** One key per language and kind: dismissing the first invitation does not hide the redo one. */
const storageKey = (kind: AssessmentInviteKind, language: Language) => `dl-assessment-invite-${kind}-${language}`;

interface Dismissal {
  dismissedOn: DateKey | null;
  dismissCount: number;
}

/** What the browser remembers; anything unreadable (no storage, garbled value) means never dismissed. */
function readDismissal(key: string): Dismissal {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { dismissedOn: null, dismissCount: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const { on, count } = parsed as { on?: unknown; count?: unknown };
      if (typeof on === "string" && typeof count === "number" && Number.isInteger(count) && count > 0) {
        return { dismissedOn: on, dismissCount: count };
      }
    }
  } catch {}
  return { dismissedOn: null, dismissCount: 0 };
}

/**
 * Home card that invites the learner to the full assessment of a language ("first": the placement
 * test is done and no assessment yet; "redo": the last one is old). Dismissable: the dismissals are
 * kept in the browser (`inviteVisible` decides when it comes back), and without storage it simply
 * shows until closed. Nothing is drawn on the server, so there is no mismatch at hydration.
 */
export function AssessmentInviteCard({ language, kind, today }: { language: Language; kind: AssessmentInviteKind; today: DateKey }) {
  const key = storageKey(kind, language);
  const visible = useSyncExternalStore(
    subscribe,
    () => inviteVisible({ ...readDismissal(key), today }),
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);
  if (!visible || dismissed) return null;

  const name = languageInfo(language).nameFr.toLowerCase();
  function dismiss() {
    const { dismissCount } = readDismissal(key);
    try {
      localStorage.setItem(key, JSON.stringify({ on: today, count: dismissCount + 1 }));
    } catch {}
    setDismissed(true);
  }

  return (
    <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-5 py-4">
      <Link href={`/niveau/${language}/bilan`} className="min-w-0 flex-1">
        <Eyebrow>Niveau</Eyebrow>
        <span className="mt-1 flex items-center gap-1 font-semibold">
          {kind === "first" ? "Faire mon bilan complet" : "Refais ton bilan"}
          <ArrowRightIcon width={14} height={14} />
        </span>
        <span className="text-xs text-muted">
          {kind === "first"
            ? `Un test par compétence en ${name}, 20 à 25 minutes, quand tu veux.`
            : `Ça fait un moment : vois ce qui a progressé en ${name}.`}
        </span>
      </Link>
      <button
        type="button"
        aria-label="Masquer"
        className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-xl text-muted hover:bg-surface-sunk"
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}
