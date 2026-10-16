"use client";

import { useState } from "react";
import { setSourceAccess } from "@/app/actions/preferences";
import { LanguageTag } from "@/components/ui/primitives";
import { SOURCE_ACCESS_LABELS } from "@/lib/domain/labels";
import type { PaidSource } from "@/lib/schemas/content";

/**
 * « J'y ai accès » for each paid source of the user's languages. Each tick is saved at once; the
 * box changes immediately and goes back, with a message, if the save fails. Hidden when there is
 * no paid source. Only a claim is recorded: no publisher account or credential is ever asked.
 */
export function SourceAccessList({ sources, readOnly }: { sources: PaidSource[]; readOnly: boolean }) {
  const [declared, setDeclared] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sources.map((s) => [s.id, s.declared])),
  );
  const [error, setError] = useState<string | null>(null);

  if (sources.length === 0) return null;

  async function toggle(sourceId: string, hasAccess: boolean) {
    setError(null);
    setDeclared((current) => ({ ...current, [sourceId]: hasAccess }));
    let message: string | null = null;
    try {
      const result = await setSourceAccess({ sourceId, hasAccess });
      if (!result.ok) message = result.error;
    } catch {
      message = "Une erreur est survenue. Réessaie dans un instant.";
    }
    if (message !== null) {
      setDeclared((current) => ({ ...current, [sourceId]: !hasAccess }));
      setError(message);
    }
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {sources.map((source) => (
          <li key={source.id}>
            <label className="flex min-h-11 items-center gap-3 py-2">
              <input
                type="checkbox"
                checked={declared[source.id] ?? false}
                disabled={readOnly}
                onChange={(event) => toggle(source.id, event.target.checked)}
                className="size-5 shrink-0 accent-ink"
                aria-label={`J’y ai accès : ${source.name}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold">{source.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <LanguageTag language={source.language} />
                  {SOURCE_ACCESS_LABELS[source.access]}
                </span>
              </span>
              <span className="shrink-0 text-base text-ink-soft">J’y ai accès</span>
            </label>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
