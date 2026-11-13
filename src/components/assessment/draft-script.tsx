/**
 * The script of a listening test that has no recording yet, for local work only (see `listeningMode`
 * in src/lib/assessment/policy.ts). A learner must never get the script of a recorded dossier.
 */
export function DraftScript({ script }: { script: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p role="note" className="kicker border-y border-dashed border-line py-2 text-muted">
        Brouillon : pas encore enregistré
      </p>
      <p className="whitespace-pre-line font-serif text-lg leading-relaxed text-ink">{script}</p>
    </div>
  );
}
