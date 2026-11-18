"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const TABS = [
  { href: "/", key: "today", icon: "M5 4h11l3 3v13H5zM9 10h6M9 14h6M9 18h4" },
  {
    href: "/settings",
    key: "settings",
    icon: "M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6",
  },
] as const;

/** Bottom navigation of the signed-in screens: two tabs, 44 px at least, clear of the home indicator. */
export function TabBar() {
  const t = useTranslations("common.nav");
  const pathname = usePathname();
  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, key, icon }) => {
          const current = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-semibold ${current ? "text-accent-strong" : "text-muted"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={icon} />
                </svg>
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
