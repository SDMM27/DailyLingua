"use client";

import { getRoleplayScenario } from "@dailylingua/content";
import type { UiLocale } from "@dailylingua/i18n";
import {
  MAX_ROLEPLAY_TURNS, roleplayResponseSchema, type RoleplayGame, type RoleplayResponse,
} from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useEventSync } from "@/components/pwa/event-sync-provider";
import { Button } from "@/components/ui/button";
import { ShellBody, ShellFooter, UnitShell } from "@/components/unit/unit-shell";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import { useOnlineStatus } from "@/lib/offline/online-status";
import { languageStyle } from "@/lib/units/language-style";
import { RoleplayConversation } from "./roleplay-conversation";
import { RoleplayResult } from "./roleplay-result";
import { useRoleplayVoice } from "./roleplay-voice";

const ENDPOINT = "/api/roleplay";
type RoleplayState = Extract<RoleplayResponse, { status: "state" }>;
type RoleplayFailure = Exclude<RoleplayResponse, { status: "ready" | "state" }>;

async function requestRoleplay(userId: string, path: string, options?: { post?: object; signal?: AbortSignal }): Promise<RoleplayResponse> {
  const post = options?.post;
  const response = await fetch(path, {
    method: post ? "POST" : "GET",
    headers: { [ACCOUNT_HEADER]: userId, ...(post ? { "Content-Type": "application/json" } : {}) },
    cache: "no-store",
    credentials: "same-origin",
    signal: options?.signal,
    body: post ? JSON.stringify(post) : undefined,
  });
  return roleplayResponseSchema.parse(await response.json());
}

export function RoleplayPlayer({ userId, language, locale, xpVisible, backHref }: {
  userId: string;
  language: string;
  locale: UiLocale;
  xpVisible: boolean;
  backHref: string;
}) {
  const t = useTranslations("roleplay");
  const common = useTranslations("common");
  const router = useRouter();
  const sync = useEventSync();
  const online = useOnlineStatus();
  const [retry, setRetry] = useState(0);
  const [available, setAvailable] = useState<RoleplayState | null>(null);
  const [selected, setSelected] = useState<string>();
  const [game, setGame] = useState<RoleplayGame>();
  const [failure, setFailure] = useState<RoleplayFailure>();
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [xpReceipt, setXpReceipt] = useState<{ id: string; xp: number }>();
  const voice = useRoleplayVoice(game?.language ?? language);
  const stateUrl = `${ENDPOINT}?language=${encodeURIComponent(language)}`;

  useEffect(() => {
    if (!online) return;
    const controller = new AbortController();
    void requestRoleplay(userId, stateUrl, { signal: controller.signal }).then((state) => {
      if (controller.signal.aborted) return;
      if (state.status !== "state") {
        setFailure({ status: "unavailable" });
        return;
      }
      setAvailable(state);
      // An in-flight request may confirm a newer game by the time a reconnect fetch returns.
      if (!lock.current) setGame(state.active ?? state.latestFinished ?? undefined);
    }).catch(() => {
      if (!controller.signal.aborted) setFailure({ status: "unavailable" });
    });
    return () => controller.abort();
  }, [online, retry, stateUrl, userId]);

  const finishedId = game?.status === "finished" ? game.id : undefined;
  const finishedAt = game?.finishedAt;
  const knownXp = available?.latestFinished?.id === finishedId ? available?.xp ?? 0 : 0;
  const receipt = xpReceipt?.id === finishedId ? xpReceipt : undefined;

  useEffect(() => {
    if (!finishedId || !finishedAt || !sync) return;
    const controller = new AbortController();
    let timer: number | undefined;
    const confirm = async () => {
      try {
        if (knownXp > 0) return;
        await sync.enqueueUnitEvents([{ kind: "roleplay_completed", payload: { roleplayId: finishedId } }], finishedAt);
        if (online && !controller.signal.aborted) await checkReceipt();
      } catch {
        if (!controller.signal.aborted) setXpReceipt({ id: finishedId, xp: 0 });
      }
    };
    const checkReceipt = async () => {
      try {
        // Read the ledger only after delivery. An accepted event can still earn zero XP.
        if (await sync.eventDelivery(finishedId) !== "queued") {
          const state = await requestRoleplay(userId, stateUrl, { signal: controller.signal });
          if (controller.signal.aborted) return;
          if (state.status === "state") {
            setAvailable(state);
            setXpReceipt({ id: finishedId, xp: state.latestFinished?.id === finishedId ? state.xp : 0 });
            return;
          }
        }
      } catch { /* The queue retries delivery after temporary failures. */ }
      if (!controller.signal.aborted) timer = window.setTimeout(() => { void checkReceipt(); }, 4000);
    };
    void confirm();
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [finishedId, finishedAt, knownXp, online, stateUrl, sync, userId]);

  function apply(result: RoleplayResponse) {
    if (result.status === "ready" || result.status === "game_over" || result.status === "active_exists") {
      setGame(result.game);
      if (result.status === "ready" && result.game.status === "active" && result.reply && voice.auto &&
        result.game.language === (game?.language ?? language)) voice.speak(result.reply.text);
    }
    if (result.status !== "ready" && result.status !== "state" && result.status !== "active_exists") setFailure(result);
  }

  async function submit(path: string, post: object, finishWhenOver = false): Promise<boolean> {
    if (lock.current || !online) return false;
    lock.current = true;
    setPending(true);
    setFailure(undefined);
    try {
      const response = await requestRoleplay(userId, path, { post });
      apply(response);
      if (finishWhenOver && response.status === "ready" && response.game.turnsLeft === 0) {
        apply(await requestRoleplay(userId, `${ENDPOINT}/${response.game.id}/finish`, { post: {} }).catch(() => ({ status: "unavailable" } as const)));
      }
      return response.status === "ready";
    } catch {
      setFailure({ status: "unavailable" });
      return false;
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  const scenarioId = game?.scenarioId ?? selected;
  const scenario = scenarioId ? getRoleplayScenario(scenarioId) : undefined;
  const error = !online ? t("offline") : failure?.status === "limit" ? t(failure.reason === "budget" ? "budget" : "daily")
    : failure?.status === "game_over" ? (game?.status === "active" ? t("updated") : null)
      : failure ? t(failure.status === "disabled" ? "disabled" : "error") : null;
  const feedback = pending
    ? <p role="status" className="mb-2 text-sm text-muted">{common("loading")}</p>
    : error && <p role="status" className="mb-2 text-sm text-muted">{error}</p>;

  return (
    <UnitShell style={languageStyle(game?.language ?? language)} onClose={() => router.push(backHref)} closeLabel={t("close")}>
      {game?.status === "active" && scenario ? (
        <RoleplayConversation
          key={game.id}
          game={game}
          scenario={scenario}
          locale={locale}
          voice={voice}
          pending={pending}
          online={online}
          feedback={feedback}
          onTurn={(post) => submit(`${ENDPOINT}/${game.id}/turns`, post, true)}
          onFinish={() => { void submit(`${ENDPOINT}/${game.id}/finish`, {}); }}
        />
      ) : game?.status === "finished" && game.review && scenario ? (
        <RoleplayResult game={game} review={game.review} scenario={scenario} locale={locale} backHref={backHref}
          xp={xpVisible ? receipt?.xp ?? knownXp : 0} pending={xpVisible && !!sync && !receipt && knownXp === 0}
          onChoose={available?.canStart && available.latestFinished?.id === game.id ? () => {
            setGame(undefined);
            setSelected(undefined);
          } : undefined} />
      ) : (
        <>
          <ShellBody>
            <h1 className="font-display text-[30px] leading-tight font-bold">{scenario?.title[locale] ?? t("title")}</h1>
            {selected && scenario ? (
              <div className="mt-4 space-y-4">
                <p>{scenario.situation[locale]}</p>
                <dl className="grid gap-2 border-y-4 border-double border-line py-3">
                  <div><dt className="text-sm text-muted">{t("yourRole")}</dt><dd>{scenario.learnerRole[locale]}</dd></div>
                  <div><dt className="text-sm text-muted">{t("theirRole")}</dt><dd>{scenario.aiRole[locale]}</dd></div>
                </dl>
                <h2 className="font-display text-xl font-bold">{t("objectives")}</h2>
                <ol className="list-decimal space-y-2 ps-5">{scenario.objectives.map((objective) => <li key={objective[locale]}>{objective[locale]}</li>)}</ol>
                <p className="text-sm text-muted">{t("turnLimit", { count: MAX_ROLEPLAY_TURNS })}</p>
              </div>
            ) : available?.canStart ? (
              <ul className="mt-4 grid gap-2">
                {available.offered.flatMap((id) => {
                  const item = getRoleplayScenario(id);
                  return item ? [(
                    <li key={id}>
                      <button type="button" disabled={!online} onClick={() => setSelected(id)}
                        className="min-h-11 w-full rounded-card border border-line bg-surface p-4 text-start disabled:opacity-50">
                        <span className="block font-display text-xl font-bold">{item.title[locale]}</span>
                        <span className="mt-1 block text-sm text-muted">{item.situation[locale]}</span>
                      </button>
                    </li>
                  )] : [];
                })}
              </ul>
            ) : available ? <p className="mt-3 text-muted">{t(available.today ? "daily" : "disabled")}</p>
              : online && !failure && <p role="status" className="mt-3 text-muted">{common("loading")}</p>}
            {!selected && !pending && <div className="mt-3">{feedback}</div>}
            {!available && failure && online && <Button variant="secondary" onClick={() => { setFailure(undefined); setRetry((value) => value + 1); }}>{t("retry")}</Button>}
          </ShellBody>
          {selected && scenario && (
            <ShellFooter>
              {feedback}
              <Button disabled={pending || !online} onClick={() => { void submit(ENDPOINT, { scenarioId: scenario.id, language }); }}>{t("start")}</Button>
              <Button variant="ghost" className="mt-1 w-full" disabled={pending} onClick={() => { setSelected(undefined); setFailure(undefined); }}>{t("changeScenario")}</Button>
            </ShellFooter>
          )}
        </>
      )}
    </UnitShell>
  );
}
