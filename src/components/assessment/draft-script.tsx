/**
 * The script of a listening test that has no recording yet, for local work only (see `listeningMode`
 * in src/lib/assessment/policy.ts). A learner must never get the script of a recorded dossier.
 */
export function DraftScript({ script }: { script: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p role="note" className="rounded-2xl bg-ochre-soft px-4 py-3 text-sm font-semibold text-ochre">
        Brouillon : pas encore enregistré
      </p>
      <p className="whitespace-pre-line text-base leading-relaxed text-ink">{script}</p>
    </div>
  );
}
