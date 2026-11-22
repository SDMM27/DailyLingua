"use client";

import { languageDisplayName } from "@dailylingua/core";
import { loadMessages, type Messages } from "@dailylingua/i18n";
import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { EventSyncProvider } from "@/components/pwa/event-sync-provider";
import { TodaySession } from "@/components/today/today-session";
import { offlineAccountSnapshot, parseOfflineAccount, subscribeToOfflineAccount, type OfflineAccount } from "@/lib/offline/account";

const noAccountOnServer = () => null;

export function OfflineAccountPage({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeToOfflineAccount, offlineAccountSnapshot, noAccountOnServer);
  const [ready, setReady] = useState<{ snapshot: string; account: OfflineAccount; messages: Messages } | null>(null);

  useEffect(() => {
    const account = parseOfflineAccount(snapshot);
    if (!snapshot || !account) return;
    let live = true;
    void loadMessages(account.locale).then((messages) => {
      if (live) setReady({ snapshot, account, messages });
    }).catch(() => undefined);
    return () => { live = false; };
  }, [snapshot]);

  if (!ready || ready.snapshot !== snapshot) return children;
  const { account, messages } = ready;
  return (
    <main lang={account.locale} className="mx-auto w-full max-w-md px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <NextIntlClientProvider locale={account.locale} messages={messages} timeZone={account.timeZone}>
        <EventSyncProvider key={account.userId} userId={account.userId}>
          <TodaySession
            language={account.language}
            timeZone={account.timeZone}
            languageName={languageDisplayName(account.language, account.locale)}
            goal={null}
            detail={null}
            accentTolerance="lenient"
            animateSummary={false}
            prepareText={false}
          >
            <header className="space-y-1">
              <h1 className="sd-display text-3xl">{messages.today.title}</h1>
              <p className="text-muted">{messages.offline.body}</p>
            </header>
          </TodaySession>
        </EventSyncProvider>
      </NextIntlClientProvider>
    </main>
  );
}
