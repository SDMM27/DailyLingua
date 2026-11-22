"use client";

import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { deleteSessionPacketDatabase } from "@/lib/offline/session-packet-store";
import { forgetOfflineAccount } from "@/lib/offline/account";

/**
 * The sign-out form. The session packets on the phone hold answer keys, so the database of the signed-in user is deleted
 * from here (the server cannot reach IndexedDB) before the server action signs out. The queue of events is kept: it goes
 * out at the next sign-in of the same account.
 */
export function SignOutForm({ userId, children, className }: { userId: string; children: ReactNode; className?: string }) {
  return (
    <form
      className={className}
      action={async () => {
        forgetOfflineAccount(userId);
        await deleteSessionPacketDatabase(userId);
        await signOut();
      }}
    >
      {children}
    </form>
  );
}
