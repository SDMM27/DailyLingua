"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/app/actions/auth";
import { Card, Eyebrow } from "@/components/ui/primitives";

/** Irreversible: the user has to type their e-mail address before the button works. */
export function DeleteAccount({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(deleteAccount, {});
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <Card className="mt-6">
      <Eyebrow>Supprimer mon compte</Eyebrow>
      {!open ? (
        <>
          <p className="mt-2 text-sm text-ink-soft">
            Efface définitivement ton compte et toutes tes données : langues, vocabulaire, révisions,
            progression et historique.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 rounded-full border border-danger/40 px-4 py-2 text-sm font-semibold text-danger"
          >
            Supprimer mon compte…
          </button>
        </>
      ) : (
        <form action={action} className="mt-3 space-y-3">
          <p className="text-sm text-ink-soft">
            Cette action est <strong>irréversible</strong>. Pour confirmer, saisis <strong>{email}</strong>.
          </p>
          <input
            name="confirmation"
            type="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="Ton adresse e-mail pour confirmer"
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base focus:border-ink-soft focus:outline-none"
          />
          <div aria-live="polite">
            {state.error && (
              <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
                {state.error}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
              className="flex-1 rounded-2xl border border-line py-3 font-semibold text-ink-soft"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!matches || pending}
              className="flex-1 rounded-2xl bg-danger py-3 font-semibold text-paper disabled:opacity-40"
            >
              {pending ? "Suppression…" : "Supprimer définitivement"}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
