"use client";

import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { useEventSync } from "@/components/pwa/event-sync-provider";
import { detachReminderDevice } from "@/app/actions/reminders";
import { deleteSessionPacketDatabase } from "@/lib/offline/session-packet-store";
import { forgetOfflineAccount } from "@/lib/offline/account";
import { currentPushSubscription } from "@/lib/push/browser";

/**
 * The sign-out form. The session packets on the phone hold answer keys, so the database of the signed-in user is deleted
 * from here (the server cannot reach IndexedDB) before the server action signs out. The queue of events is kept: it goes
 * out at the next sign-in of the same account.
 */
export function SignOutForm({ userId, children, className }: { userId: string; children: ReactNode; className?: string }) {
  const sync = useEventSync();
  return (
    <form
      className={className}
      action={async () => {
        forgetOfflineAccount(userId);
        if (sync?.userId === userId) await sync.clearResolvedFeedback().catch(() => undefined);
        await deleteSessionPacketDatabase(userId);
        await currentPushSubscription().then(async (subscription) => {
          if (!subscription) return;
          await detachReminderDevice(userId, subscription.endpoint).catch(() => undefined);
          await subscription.unsubscribe();
        }).catch(() => undefined);
        await signOut();
      }}
    >
      {children}
    </form>
  );
}
