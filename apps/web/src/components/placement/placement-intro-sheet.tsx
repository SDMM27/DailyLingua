"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

/** What the test is, over the entry screen: about 10 minutes, at most 30 questions, can be stopped, "I don't know". */
export function PlacementIntroSheet({ onStart, onLater }: { onStart(): void; onLater(): void }) {
  const t = useTranslations("placement.intro");
  const titleId = useId();
  return (
    <BottomSheet labelledBy={titleId} onClose={onLater}>
      <h2 id={titleId} data-sheet-title tabIndex={-1} className="font-display text-3xl font-medium outline-none">{t("title")}</h2>
      <ul className="mt-4 mb-6 list-disc space-y-2.5 ps-5">
        <li>{t("duration")}</li>
        <li>{t("length")}</li>
        <li>{t("stop")}</li>
        <li>{t("unsure")}</li>
      </ul>
      <Button onClick={onStart}>{t("begin")}</Button>
      <Button variant="ghost" onClick={onLater} className="mt-1 w-full">{t("notNow")}</Button>
    </BottomSheet>
  );
}
