"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, hidesNavigation, isActive } from "./nav-items";

/** Header navigation on tablet / desktop widths; hidden on phones in favour of the tab bar. */
export function TopBar() {
  const pathname = usePathname();
  if (hidesNavigation(pathname)) return null;
  return (
    <header className="sticky top-0 z-30 hidden border-b border-line bg-paper/85 backdrop-blur-xl md:block">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-serif text-lg font-semibold tracking-tight">
          Daily Lingua
        </Link>
        <nav aria-label="Navigation principale">
          <ul className="flex gap-1">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                      active ? "bg-ink text-paper" : "text-ink-soft hover:bg-surface-sunk"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
