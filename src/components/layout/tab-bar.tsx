"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, hidesNavigation, isActive } from "./nav-items";

/** Bottom navigation on phones, sits above the iOS home indicator. */
export function TabBar() {
  const pathname = usePathname();
  if (hidesNavigation(pathname)) return null;
  return (
    <nav
      aria-label="Navigation principale"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-ink bg-paper/95 backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-accent-strong before:absolute before:inset-x-3 before:top-0 before:h-[3px] before:bg-accent"
                    : "text-muted"
                }`}
              >
                <Icon width={22} height={22} strokeWidth={active ? 2 : 1.7} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
