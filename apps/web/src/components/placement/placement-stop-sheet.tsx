"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

/** Confirms leaving the test: no partial result is kept, the test restarts from the beginning next time. */
export function PlacementStopSheet({ onStop, onContinue }: { onStop(): void; onContinue(): void }) {
  const t = useTranslations("placement.stop");
  const titleId = useId();
  return (
    <BottomSheet labelledBy={titleId} onClose={onContinue}>
      <h2 id={titleId} data-sheet-title tabIndex={-1} className="font-display text-2xl font-medium outline-none">{t("title")}</h2>
      <p className="mt-2 mb-6 text-muted">{t("body")}</p>
      <Button onClick={onContinue}>{t("continue")}</Button>
      <Button variant="ghost" onClick={onStop} className="mt-1 w-full">{t("confirm")}</Button>
    </BottomSheet>
  );
}
