"use client";

import { gradeUnitTest, stepValidated, type AccentTolerance, type UnitAttempt } from "@dailylingua/core";
import { isAssessmentUnit, isScriptUnit, type Unit, type UnitItem } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { UnitEvent } from "@/lib/units/events";
import {
  expectedText, firstOpenStep, flatSteps, lessonOfItem, stepItems, unitFinished, unitStarted, UNIT_TEST_XP_ESTIMATE,
} from "@/lib/units/flow";
import { languageStyle } from "@/lib/units/language-style";
import type { UnitProgressView } from "@/lib/units/progress";
import { AssessmentResult, type ReviewUnit } from "./assessment-result";
import { DialogueStep, type DialoguePrefs } from "./dialogue-step";
import { ExerciseRunner, type ItemAttempt } from "./exercise-runner";
import { GrammarInfo, KeyPhrasesInfo } from "./info-steps";
import { ScriptInfo, scriptHasInfo } from "./script-info";
import { TestStep } from "./test-step";
import { useUnitExtras } from "./unit-extras";
import { UnitIntro } from "./unit-intro";
import { UnitResult, type MissedPhrase } from "./unit-result";
import { ShellBody, UnitShell } from "./unit-shell";
import { WarmupDone, WarmupIntro } from "./warmup-intro";

export interface UnitFlowProps {
  unit: Unit;
  progress: UnitProgressView | null;
  locale: "fr" | "en";
  tolerance: AccentTolerance;
  xpVisible: boolean;
  animate: boolean;
  offline: boolean;
  /** The next unit of the language, when there is one the learner may open. */
  nextUnit: { id: string; title: string } | null;
  /** Hands events to the offline queue; a rejection shows a calm warning (the learner can go on). */
  onEvents(events: UnitEvent[]): Promise<void>;
  onLeave(): void;
  onOpenUnit(id: string): void;
}

interface Result {
  correct: number;
  total: number;
  passed: boolean;
  missed: MissedPhrase[];
  /** Bilan only: the units to go over, from the missed questions. */
  review: ReviewUnit[];
}

/**
 * A unit from its entry screen to its result: three lessons, six steps, then the test. The learner starts at the first
 * step the server has not validated; « Je connais déjà » goes straight to the test. Answers are graded here for the
 * immediate feedback (the correct answers are in the content, which also works offline); the server grades again from
 * the events and decides the XP and the progress.
 */
export function UnitFlow({ unit, progress, locale, tolerance, xpVisible, animate, offline, nextUnit, onEvents, onLeave, onOpenUnit }: UnitFlowProps) {
  const t = useTranslations("unit");
  const sheet = useTranslations("unitSheet");
  const warmup = useTranslations("warmup");
  const actions = useTranslations("common.actions");
  const steps = useMemo(() => flatSteps(unit), [unit]);
  const { openPath, startAtTest: asked, unitXp, warmupItemIds, sources } = useUnitExtras();
  // The bilan is only a test: it opens on it, with no lessons before.
  const bilan = isAssessmentUnit(unit);
  const startAtTest = asked || bilan;
  const [screen, setScreen] = useState<"intro" | "warmup" | "warmupDone" | "step" | "result">(startAtTest ? "step" : "intro");
  const [index, setIndex] = useState(() => (startAtTest ? Math.max(0, flatSteps(unit).findIndex((step) => step.step === "test")) : firstOpenStep(unit, progress)));
  const [infoDone, setInfoDone] = useState(false);
  const [share, setShare] = useState(0);
  const [direct, setDirect] = useState(startAtTest);
  const [xp, setXp] = useState(0);
  const [prefs, setPrefs] = useState<DialoguePrefs>({ translation: false, transliteration: false });
  const [paused, setPaused] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [testRun, setTestRun] = useState(startAtTest ? 1 : 0);
  const attempts = useRef<UnitAttempt[]>([]);

  const current = steps[index]!;
  const stepLabels = steps.map((step) => t(`steps.${step.step}`));
  const items = stepItems(unit, current.lesson, current.step);
  const language = unit.language;
  // The server pays no XP for a unit already passed (reviewing it earns nothing): no estimate is shown then.
  const payXp = progress?.passedAt == null;
  const warmupItems = useMemo(() => {
    const wanted = new Set(warmupItemIds);
    return unit.items.filter((item) => wanted.has(item.id));
  }, [unit, warmupItemIds]);
  const warmupOn = warmupItems.length > 0 && progress?.passedAt == null;

  function emit(events: UnitEvent[]) {
    if (events.length === 0) return;
    onEvents(events).catch(() => setSaveError(true));
  }

  function goTo(next: number) {
    setIndex(next);
    setInfoDone(false);
    setShare(0);
  }

  function completeStep() {
    if (current.step !== "test" && stepValidated(unit, current.lesson, current.step, attempts.current)) {
      emit([{ kind: "unit_step_completed", payload: { unitId: unit.id, unitVersion: unit.version, lesson: current.lesson, step: current.step } }]);
    }
    if (index + 1 < steps.length) goTo(index + 1);
  }

  function onAttempt(attempt: ItemAttempt, lesson = current.lesson, count = true) {
    if (count) attempts.current.push({ itemId: attempt.item.id, correct: attempt.correct });
    emit([{
      kind: "unit_item_attempt",
      payload: { unitId: unit.id, unitVersion: unit.version, lesson, itemId: attempt.item.id, try: attempt.tryNumber, answer: attempt.answer, shownAt: attempt.shownAt },
    }]);
  }

  function startTest(skip: boolean) {
    setDirect(skip);
    goTo(steps.findIndex((step) => step.step === "test"));
    setTestRun((value) => value + 1);
    setScreen("step");
  }

  function finishTest(answers: { itemId: string; answer: string }[], startedAt: string) {
    const graded = gradeUnitTest(unit, answers, tolerance);
    if (!graded.valid) return;
    emit([{ kind: "unit_test_submitted", payload: { unitId: unit.id, unitVersion: unit.version, attemptId: crypto.randomUUID(), startedAt, answers } }]);
    const byId = new Map(unit.items.map((item) => [item.id, item]));
    const missed = graded.missed.flatMap((id): MissedPhrase[] => {
      const item = byId.get(id);
      const text = item ? expectedText(item, locale) : null;
      return item && text ? [{ text, note: item.explain[locale] }] : [];
    });
    // The units the missed questions of a bilan come from, each once, in the order of the path.
    const sourceIds = isAssessmentUnit(unit) ? [...new Set(graded.missed.flatMap((id) => unit.drawnFrom[id] ?? []))] : [];
    const review = sourceIds.flatMap((id): ReviewUnit[] => (sources[id] ? [{ id, ...sources[id] }] : [])).sort((a, b) => a.number - b.number);
    setResult({ correct: graded.score, total: graded.total, passed: graded.passed, missed, review });
    setScreen("result");
  }

  // The warm-up replays the missed sentences with the lesson each one comes from, so the server pays them by its rules.
  function onWarmupAttempt(attempt: ItemAttempt) {
    const lesson = lessonOfItem(unit, attempt.item.id);
    if (lesson) onAttempt(attempt, lesson, false);
  }

  const style = languageStyle(language);
  const warning = saveError && <p role="status" className="px-5 pt-2 text-sm text-muted">{t("saveError")}</p>;

  if (screen === "intro") {
    const finished = unitFinished(unit, progress);
    const mode = finished ? "review" : unitStarted(unit, progress) ? "resume" : "start";
    const begin = () => { goTo(finished ? 0 : firstOpenStep(unit, progress)); setScreen("step"); };
    if (warmupOn) {
      const label = mode === "resume" ? sheet("resume", { step: firstOpenStep(unit, progress) + 1, steps: steps.length }) : mode === "review" ? sheet("review") : sheet("start");
      return (
        <UnitShell style={style} onClose={onLeave} closeLabel={sheet("close")}>
          <WarmupIntro unit={unit} locale={locale} count={warmupItems.length} unitLabel={label} canSkip onWarmup={() => setScreen("warmup")} onUnit={begin} onSkip={() => startTest(true)} />
        </UnitShell>
      );
    }
    return (
      <UnitShell style={style} onClose={onLeave} closeLabel={sheet("close")}>
        <UnitIntro
          unit={unit}
          locale={locale}
          mode={mode}
          step={firstOpenStep(unit, progress) + 1}
          steps={steps.length}
          canSkip={progress?.passedAt == null}
          onStart={begin}
          onSkip={() => startTest(true)}
        />
      </UnitShell>
    );
  }

  if (screen === "warmup") {
    return (
      <UnitShell style={style} bar={{ steps: [warmup("name")], position: 1, stepProgress: share, xp: null, offline }} onClose={() => setPaused(true)}>
        {warning}
        <ExerciseRunner
          key="warmup"
          items={warmupItems}
          showXp={false}
          language={language}
          locale={locale}
          tolerance={tolerance}
          onAttempt={onWarmupAttempt}
          onXp={() => undefined}
          onProgress={setShare}
          onDone={() => { setShare(0); setScreen("warmupDone"); }}
        />
        {paused && <PauseSheet label={warmup("name")} onContinue={() => setPaused(false)} onLeave={onLeave} />}
      </UnitShell>
    );
  }

  if (screen === "warmupDone") {
    const finished = unitFinished(unit, progress);
    const unitLabel = unitStarted(unit, progress) ? (finished ? sheet("review") : sheet("resume", { step: firstOpenStep(unit, progress) + 1, steps: steps.length })) : sheet("start");
    return (
      <UnitShell style={style} onClose={onLeave} closeLabel={sheet("close")}>
        <WarmupDone unitLabel={unitLabel} onTest={() => startTest(true)} onUnit={() => { goTo(finished ? 0 : firstOpenStep(unit, progress)); setScreen("step"); }} />
      </UnitShell>
    );
  }

  if (screen === "result" && result && bilan) {
    return (
      <UnitShell style={style}>
        <AssessmentResult
          locale={locale}
          level={unit.level}
          passed={result.passed}
          correct={result.correct}
          total={result.total}
          passMark={unit.test.passScore}
          review={result.review}
          animate={animate}
          onBack={openPath ?? onLeave}
          onRetake={() => startTest(true)}
        />
      </UnitShell>
    );
  }

  if (screen === "result" && result) {
    return (
      <UnitShell style={style}>
        <UnitResult
          language={language}
          locale={locale}
          unitTitle={unit.title[locale]}
          passed={result.passed}
          correct={result.correct}
          total={result.total}
          passMark={unit.test.passScore}
          canDo={unit.canDo.map((goal) => goal.text[locale])}
          xpTest={xpVisible && progress?.passedAt == null ? UNIT_TEST_XP_ESTIMATE : null}
          xpKept={xpVisible ? unitXp + xp : 0}
          missed={result.missed}
          hasNext={nextUnit !== null}
          animate={animate}
          onNext={() => nextUnit && onOpenUnit(nextUnit.id)}
          onBack={openPath ?? onLeave}
          onRetake={() => startTest(direct)}
        />
      </UnitShell>
    );
  }

  const bar = { steps: stepLabels, position: index + 1, stepProgress: share, xp: xpVisible && !direct && payXp ? xp : null, offline };
  const hasInfo = bilan
    ? false
    : isScriptUnit(unit)
      ? scriptHasInfo(current.step)
      : current.step === "dialogue" || current.step === "key_phrases" || (current.step === "grammar" && unit.grammar !== null);
  const showInfo = hasInfo && !infoDone;
  const afterInfo = () => (items.length > 0 ? setInfoDone(true) : completeStep());

  return (
    <UnitShell style={style} bar={bar} onClose={() => setPaused(true)}>
      {warning}
      {showInfo ? (
        unit.kind === "script" ? (
          <ScriptInfo unit={unit} step={current.step} locale={locale} onFinished={afterInfo} />
        ) : unit.kind !== "situation" ? null : current.step === "dialogue" ? (
          <DialogueStep key="dialogue" language={language} locale={locale} dialogue={unit.dialogue} prefs={prefs} onPrefs={setPrefs} onFinished={afterInfo} />
        ) : current.step === "key_phrases" ? (
          <KeyPhrasesInfo key="key-phrases" phrases={unit.keyPhrases} language={language} locale={locale} onContinue={afterInfo} />
        ) : unit.grammar ? (
          <GrammarInfo key="grammar" summary={unit.grammar.summary[locale]} locale={locale} onContinue={afterInfo} />
        ) : null
      ) : current.step === "test" ? (
        <TestStep key={`test-${testRun}`} items={items} language={language} locale={locale} onProgress={setShare} onFinish={finishTest} />
      ) : items.length > 0 ? (
        <ExerciseRunner
          key={current.key}
          items={current.step === "conversation" ? conversationOrder(unit, items) : items}
          language={language}
          locale={locale}
          tolerance={tolerance}
          context={current.step === "conversation" ? (item) => <ConversationContext unit={unit} item={item} locale={locale} /> : undefined}
          onAttempt={onAttempt}
          showXp={payXp && xpVisible}
          onXp={(gain) => { if (payXp) setXp((value) => value + gain); }}
          onProgress={setShare}
          onDone={completeStep}
        />
      ) : (
        <ShellBody>
          <Button onClick={completeStep}>{actions("continue")}</Button>
        </ShellBody>
      )}
      {paused && <PauseSheet label={stepLabels[index] ?? ""} onContinue={() => setPaused(false)} onLeave={onLeave} />}
    </UnitShell>
  );
}

/** The pause sheet: nothing is lost, the learner picks up where they stopped. */
function PauseSheet({ label, onContinue, onLeave }: { label: string; onContinue(): void; onLeave(): void }) {
  const t = useTranslations("unit");
  const session = useTranslations("dailySession");
  const actions = useTranslations("common.actions");
  return (
    <BottomSheet labelledBy="pause-title" onClose={onContinue}>
      <h2 id="pause-title" data-sheet-title tabIndex={-1} className="font-display text-[22px] leading-tight font-bold">{t("pauseTitle")}</h2>
      <p className="mt-2 text-muted">{t("pauseBody", { step: label })}</p>
      <div className="mt-5 space-y-2.5">
        <Button onClick={onContinue}>{actions("continue")}</Button>
        <Button variant="secondary" className="w-full" onClick={onLeave}>{session("leave")}</Button>
      </div>
    </BottomSheet>
  );
}

/** The conversation's items in the order of the turns (the learner's turns), not of the step's list. */
function conversationOrder(unit: Unit, items: UnitItem[]): UnitItem[] {
  if (unit.kind !== "situation") return items;
  const rank = new Map(unit.conversation.turns.map((turn, position) => [turn.itemId, position]));
  return [...items].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}

/** The turns that come before the learner's turn (since the previous one of the learner), and who the learner plays. */
function ConversationContext({ unit, item, locale }: { unit: Unit; item: UnitItem; locale: "fr" | "en" }) {
  const t = useTranslations("unit");
  if (unit.kind !== "situation") return null;
  const turns = unit.conversation.turns;
  const at = turns.findIndex((turn) => turn.itemId === item.id);
  if (at < 0) return null;
  let from = at;
  while (from > 0 && turns[from - 1]?.itemId === null) from -= 1;
  const speakers = new Map(unit.dialogue.speakers.map((speaker) => [speaker.id, speaker.name]));
  const mine = speakers.get(turns[at]!.speaker);
  const first = turns.findIndex((turn) => turn.itemId !== null) === at;
  return (
    <div className="space-y-3">
      {first && mine && <p className="text-sm text-muted">{t("conversationYou", { name: mine })}</p>}
      {turns.slice(from, at).map((turn) => (
        <div key={turn.id}>
          <p className="text-xs font-semibold text-muted">{speakers.get(turn.speaker)}</p>
          <p className="font-display text-[22px] leading-snug" lang={unit.language} dir="auto">{turn.text}</p>
          <p className="text-[15px] text-muted" lang={locale}>{turn.translation[locale]}</p>
        </div>
      ))}
    </div>
  );
}
