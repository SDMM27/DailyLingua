"use client";

import { learningDay } from "@dailylingua/core";
import type { SessionPacket } from "@dailylingua/schemas";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { useEventSync } from "@/components/pwa/event-sync-provider";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import type { LocalSessionProgress } from "@/lib/offline/indexeddb-queue";
import { useOnlineStatus } from "@/lib/offline/online-status";
import { sessionScreens, stepNumber } from "@/lib/session-packet/session-flow";
import { SessionPanel } from "./session-panel";
import { SessionPrefetch } from "./session-prefetch";
import { WritingFeedback } from "./writing-feedback";

export function TodaySession({ language, timeZone, languageName, children, goal, detail, accentTolerance, animateSummary, prepareText }: {
  language: string;
  timeZone: string;
  languageName: string;
  children: ReactNode;
  goal: ReactNode;
  detail: ReactNode;
  accentTolerance: "strict" | "lenient";
  animateSummary: boolean;
  prepareText: boolean;
}) {
  const t = useTranslations("dailySession");
  const today = useTranslations("today");
  const common = useTranslations("common");
  const locale = useLocale();
  const sync = useEventSync();
  const router = useRouter();
  const online = useOnlineStatus();
  const [packet, setPacket] = useState<SessionPacket | null>(null);
  const [cached, setCached] = useState(false);
  const [progress, setProgress] = useState<LocalSessionProgress | null>(null);
  const [active, setActive] = useState<{ packet: SessionPacket; progress: LocalSessionProgress } | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [starting, setStarting] = useState(false);
  const startLock = useRef(false);
  const lastProgressRequest = useRef(0);

  const receive = useCallback((next: SessionPacket, ready: boolean) => {
    const request = ++lastProgressRequest.current;
    setPacket(next);
    setCached(ready);
    setUnavailable(false);
    void sync?.readProgress(next.session.id).then((saved) => {
      if (request === lastProgressRequest.current) setProgress(saved ?? null);
    }).catch(() => undefined);
  }, [sync]);

  const missing = useCallback(() => {
    ++lastProgressRequest.current;
    setPacket(null);
    setCached(false);
    setProgress(null);
    setUnavailable(true);
  }, []);

  async function begin() {
    if (!packet || !sync || startLock.current) return;
    if (learningDay(new Date(), packet.timeZone) !== packet.session.day) {
      missing();
      setRetry((value) => value + 1);
      return;
    }
    startLock.current = true;
    setStarting(true);
    setSaveError(false);
    try {
      let saved = await sync.readProgress(packet.session.id);
      if (!saved) {
        const sessionId = packet.session.id;
        const first = sessionScreens(packet)[0]!;
        const next: LocalSessionProgress = {
          position: packet.session.status === "completed" ? "closed" : first.key,
          revision: 1,
          startedAt: null,
        };
        const started = packet.session.status === "completed" ? [] : [{ kind: "session_started" as const, payload: { sessionId } }];
        if (await sync.advanceSession(sessionId, 0, next, started, new Date().toISOString())) saved = next;
        else saved = await sync.readProgress(sessionId);
      }
      if (!saved) throw new Error("Session progress could not be opened");
      ++lastProgressRequest.current;
      setProgress(saved);
      setActive({ packet, progress: packet.session.status === "completed" ? { ...saved, position: "closed" } : saved });
    } catch {
      setSaveError(true);
    } finally {
      startLock.current = false;
      setStarting(false);
    }
  }

  const current = packet && progress ? sessionScreens(packet).find((screen) => screen.key === progress.position) : undefined;
  const finished = packet?.session.status === "completed" || progress?.position === "closed";
  const action = finished ? t("reopen")
    : current ? today("session.resume", { current: stepNumber(current.step), total: 6 })
      : today("session.start");

  return (
    <>
      <SessionPrefetch language={language} timeZone={timeZone} retry={retry} prepareText={prepareText} offlineLocale={locale} onPacket={receive} onUnavailable={missing} />
      {active && sync ? (
        <SessionPanel packet={active.packet} initial={active.progress} sync={sync} accentTolerance={accentTolerance} animateSummary={animateSummary} onLeave={(next) => {
          ++lastProgressRequest.current;
          setProgress(next);
          setActive(null);
          if (online) void sync.flushNow().then(() => router.refresh()).catch(() => undefined);
        }} />
      ) : (
        <>
          {children}
          <article aria-labelledby="today-language" className="mt-10 space-y-5 rounded-card border border-line bg-surface p-6">
            <div className="flex items-center gap-4">
              {goal}
              <div className="min-w-0">
                <p className="meta">{languageName}</p>
                <h2 id="today-language" className="sd-display mt-1 break-words text-3xl" lang={packet?.text ? language : undefined} dir="auto">
                  {packet?.text?.title ?? t("title")}
                </h2>
                {packet && <p className="mt-2 text-muted">
                  {packet.text ? today("session.duration", { count: packet.session.format }) : t("reviewOnly")}
                </p>}
              </div>
            </div>
            {packet?.text?.generationReviewed && <p className="text-sm text-muted">{t("generatedText")}</p>}
            {!online && <p className="meta" role="status">{t("offline")}</p>}
            {packet ? (
              <>
                {cached && <p className="text-sm text-muted">{t("readyOffline")}</p>}
                <Button disabled={starting || !sync} onClick={() => { void begin(); }}>{action}</Button>
              </>
            ) : unavailable ? (
              <>
                <p className="text-muted">{t(online ? "loadError" : "offlineMissing")}</p>
                {online && <Button variant="secondary" onClick={() => { setUnavailable(false); setRetry((value) => value + 1); }}>{t("retry")}</Button>}
              </>
            ) : <p className="text-muted" role="status">{common("loading")}</p>}
            {saveError && <FormMessage kind="error">{t("saveError")}</FormMessage>}
          </article>
          <div className="mt-5 empty:hidden">{sync && <WritingFeedback sync={sync} />}</div>
          {detail}
        </>
      )}
    </>
  );
}
