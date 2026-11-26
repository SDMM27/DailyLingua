"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/unit/icons";

/** Playback rate of the « Lent » toggle, as in the dialogue of a unit. */
export const SLOW_RATE = 0.7;

/** The « Lent » pill: pressed, the sentence plays at 0,7×. */
export function SlowToggle({ slow, onToggle }: { slow: boolean; onToggle(): void }) {
  const t = useTranslations("oral.repeat");
  const rate = slow ? "0,7×" : "1×";
  return (
    <button
      type="button"
      aria-pressed={slow}
      onClick={onToggle}
      className={`grid min-h-12 min-w-14 justify-items-center rounded-xl px-1 text-xs font-semibold ${slow ? "bg-accent-soft text-accent-strong" : "text-muted"}`}
    >
      <span className="font-mono text-[13px] leading-[22px] text-ink">{rate}</span>
      {t("slow")}
    </button>
  );
}

/** The round speaker that plays the sentence again; it stays visible, and says so, when the audio is not available. */
export function ReplayButton({ label, size = 52, disabled, onClick }: { label: string; size?: 52 | 60; disabled?: boolean; onClick(): void }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      onClick={() => { if (!disabled) onClick(); }}
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center rounded-full text-accent-strong shadow-[inset_0_0_0_1.5px_var(--sd-border-strong)] ${disabled ? "opacity-60" : ""}`}
    >
      <Icon name="speaker" />
    </button>
  );
}

/** The chip that says a self-rating earns nothing. */
export function DeclaredChip() {
  const t = useTranslations("oral");
  return <span className="inline-flex min-h-7 items-center rounded-full border border-dashed border-border-strong px-3 text-[13px] text-muted">{t("declared")}</span>;
}
