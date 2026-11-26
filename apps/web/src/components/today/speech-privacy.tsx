"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { markSpeechPrivacySeen, speechPrivacySeen } from "@/lib/speech/privacy";

/**
 * The note on where the voice goes, shown once on this device before the first listening. `ask(begin)` runs `begin` at
 * once when the note was already read, else after the learner understood it; `sheet` goes anywhere in the screen.
 */
export function useSpeechPrivacy(): { ask(begin: () => void): void; sheet: ReactNode } {
  const t = useTranslations("oral.privacySheet");
  const [pending, setPending] = useState<(() => void) | null>(null);
  return {
    ask(begin) {
      if (speechPrivacySeen()) begin();
      else setPending(() => begin);
    },
    sheet: pending && (
      <BottomSheet labelledBy="speech-privacy-title" onClose={() => setPending(null)}>
        <h2 id="speech-privacy-title" data-sheet-title tabIndex={-1} className="font-display text-[22px] leading-tight font-bold">{t("title")}</h2>
        <p className="mt-2 text-muted">{t("body")}</p>
        <div className="mt-5">
          <Button onClick={() => {
            markSpeechPrivacySeen();
            setPending(null);
            pending();
          }}>{t("ok")}</Button>
        </div>
      </BottomSheet>
    ),
  };
}
