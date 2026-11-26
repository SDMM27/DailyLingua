"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const PATH_ICON = "M12 3v5M12 16v5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z";

const TABS = [
  { href: "/", key: "today", icon: "M5 4h11l3 3v13H5zM9 10h6M9 14h6M9 18h4" },
  { href: "/library", key: "read", icon: "M4 5h5v14H4zM9 5h5v14H9zM15 6l4-1 4 13-4 1z" },
  {
    href: "/settings",
    key: "settings",
    icon: "M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6",
  },
] as const;

/**
 * Bottom navigation of the signed-in screens, clear of the home indicator. `pathLanguage` is the language of the beginner
 * path when the learner has one: the « Parcours » tab then comes second; the Progress tab is available to pilot learners.
 */
export function TabBar({ pathLanguage = null, hasProgress = false }: { pathLanguage?: string | null; hasProgress?: boolean }) {
  const t = useTranslations("common.nav");
  const pathname = usePathname();
  const tabs = [
    TABS[0],
    ...(pathLanguage ? [{ href: `/parcours/${pathLanguage}`, key: "path", icon: PATH_ICON } as const] : []),
    TABS[1],
    ...(hasProgress ? [{ href: "/progress", key: "progress", icon: "M4 19h16M7 15v-3M12 15V8M17 15V4" } as const] : []),
    TABS[2],
  ];
  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ href, key, icon }) => {
          const current = href === "/" ? pathname === "/" : pathname.startsWith(key === "path" ? "/parcours" : href);
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
