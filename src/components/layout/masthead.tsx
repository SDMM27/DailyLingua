"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { LANGUAGE_CODES } from "@/lib/domain/languages";
import { NAV_ITEMS, hidesNavigation, isActive } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

const noop = () => () => {};

/** Today's date in the reader's own time zone; empty on the server so it never freezes at build time. */
function useDateline(): string {
  return useSyncExternalStore(
    noop,
    () =>
      new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    () => "",
  );
}

/**
 * Newspaper masthead: dateline and theme switch, the title between rules, and the rubrics (tablet and
 * desktop; phones use the tab bar). Full size on the front page, compact elsewhere.
 */
export function Masthead() {
  const pathname = usePathname();
  const dateline = useDateline();
  const showNav = !hidesNavigation(pathname);
  const front = pathname === "/" || pathname === "/decouvrir";

  return (
    <header className="pt-safe">
      <div className="page-x">
        <div className="flex items-center justify-between gap-3 py-2">
          <p className="kicker min-w-0 truncate text-muted" suppressHydrationWarning>
            {dateline}
          </p>
          <ThemeToggle />
        </div>

        <div className={`border-t-[3px] border-b border-ink text-center ${front ? "pt-4 pb-3 sm:pt-5" : "py-2.5 sm:py-3"}`}>
          <Link
            href="/"
            className={`sd-display sd-ink inline-block leading-[0.95] font-extrabold tracking-[-0.03em] ${
              front ? "text-[clamp(2.75rem,9vw,7rem)]" : "text-[clamp(2rem,5vw,2.75rem)]"
            }`}
          >
            Daily Lingua
          </Link>
          {front && (
            <p className="kicker mt-2 tracking-[0.18em] text-muted">
              Édition du matin · {LANGUAGE_CODES.length} langues · contenus authentiques
            </p>
          )}
        </div>

        {showNav ? (
          <nav aria-label="Navigation principale" className="rule-double hidden md:block">
            <ul className="flex flex-wrap justify-center gap-1 py-1">
              {NAV_ITEMS.map(({ href, label }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center px-3.5 font-serif text-[17px] transition-colors ${
                        active ? "font-bold text-accent-strong italic" : "text-ink hover:text-accent-strong"
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : (
          <div className="rule-double pt-1" aria-hidden="true" />
        )}
        {/* Phones: the rubrics live in the bottom tab bar, a double rule still closes the masthead. */}
        {showNav && <div className="rule-double pt-1 md:hidden" aria-hidden="true" />}
      </div>
    </header>
  );
}
