"use client";

import { nextPlacementStep, pickPlacementItem, shufflePlacementItems } from "@dailylingua/core";
import type { CefrLevel, PlacementAnswer, PlacementItem } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/unit/icons";
import { railLevels, stepSegments } from "@/lib/placement/progress";
import { ACCOUNT_HEADER } from "@/lib/offline/account";
import { languageStyle } from "@/lib/units/language-style";
import { PlacementIntroSheet } from "./placement-intro-sheet";
import { PlacementQuestion } from "./placement-question";
import { PlacementResult } from "./placement-result";
import { PlacementShell } from "./placement-shell";
import { LevelsRail, PlacementSteps } from "./placement-steps";
import { PlacementStopSheet } from "./placement-stop-sheet";

type Phase = "entry" | "questions" | "result";
const SKILLS = ["reading", "listening", "writing", "speaking"] as const;

/**
 * The adaptive placement test of one language: the entry screen with its introduction sheet, one question at a time,
 * then the result the learner keeps or corrects. The engine runs here (`nextPlacementStep`), but the server replays the
 * answers against the bank and computes the estimate itself. Stopping keeps nothing: the test restarts from the start.
 */
export function PlacementFlow({ userId, language, languageName, startLevel, items, doneHref }: {
  userId: string;
  language: string;
  languageName: string;
  /** The declared level: the test starts there. */
  startLevel: CefrLevel;
  /** The questions of the language; shuffled once per test, the engine picks which to ask. */
  items: PlacementItem[];
  /** Where to go once the result is saved. */
  doneHref: string;
}) {
  const t = useTranslations("placement");
  const progress = useTranslations("progress");
  const common = useTranslations("common.actions");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("entry");
  const [introOpen, setIntroOpen] = useState(true);
  const [order, setOrder] = useState<PlacementItem[]>(items);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [stopping, setStopping] = useState(false);
  const [chosen, setChosen] = useState<CefrLevel | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const responses = answers.flatMap(({ itemId, choice }) => {
    const item = items.find((candidate) => candidate.id === itemId);
    return item ? [{ level: item.level, correct: choice === item.answer }] : [];
  });
  const step = nextPlacementStep(startLevel, responses);
  const current = step.kind === "ask" ? pickPlacementItem(order, step.level, new Set(answers.map(({ itemId }) => itemId))) : null;
  // The label only changes when the test ends whatever the answer: otherwise it would tell whether the answer was right.
  const endsAnyway = current !== null && [true, false].every((correct) =>
    nextPlacementStep(startLevel, [...responses, { level: current.level, correct }]).kind === "done");

  const leave = () => router.push(`/progress?lang=${language}`);

  function begin() {
    setOrder(shufflePlacementItems(items));
    setIntroOpen(false);
    setPhase("questions");
  }

  function answer(choice: number | null) {
    if (!current) return;
    const done = nextPlacementStep(startLevel, [...responses, { level: current.level, correct: choice === current.answer }]).kind === "done";
    setAnswers([...answers, { itemId: current.id, choice }]);
    setSelected(null);
    if (done) setPhase("result");
  }

  async function save(estimate: CefrLevel) {
    setSaving(true);
    setFailed(false);
    try {
      const response = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json", [ACCOUNT_HEADER]: userId },
        body: JSON.stringify({ language, startLevel, answers, chosenLevel: chosen ?? estimate }),
      });
      if (response.ok) {
        router.push(doneHref);
        return;
      }
    } catch {
      // A network failure is reported like a refusal; nothing was saved.
    }
    setFailed(true);
    setSaving(false);
  }

  const style = languageStyle(language);

  if (phase === "result" && step.kind === "done") {
    const selectedLevel = chosen ?? step.estimate;
    return (
      // A key per screen: each one opens at the top of its scrolling zone.
      <PlacementShell
        key="result"
        style={style}
        narrow
        header={<span className="meta py-3">{t("result.meta", { language: languageName })}</span>}
        footer={(
          <>
            {failed && <p role="alert" className="mb-3 text-error">{t("result.error")}</p>}
            <Button disabled={saving} onClick={() => void save(step.estimate)} className="min-h-14 rounded-full bg-ink text-bg">
              {saving ? t("result.saving") : t(selectedLevel === step.estimate ? "result.keep" : "result.choose", { level: selectedLevel })}
            </Button>
          </>
        )}
      >
        <PlacementResult estimate={step.estimate} confidence={step.confidence} answered={answers.length} selected={selectedLevel} onSelect={setChosen} />
      </PlacementShell>
    );
  }

  if (phase === "questions" && current) {
    const rail = railLevels(responses, current.level);
    return (
      <>
        <PlacementShell
          key={current.id}
          style={style}
          header={(
            <>
              <button type="button" aria-label={t("question.stop")} onClick={() => setStopping(true)} className="grid size-11 shrink-0 place-items-center rounded-full">
                <Icon name="close" />
              </button>
              <PlacementSteps segments={stepSegments(answers.length)} />
            </>
          )}
          footer={(
            <div className="flex flex-col gap-1 min-[900px]:flex-row-reverse min-[900px]:items-center min-[900px]:justify-between">
              <Button disabled={selected === null} onClick={() => answer(selected)} className="min-h-14 rounded-full bg-ink text-bg disabled:bg-surface-2 disabled:text-muted disabled:opacity-100 min-[900px]:w-auto min-[900px]:px-10">
                {endsAnyway ? t("question.seeResult") : t("question.submit")}
              </Button>
              <Button variant="ghost" onClick={() => answer(null)} className="min-h-12 text-muted">{t("question.dontKnow")}</Button>
            </div>
          )}
        >
          <div className="grid flex-1 gap-6 min-[900px]:grid-cols-[240px_1fr] min-[900px]:pt-6">
            <LevelsRail levels={rail} />
            <div className="rounded-3xl border border-line bg-surface p-6 min-[900px]:p-10">
              <PlacementQuestion item={current} number={answers.length + 1} language={language} selected={selected} onSelect={setSelected} />
            </div>
          </div>
        </PlacementShell>
        {stopping && <PlacementStopSheet onContinue={() => setStopping(false)} onStop={leave} />}
      </>
    );
  }

  return (
    <>
      <PlacementShell
        style={style}
        narrow
        header={(
          <>
            <button type="button" aria-label={common("close")} onClick={leave} className="grid size-11 shrink-0 place-items-center rounded-full">
              <Icon name="close" />
            </button>
            <span className="meta">{t("header", { language: languageName })}</span>
          </>
        )}
        footer={<Button onClick={() => setIntroOpen(true)} className="min-h-14 rounded-full bg-ink text-bg">{t("start")}</Button>}
      >
        <h1 className="py-4 font-display text-[32px] leading-tight font-medium min-[900px]:text-[44px]">{t("title", { language: languageName })}</h1>
        <ul className="rounded-3xl border border-line bg-surface px-6 py-2">
          {SKILLS.map((skill, index) => (
            <li key={skill} className={`flex min-h-14 items-center justify-between gap-3 ${index > 0 ? "border-t border-line" : ""}`}>
              <span>{progress(skill)}</span>
              <span className="meta rounded-full bg-surface-2 px-2.5 py-1">{progress("unmeasured")}</span>
            </li>
          ))}
        </ul>
      </PlacementShell>
      {introOpen && <PlacementIntroSheet onStart={begin} onLater={leave} />}
    </>
  );
}
