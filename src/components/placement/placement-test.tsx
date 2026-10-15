"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { completePlacementTest } from "@/app/actions/placement";
import { ArrowRightIcon } from "@/components/icons";
import { languageStyle } from "@/components/ui/language-style";
import { Card, Eyebrow, LanguageTag } from "@/components/ui/primitives";
import { PLACEMENT_CONFIDENCE_LABELS, PLACEMENT_VARIANT_LABELS } from "@/lib/domain/labels";
import { languageInfo } from "@/lib/domain/languages";
import { nextPlacementStep, pickPlacementItem } from "@/lib/domain/placement";
import { CEFR_LEVELS, type CefrLevel, type Language } from "@/lib/schemas/common";
import {
  PLACEMENT_GAP,
  PLACEMENT_VARIANTS,
  type PlacementAnswer,
  type PlacementItem,
  type PlacementVariant,
} from "@/lib/schemas/placement";

type Phase = "intro" | "questions" | "result";

/** The prompt of a grammar or vocabulary question, its gap drawn as a visible blank. */
function Prompt({ text }: { text: string }) {
  const parts = text.split(PLACEMENT_GAP);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <span
              role="img"
              aria-label="blanc à compléter"
              className="mx-1 inline-block w-14 border-b-2 border-ink align-baseline"
            />
          )}
        </Fragment>
      ))}
    </>
  );
}

/**
 * The adaptive placement test of one language: intro, one question at a time, then the result,
 * which the learner can correct before saving. The engine (`nextPlacementStep`) runs here, but
 * the server replays the answers against the bank and computes the estimate itself. `persist`
 * is false in the demo, where nothing can be saved.
 */
export function PlacementTest({
  language,
  items,
  suggestedVariant,
  startLevel,
  persist,
}: {
  language: Language;
  items: Record<PlacementVariant, PlacementItem[]>;
  suggestedVariant: PlacementVariant;
  /** The declared level: the test starts there. */
  startLevel: CefrLevel;
  persist: boolean;
}) {
  const router = useRouter();
  const info = languageInfo(language);
  const [phase, setPhase] = useState<Phase>("intro");
  const [variant, setVariant] = useState<PlacementVariant>(suggestedVariant);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [chosen, setChosen] = useState<CefrLevel | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bank = items[variant];
  const responses = answers.flatMap((a) => {
    const item = bank.find((i) => i.id === a.itemId);
    return item ? [{ level: item.level, correct: a.choice === item.answer }] : [];
  });
  const step = phase === "intro" ? null : nextPlacementStep(startLevel, responses);
  const current =
    step?.kind === "ask" ? pickPlacementItem(bank, step.level, new Set(answers.map((a) => a.itemId))) : null;
  const result = step?.kind === "done" ? step : null;

  function answer(choice: number | null) {
    if (!current) return;
    const next = [...answers, { itemId: current.id, choice }];
    setAnswers(next);
    if (nextPlacementStep(startLevel, [...responses, { level: current.level, correct: choice === current.answer }]).kind === "done") {
      setPhase("result");
    }
  }

  function restart() {
    setAnswers([]);
    setChosen(null);
    setError(null);
    setPhase("intro");
  }

  async function save() {
    if (!result) return;
    setSaving(true);
    setError(null);
    const outcome = await completePlacementTest({
      language,
      variant,
      startLevel,
      answers,
      chosenLevel: chosen ?? result.estimate,
    });
    if (!outcome.ok) {
      setError(outcome.error);
      setSaving(false);
      return;
    }
    // Stay on "saving" while the list loads.
    router.push("/niveau");
    router.refresh();
  }

  const header = (
    <div className="mb-6 flex items-center justify-between gap-3">
      <LanguageTag language={language} />
      {phase === "questions" && (
        <Link href="/niveau" className="min-h-11 content-center text-sm font-medium text-muted hover:text-ink">
          Arrêter
        </Link>
      )}
    </div>
  );

  if (phase === "intro") {
    return (
      <div>
        {header}
        <Card>
          <Eyebrow>Comment ça marche</Eyebrow>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            Un test adaptatif de {info.nameFr.toLowerCase()} : environ 5 à 12 questions, 5 minutes. Le niveau des
            questions change selon tes réponses, il n’y a rien à préparer.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            Si tu ne sais pas, choisis « Je ne sais pas » plutôt que de deviner : cette réponse compte comme
            fausse, mais elle donne une estimation plus juste qu’un coup de chance.
          </p>
        </Card>
        <Card className="mt-4">
          <Eyebrow>Type de test</Eyebrow>
          <div role="radiogroup" aria-label="Type de test" className="mt-3 grid grid-cols-2 gap-2">
            {PLACEMENT_VARIANTS.map((v) => {
              const active = variant === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setVariant(v)}
                  className={`min-h-11 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    active ? "border-ink bg-ink text-paper" : "border-line hover:bg-surface-sunk"
                  }`}
                >
                  <span className="block font-semibold">{PLACEMENT_VARIANT_LABELS[v].title}</span>
                  <span className={`text-xs ${active ? "text-paper/75" : "text-muted"}`}>
                    {PLACEMENT_VARIANT_LABELS[v].hint}
                  </span>
                </button>
              );
            })}
          </div>
          {variant === suggestedVariant && (
            <p className="mt-2 text-xs text-muted">Proposé d’après ton usage de cette langue.</p>
          )}
        </Card>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => setPhase("questions")}
            className="w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98]"
          >
            Commencer
          </button>
          <Link
            href="/niveau"
            className="flex min-h-11 items-center justify-center text-sm font-medium text-muted hover:text-ink"
          >
            Passer le test
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    const level = chosen ?? result.estimate;
    const confidence = PLACEMENT_CONFIDENCE_LABELS[result.confidence];
    return (
      <div>
        {header}
        <Card>
          <Eyebrow>Niveau estimé</Eyebrow>
          <p className={`mt-2 font-serif text-6xl font-semibold ${languageStyle(language).text}`}>{result.estimate}</p>
          <p className="mt-3 font-semibold">Confiance {confidence.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{confidence.hint}</p>
        </Card>
        <Card className="mt-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-soft">Niveau à retenir</span>
            <select
              value={level}
              onChange={(e) => setChosen(e.target.value as CefrLevel)}
              className="w-full appearance-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base font-semibold focus:border-ink-soft focus:outline-none"
            >
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-muted">
            Niveau déclaré actuellement : {startLevel}. Tu peux garder l’estimation ou choisir un autre niveau.
          </p>
        </Card>
        <div className="mt-6 space-y-3">
          {persist ? (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : "Enregistrer ce niveau"}
            </button>
          ) : (
            <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
              Mode démonstration : rien n’est enregistré.
            </p>
          )}
          <div aria-live="polite">
            {error && (
              <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={restart}
            disabled={saving}
            className="flex min-h-11 w-full items-center justify-center text-sm font-medium text-muted hover:text-ink disabled:opacity-60"
          >
            Recommencer
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    // The bank has no question left at the level asked: cannot happen with a valid bank.
    return (
      <div>
        {header}
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          Ce test n’est pas disponible pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div>
      {header}
      <Eyebrow className="mb-3">Question {answers.length + 1}</Eyebrow>
      <Card>
        {current.context && (
          <p
            lang={info.code}
            dir={info.dir}
            className="mb-4 rounded-2xl bg-surface-sunk px-4 py-3 text-[15px] leading-relaxed"
          >
            {current.context}
          </p>
        )}
        <p lang={info.code} dir={info.dir} className="font-serif text-xl leading-snug font-medium">
          <Prompt text={current.prompt} />
        </p>
      </Card>
      <div key={current.id} className="mt-4 space-y-2.5">
        {current.options.map((option, index) => (
          <button
            key={index}
            type="button"
            lang={info.code}
            dir={info.dir}
            onClick={() => answer(index)}
            className="min-h-11 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-start text-[15px] leading-snug transition-colors hover:border-ink-soft"
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          onClick={() => answer(null)}
          className="flex min-h-11 w-full items-center justify-center gap-1 rounded-2xl px-4 py-3 text-sm font-medium text-muted hover:text-ink"
        >
          Je ne sais pas
          <ArrowRightIcon width={14} height={14} />
        </button>
      </div>
    </div>
  );
}
