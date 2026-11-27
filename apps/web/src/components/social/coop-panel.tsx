"use client";

import type { CoopOverview, Friend } from "@dailylingua/data";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { joinCoopChallenge, leaveCoopChallenge, startCoop } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { EmptyState } from "./empty-state";
import { ProgressRing } from "./progress-ring";
import { useSocialAction } from "./use-social-action";

/** Colours of the contribution bar, one per member (the legend is written next to each dot, so colour never carries it alone). */
const MEMBER_COLOURS = ["bg-accent", "bg-lang", "bg-xp", "bg-success", "bg-error"];

const STATUS_KEYS = ["exists", "not_friends", "unavailable", "full"] as const;
type StatusKey = (typeof STATUS_KEYS)[number];

/** The cooperative challenge of the week. Needs the friends switch. */
export function CoopPanel({ friendsEnabled, friends, coop, onGoFriends }: {
  friendsEnabled: boolean;
  friends: Friend[];
  coop: CoopOverview;
  onGoFriends: () => void;
}) {
  const t = useTranslations("social.coop");
  const common = useTranslations("social");
  const { run, pending, failed } = useSocialAction();
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [notice, setNotice] = useState<StatusKey | null>(null);
  const flag = (status: string) => setNotice((STATUS_KEYS as readonly string[]).includes(status) ? (status as StatusKey) : null);
  const message = (
    <div role="status" className="empty:hidden">
      {failed && <FormMessage kind="error">{common("error")}</FormMessage>}
      {notice && <FormMessage kind="error">{t(notice)}</FormMessage>}
    </div>
  );

  if (!friendsEnabled) {
    return (
      <EmptyState title={t("needFriendsTitle")} body={t("needFriends")}>
        <Button onClick={onGoFriends}>{t("goFriends")}</Button>
      </EmptyState>
    );
  }

  const closed = coop.challenge?.status === "closed" ? coop.challenge : null;
  const challenge = coop.challenge?.status === "active" ? coop.challenge : null;
  const invitations = coop.invitations.length > 0 && (
    <ul className="space-y-3">
      {coop.invitations.map((invitation) => (
        <li key={invitation.id} className="space-y-3 rounded-xl bg-xp-soft p-4">
          <p>{t("invitation", { from: invitation.from })}</p>
          <div className="flex flex-wrap gap-3">
            <Button className="sm:w-auto" disabled={pending} onClick={() => run(() => joinCoopChallenge(invitation.id), (r) => flag(r.status))}>{t("join")}</Button>
            <Button variant="ghost" disabled={pending} onClick={() => run(() => leaveCoopChallenge(invitation.id))}>{t("decline")}</Button>
          </div>
        </li>
      ))}
    </ul>
  );

  if (!challenge) {
    return (
      <div className="space-y-6">
        {closed && (
          <div className="space-y-3 text-center">
            {closed.reached
              ? <p className="rounded-xl bg-success-soft p-6 text-lg font-semibold text-success">{t("reachedTitle")}</p>
              : null}
            <p className="text-muted">{t(closed.reached ? "reachedBody" : "closedBody", { total: closed.total, goal: closed.goal })}</p>
          </div>
        )}
        {invitations}
        {picking ? (
          <div className="space-y-4">
            <h2 className="sd-display text-2xl">{t("pick")}</h2>
            {friends.length === 0 ? <p className="text-muted">{t("noFriends")}</p> : (
              <ul className="space-y-2">
                {friends.map((friend) => (
                  <li key={friend.pseudonym}>
                    <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-2">
                      <span>{friend.pseudonym}</span>
                      <input type="checkbox" className="size-6 shrink-0" checked={chosen.includes(friend.pseudonym)}
                        disabled={!chosen.includes(friend.pseudonym) && chosen.length >= 4}
                        onChange={(event) => setChosen(event.target.checked ? [...chosen, friend.pseudonym] : chosen.filter((name) => name !== friend.pseudonym))} />
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {message}
            <Button disabled={pending || chosen.length === 0} onClick={() => run(() => startCoop(chosen), (r) => {
              flag(r.status);
              if (r.status === "ok") setPicking(false);
            })}>{t("send")}</Button>
            <Button variant="ghost" className="w-full" onClick={() => { setPicking(false); setChosen([]); }}>{t("cancel")}</Button>
          </div>
        ) : (
          <EmptyState title={t("startTitle")} body={t("startBody")}>
            <Button onClick={() => setPicking(true)}>{t("start")}</Button>
          </EmptyState>
        )}
      </div>
    );
  }

  const max = Math.max(1, challenge.total);
  return (
    <div className="space-y-6 py-2">
      {invitations}
      <div className="space-y-3 text-center">
        <ProgressRing total={challenge.total} goal={challenge.goal} caption={t("ringCaption", { goal: challenge.goal })} label={t("ringLabel", { total: challenge.total, goal: challenge.goal })} />
        <p className="text-sm text-muted">{t("summary", { count: challenge.members.length })}</p>
        {challenge.reached && <p className="rounded-xl bg-success-soft p-4 font-semibold text-success">{t("reachedTitle")}</p>}
      </div>
      <div aria-hidden="true" className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-accent-soft">
        {challenge.members.map((member, index) => (
          <i key={member.pseudonym} className={MEMBER_COLOURS[index % MEMBER_COLOURS.length]} style={{ width: `${(member.contribution / max) * 100}%` }} />
        ))}
      </div>
      <ul className="divide-y divide-line">
        {challenge.members.map((member, index) => (
          <li key={member.pseudonym} className="flex min-h-12 items-center justify-between gap-3 py-2">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className={`size-2.5 rounded-full ${MEMBER_COLOURS[index % MEMBER_COLOURS.length]}`} />
              {member.me ? t("me") : member.pseudonym}
            </span>
            <b className="text-xp">{t("xp", { xp: member.contribution })}</b>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">{t("note")}</p>
      {message}
      <div className="text-center">
        <Button variant="ghost" className="mx-auto" disabled={pending} onClick={() => run(() => leaveCoopChallenge(challenge.id))}>{t("leave")}</Button>
      </div>
    </div>
  );
}
