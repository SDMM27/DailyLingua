"use client";

import type { CoopOverview, Friend, LeagueSummary } from "@dailylingua/data";
import { useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent } from "react";
import { CoopPanel } from "./coop-panel";
import { FriendsPanel } from "./friends-panel";
import { LeaguePanel } from "./league-panel";
import { Onboarding } from "./onboarding";

export const SOCIAL_TABS = ["league", "friends", "coop"] as const;
export type SocialTab = (typeof SOCIAL_TABS)[number];

/** The social screen: onboarding until a pseudonym exists, then three tabs (an ARIA tablist; `?tab=` follows the choice). */
export function SocialScreen({ pseudonym, leagueEnabled, friendsEnabled, league, friends, coop, languageNames, initialTab }: {
  pseudonym: string | null;
  leagueEnabled: boolean;
  friendsEnabled: boolean;
  league: LeagueSummary;
  friends: Friend[];
  coop: CoopOverview;
  languageNames: Record<string, string>;
  initialTab: SocialTab;
}) {
  const t = useTranslations("social");
  const [tab, setTab] = useState<SocialTab>(initialTab);
  const refs = useRef<Record<SocialTab, HTMLButtonElement | null>>({ league: null, friends: null, coop: null });

  if (!pseudonym) return <Onboarding />;

  function select(next: SocialTab, focus = false) {
    setTab(next);
    try {
      window.history.replaceState(null, "", `?tab=${next}`);
    } catch {
      // The address bar is a convenience; the tab still changes.
    }
    if (focus) refs.current[next]?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    const index = SOCIAL_TABS.indexOf(tab);
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step !== 0) {
      event.preventDefault();
      select(SOCIAL_TABS[(index + step + SOCIAL_TABS.length) % SOCIAL_TABS.length]!, true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      select(event.key === "Home" ? SOCIAL_TABS[0] : SOCIAL_TABS[SOCIAL_TABS.length - 1]!, true);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="sd-display text-3xl">{t("title")}</h1>
        <p className="meta mt-1">{t("pseudonymLine", { pseudonym })}</p>
      </header>
      <div role="tablist" aria-label={t("tabsLabel")} onKeyDown={onKeyDown} className="flex gap-1 rounded-full bg-accent-soft p-1">
        {SOCIAL_TABS.map((key) => (
          <button key={key} ref={(element) => { refs.current[key] = element; }} type="button" role="tab" id={`social-tab-${key}`} aria-selected={tab === key}
            aria-controls="social-panel" tabIndex={tab === key ? 0 : -1} onClick={() => select(key)}
            className={`min-h-11 flex-1 rounded-full px-2 text-sm font-semibold ${tab === key ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>
      <section role="tabpanel" id="social-panel" aria-labelledby={`social-tab-${tab}`} className="min-h-[360px]">
        {tab === "league" && <LeaguePanel enabled={leagueEnabled} summary={league} />}
        {tab === "friends" && <FriendsPanel enabled={friendsEnabled} friends={friends} languageNames={languageNames} />}
        {tab === "coop" && <CoopPanel friendsEnabled={friendsEnabled} friends={friends} coop={coop} onGoFriends={() => select("friends")} />}
      </section>
    </div>
  );
}
