"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowRightIcon, PhoneIcon } from "@/components/icons";

const DISMISS_KEY = "dl-install-dismissed";

const subscribe = () => () => {};

/** True on an iPhone/iPod browsing in a tab, i.e. not already launched from the home screen. */
function canInstallOnIphone(): boolean {
  const ua = navigator.userAgent;
  const isIphone = /iPhone|iPod/.test(ua);
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  if (!isIphone || standalone) return false;
  try {
    return localStorage.getItem(DISMISS_KEY) === null;
  } catch {
    return true;
  }
}

/** Dashboard hint pointing iPhone visitors to the "add to home screen" tutorial. */
export function InstallBanner() {
  // Server snapshot is false, so nothing renders until hydration: no mismatch.
  const eligible = useSyncExternalStore(subscribe, canInstallOnIphone, () => false);
  const [dismissed, setDismissed] = useState(false);
  if (!eligible || dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-3">
      <PhoneIcon className="shrink-0 text-ink-soft" />
      <Link href="/installer" className="min-w-0 flex-1">
        <span className="flex items-center gap-1 font-semibold">
          Ajouter à l’écran d’accueil
          <ArrowRightIcon width={14} height={14} />
        </span>
        <span className="text-xs text-muted">Ouvre Daily Lingua comme une vraie app</span>
      </Link>
      <button
        type="button"
        aria-label="Masquer"
        className="-mr-1 flex size-10 shrink-0 items-center justify-center rounded-full text-xl text-muted hover:bg-surface-sunk"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {}
          setDismissed(true);
        }}
      >
        ×
      </button>
    </div>
  );
}
