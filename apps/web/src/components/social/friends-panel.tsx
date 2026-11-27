"use client";

import type { Friend } from "@dailylingua/data";
import { isTargetLanguage } from "@dailylingua/core";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { removeFriendByPseudonym, setFriends } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { languageStyle } from "@/lib/units/language-style";
import { EmptyState } from "./empty-state";
import { InviteSheet } from "./invite-sheet";
import { useSocialAction } from "./use-social-action";

/** The friends: pseudonym, language, XP of the week and, when the friend shows it, the streak. One button to invite. */
export function FriendsPanel({ enabled, friends, languageNames }: { enabled: boolean; friends: Friend[]; languageNames: Record<string, string> }) {
  const t = useTranslations("social.friends");
  const common = useTranslations("social");
  const { run, pending, failed } = useSocialAction();
  const [sheet, setSheet] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const message = failed ? <FormMessage kind="error">{common("error")}</FormMessage> : null;

  if (!enabled) {
    return (
      <EmptyState title={t("emptyTitle")} body={t("emptyBody")}>
        <Button disabled={pending} onClick={() => run(() => setFriends(true))}>{t("activate")}</Button>
        {message}
      </EmptyState>
    );
  }
  return (
    <div className="space-y-6">
      {friends.length === 0 ? <p className="py-6 text-center text-muted">{t("none")}</p> : (
        <ul className="divide-y divide-line">
          {friends.map((friend) => (
            <li key={friend.pseudonym} className="flex min-h-14 items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{friend.pseudonym}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                  {friend.language && (
                    <span style={languageStyle(friend.language)} className="rounded-full bg-lang-soft px-2.5 py-0.5 text-xs font-semibold text-lang">
                      {isTargetLanguage(friend.language) ? languageNames[friend.language] ?? friend.language : friend.language}
                    </span>
                  )}
                  {friend.streak !== null && friend.streak > 0 && <span>{t("streak", { count: friend.streak })}</span>}
                </p>
              </div>
              <div className="text-end">
                <p className="font-semibold text-xp">{t("xp", { xp: friend.weekXp })}</p>
                {removing === friend.pseudonym ? (
                  <span className="flex flex-wrap justify-end gap-1" role="group" aria-label={t("confirmRemove", { pseudonym: friend.pseudonym })}>
                    <button type="button" disabled={pending} className="min-h-11 px-2 text-sm text-error underline underline-offset-4"
                      onClick={() => run(() => removeFriendByPseudonym(friend.pseudonym), () => setRemoving(null))}>{t("confirm")}</button>
                    <button type="button" className="min-h-11 px-2 text-sm text-muted underline underline-offset-4" onClick={() => setRemoving(null)}>{t("cancel")}</button>
                  </span>
                ) : (
                  <button type="button" aria-label={t("removeLabel", { pseudonym: friend.pseudonym })} onClick={() => setRemoving(friend.pseudonym)}
                    className="min-h-11 min-w-11 px-2 text-sm text-muted underline underline-offset-4">{t("remove")}</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {message}
      <Button onClick={() => setSheet(true)}>{t("invite")}</Button>
      <div className="text-center">
        <Button variant="ghost" className="mx-auto" disabled={pending} onClick={() => run(() => setFriends(false))}>{t("disable")}</Button>
      </div>
      {sheet && <InviteSheet onClose={() => setSheet(false)} />}
    </div>
  );
}
