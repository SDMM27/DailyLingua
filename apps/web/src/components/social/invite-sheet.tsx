"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { acceptInviteCode, createInviteCode } from "@/app/actions/social";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { CONTROL_CLASS, FormMessage } from "@/components/ui/field";
import { useSocialAction } from "./use-social-action";

type Mode = "create" | "enter";
type Notice = "ok" | "invalid" | "self" | "already" | "rate_limited" | "limit" | "unavailable";
const NOTICES = new Set<string>(["ok", "invalid", "self", "already", "rate_limited", "limit"]);

/** "Invite a friend": create a code to pass on, or enter the one that was received. Closes with Escape or the scrim. */
export function InviteSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("social.invite");
  const titleId = useId();
  const inputId = useId();
  const [mode, setMode] = useState<Mode>("create");
  const [code, setCode] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copied, setCopied] = useState(false);
  const { run, pending, failed } = useSocialAction();

  const show = (status: string) => setNotice(NOTICES.has(status) ? (status as Notice) : "unavailable");
  const format = (raw: string) => raw.replace(/(.{3})(?=.)/g, "$1-");

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // The code stays selectable on screen.
    }
  }

  return (
    <BottomSheet labelledBy={titleId} onClose={onClose}>
      <div className="space-y-5">
        <h2 id={titleId} data-sheet-title tabIndex={-1} className="sd-display text-2xl outline-none">{t("title")}</h2>
        {mode === "create" ? (
          <>
            {code ? (
              <>
                <p className="text-sm font-semibold">{t("codeLabel")}</p>
                <p data-testid="invite-code" className="select-all rounded-xl border border-dashed border-border-strong p-4 text-center font-mono text-2xl tracking-widest">{format(code)}</p>
                <Button onClick={() => { void copy(); }}>{copied ? t("copied") : t("copy")}</Button>
                <p className="text-sm text-muted">{t("hint")}</p>
              </>
            ) : (
              <Button disabled={pending} onClick={() => run(createInviteCode, (result) => {
                if (result.code) {
                  setCode(result.code);
                  setNotice(null);
                } else show(result.status);
              })}>{t("create")}</Button>
            )}
            <Button variant="ghost" className="w-full" onClick={() => { setMode("enter"); setNotice(null); }}>{t("haveCode")}</Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor={inputId} className="block text-sm font-semibold">{t("enterLabel")}</label>
              <input id={inputId} type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={24} value={typed}
                placeholder={t("enterPlaceholder")} onChange={(event) => setTyped(event.target.value)} className={`${CONTROL_CLASS} font-mono tracking-widest`} />
            </div>
            <Button disabled={pending || typed.trim().length < 6} onClick={() => run(() => acceptInviteCode(typed), (result) => {
              show(result.status);
              if (result.status === "ok") setTyped("");
            })}>{t("add")}</Button>
            <Button variant="ghost" className="w-full" onClick={() => { setMode("create"); setNotice(null); }}>{t("makeMine")}</Button>
          </>
        )}
        <div role="status" className="empty:hidden">
          {notice && <FormMessage kind={notice === "ok" ? "notice" : "error"}>{t(notice)}</FormMessage>}
          {failed && <FormMessage kind="error">{t("unavailable")}</FormMessage>}
        </div>
        <Button variant="secondary" className="w-full" onClick={onClose}>{t("close")}</Button>
      </div>
    </BottomSheet>
  );
}
