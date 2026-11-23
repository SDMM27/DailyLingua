import type { ReactNode } from "react";

const PATHS = {
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" strokeWidth="3" />,
  prev: <path d="M18 6l-8 6 8 6zM6 6v12" />,
  next: <path d="M6 6l8 6-8 6zM18 6v12" />,
  speaker: <><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth="2.2" />,
  repeat: <path d="M4 12a7 7 0 0 1 12-5l3 3M20 12a7 7 0 0 1-12 5l-3-3M19 5v5h-5M5 19v-5h5" />,
  chevron: <path d="M9.5 6l6 6-6 6" />,
  strike: <path d="M4 13c3-1.5 5-1.6 8-.6s5 .9 8-.8" />,
  test: <><path d="M6 3.5h9l3 3v14H6z" /><path d="M9 11l2 2 4-4M9 17h6" /></>,
  ring: <circle cx="12" cy="12" r="6.5" />,
  translate: <><path d="M4 5h9M8.5 3v2M6 5c.5 3 2.5 5.5 5 6.5M11 5c-.5 3-2.5 6-6 7.5" /><path d="M13 20l4-9 4 9M14.5 17h5" /></>,
  xp: <path d="M12 3c.9 4.6 2.6 6.3 8 9-5.4 2.7-7.1 4.4-8 9-.9-4.6-2.6-6.3-8-9 5.4-2.7 7.1-4.4 8-9z" fill="currentColor" stroke="none" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

/** Decorative icon (always hidden from assistive technology: the button around it carries the name). */
export function Icon({ name, className = "size-6" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
