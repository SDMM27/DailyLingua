"use client";

import { useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./icons";

export interface UnitBarProps {
  /** Labels of the steps (six for a situation unit). */
  steps: string[];
  /** 1-based position of the current step. */
  position: number;
  /** Progress inside the current step, 0 to 1. */
  stepProgress: number;
  /** XP of the unit, estimated; hidden when null (XP hidden in the settings). */
  xp: number | null;
  offline: boolean;
  /** The name shown for the current position, when it is not `steps[position - 1]` (the workshop: several screens per item). */
  label?: string;
}

/**
 * The frame of every screen of a unit: a thin bar (close, the name of the step with its number, a hairline of progress,
 * the XP or the offline mark), a scrolling zone and an action footer. Full screen, without the tab bar. `bar` is absent
 * on the entry and result screens, which show only the close button (or nothing).
 */
export function UnitShell({ style, bar, onClose, closeLabel, children }: {
  style?: CSSProperties;
  bar?: UnitBarProps;
  onClose?(): void;
  closeLabel?: string;
  /** A `ShellBody` and, usually, a `ShellFooter`. */
  children: ReactNode;
}) {
  const t = useTranslations("unit");
  const session = useTranslations("dailySession");
  const total = bar?.steps.length ?? 0;
  const name = bar ? (bar.label ?? bar.steps[bar.position - 1] ?? "") : "";
  const fill = bar && total > 0 ? Math.min(1, Math.max(0, (bar.position - 1 + bar.stepProgress) / total)) : 0;
  return (
    <section data-unit style={style} className="fixed inset-0 z-20 bg-bg text-ink">
      <div className="mx-auto flex h-full w-full max-w-md flex-col">
        <header className="flex items-center gap-2 ps-2 pe-4 pt-[env(safe-area-inset-top)]">
          {onClose && (
            <button type="button" aria-label={closeLabel ?? t("pause")} onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full">
              <Icon name="close" />
            </button>
          )}
          {bar && (
            <>
              <div
                className="min-w-0 flex-1"
                role="progressbar"
                aria-label={name}
                aria-valuemin={1}
                aria-valuemax={total}
                aria-valuenow={bar.position}
                aria-valuetext={t("progress", { position: bar.position, total, name })}
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] leading-tight text-muted">
                  <b className="truncate font-semibold text-ink">{name}</b>
                  <span className="font-mono">{t("stepCount", { position: bar.position, total })}</span>
                </div>
                <div aria-hidden="true" className="h-[3px] overflow-hidden rounded-full bg-surface-2">
                  <i className="block h-full rounded-full bg-accent transition-[width] duration-base motion-reduce:transition-none" style={{ width: `${fill * 100}%` }} />
                </div>
              </div>
              <div className="min-w-14 text-end">
                {bar.offline ? (
                  <span className="meta" role="status">{session("offline")}</span>
                ) : bar.xp !== null ? (
                  <span role="img" className="inline-flex items-center gap-1 font-mono text-sm font-medium text-xp" aria-label={t("xpEstimate", { xp: bar.xp })}>
                    <Icon name="xp" className="size-3.5" />
                    <span aria-hidden="true">≈{bar.xp}</span>
                  </span>
                ) : null}
              </div>
            </>
          )}
        </header>
        {children}
      </div>
    </section>
  );
}

/** The scrolling zone of a screen of a unit. */
export function ShellBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-6">{children}</div>;
}

/** The action footer, clear of the home indicator. `relative`: a panel may float above it. */
export function ShellFooter({ children, className = "px-5 pt-3" }: { children: ReactNode; className?: string }) {
  return <footer className={`relative border-t border-line bg-surface pb-[calc(0.75rem+env(safe-area-inset-bottom))] ${className}`}>{children}</footer>;
}
