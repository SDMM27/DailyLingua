"use client";

import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex='-1'])";

/**
 * A sheet that rises from the bottom edge, with the double rule of the design on top.
 * - `modal` (default): a dialog over a scrim. Focus goes to the title (`[data-sheet-title]`) on open, Tab stays inside,
 *   Escape and the scrim close it, and focus goes back to where it was.
 * - not modal: a status region over the screen (the feedback of an exercise); the caller makes the rest inert.
 * `tone="calm"` has no colour fill: the verdict is written, never only coloured.
 */
export function BottomSheet({ labelledBy, modal = true, tone = "rule", onClose, children }: {
  labelledBy: string;
  modal?: boolean;
  tone?: "rule" | "calm";
  onClose?(): void;
  children: ReactNode;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const element = sheet.current;
    if (!element) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.querySelector<HTMLElement>("[data-sheet-title]")?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  function onKeyDown(event: React.KeyboardEvent) {
    if (!modal) return;
    if (event.key === "Escape" && close.current) {
      event.stopPropagation();
      close.current();
      return;
    }
    if (event.key !== "Tab" || !sheet.current) return;
    const focusable = [...sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === sheet.current || active?.hasAttribute("data-sheet-title"))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      {modal && <div aria-hidden="true" className="fixed inset-0 z-40 bg-scrim" onClick={onClose} />}
      <div
        ref={sheet}
        role={modal ? "dialog" : "status"}
        aria-modal={modal ? true : undefined}
        aria-labelledby={labelledBy}
        onKeyDown={onKeyDown}
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-sheet border-t-[3px] border-double border-ink bg-surface px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${tone === "rule" ? "shadow-2xl" : "shadow-lg"} motion-safe:animate-[sheet-in_180ms_ease-out] motion-reduce:animate-[sheet-fade_100ms_linear]`}
      >
        {modal && <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-9 rounded-full bg-border-strong" />}
        {children}
      </div>
    </>
  );
}
