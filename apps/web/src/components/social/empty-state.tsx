import type { ReactNode } from "react";

/** One screen state: a quiet mark, a title, a sentence and (at most) one button. */
export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="space-y-5 px-2 py-10 text-center">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto text-border-strong" aria-hidden="true">
        <circle cx="36" cy="36" r="28" />
        <circle cx="36" cy="36" r="14" strokeDasharray="3 5" />
      </svg>
      <h2 className="sd-display text-2xl">{title}</h2>
      <p className="text-muted">{body}</p>
      {children && <div className="space-y-3">{children}</div>}
    </div>
  );
}
