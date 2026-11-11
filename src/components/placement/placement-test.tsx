"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { completePlacementTest } from "@/app/actions/placement";
import { ArrowRightIcon } from "@/components/icons";
import { buttonClass, Columns, Eyebrow, LanguageTag } from "@/components/ui/primitives";
import { ALPHABET_SCRIPT_NAMES } from "@/lib/domain/alphabet";
import { PLACEMENT_CONFIDENCE_LABELS } from "@/lib/domain/labels";
import { languageInfo } from "@/lib/domain/languages";
import { nextPlacementStep, pickPlacementItem, shufflePlacementItems } from "@/lib/domain/placement";
import type { AlphabetScript } from "@/lib/schemas/alphabet";
import { CEFR_LEVELS, type CefrLevel, type Language } from "@/lib/schemas/common";
import {
  PLACEMENT_GAP,
  PLACEMENT_MAX_ITEMS,
  type PlacementAnswer,
  type PlacementItem,
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
  startLevel,
  persist,
  alphabet,
  assessmentAvailable = false,
}: {
  language: Language;
  /** The questions of the language; shuffled once per test, the engine picks which to ask. */
  items: PlacementItem[];
  /** The declared level: the test starts there. */
  startLevel: CefrLevel;
  persist: boolean;
  /** Set when the language has an alphabet the learner has not completed: the intro points to it. */
  alphabet?: { script: AlphabetScript };
  /** A full assessment (a dossier per skill) can be taken for this language: the result proposes it. */
  assessmentAvailable?: boolean;
}) {
  const router = useRouter();
  const info = languageInfo(language);
  const [phase, setPhase] = useState<Phase>("intro");
  // The order is drawn when a test starts (never during render), so a retest asks other questions.
  const [order, setOrder] = useState<PlacementItem[]>(items);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [chosen, setChosen] = useState<CefrLevel | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const responses = answers.flatMap((a) => {
    const item = items.find((i) => i.id === a.itemId);
    return item ? [{ level: item.level, correct: a.choice === item.answer }] : [];
  });
  const step = phase === "intro" ? null : nextPlacementStep(startLevel, responses);
  const current =
    step?.kind === "ask" ? pickPlacementItem(order, step.level, new Set(answers.map((a) => a.itemId))) : null;
  const result = step?.kind === "done" ? step : null;

  function answer(choice: number | null) {
    if (!current) return;
    const next = [...answers, { itemId: current.id, choice }];
    setAnswers(next);
    if (nextPlacementStep(startLevel, [...responses, { level: current.level, correct: choice === current.answer }]).kind === "done") {
      setPhase("result");
    }
  }

  function start() {
    setOrder(shufflePlacementItems(items));
    setPhase("questions");
  }

  function restart() {
    setOrder(items);
    setAnswers([]);
    setChosen(null);
    setError(null);
    setPhase("intro");
  }

  /** Saves the level, then goes to the level list, or on to the full assessment. */
  async function save(next: "levels" | "assessment" = "levels") {
    if (!result) return;
    setSaving(true);
    setError(null);
    const outcome = await completePlacementTest({
      language,
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
    router.push(next === "assessment" ? `/niveau/${language}/bilan` : "/niveau");
    router.refresh();
  }

  const header = (
    <div className="mb-8 flex items-center justify-between gap-3 border-b border-line pb-3">
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
        <Columns
          main={
            <section className="max-w-[68ch]">
              <Eyebrow>Comment ça marche</Eyebrow>
              <p className="mt-3 font-serif text-xl leading-relaxed text-ink-soft">
                Un test adaptatif de {info.nameFr.toLowerCase()} : jusqu’à {PLACEMENT_MAX_ITEMS} questions, une dizaine de minutes. Le niveau des
                questions change selon tes réponses, il n’y a rien à préparer.
              </p>
              <p className="mt-4 font-serif text-xl leading-relaxed text-ink-soft">
                Si tu ne sais pas, choisis « Je ne sais pas » plutôt que de deviner : cette réponse compte comme
                fausse, mais elle donne une estimation plus juste qu’un coup de chance.
              </p>
              {alphabet && (
                <p className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
                  Tu ne lis pas encore {ALPHABET_SCRIPT_NAMES[alphabet.script]} ?{" "}
                  <Link href={`/alphabet?langue=${language}`} className="font-medium text-accent-strong underline underline-offset-2">
                    Commence par l’alphabet.
                  </Link>{" "}
                  Tu le lis déjà ?{" "}
                  <Link href={`/alphabet/${language}/test`} className="font-medium text-accent-strong underline underline-offset-2">
                    Vérifie-le en 10 mots.
                  </Link>
                </p>
              )}
            </section>
          }
          aside={
            <div className="space-y-3 border-t border-ink pt-5 lg:border-t-0 lg:pt-0">
              <button type="button" onClick={start} className={`${buttonClass.primary} w-full`}>
                Commencer
              </button>
              <Link href="/niveau" className={`${buttonClass.quiet} w-full`}>
                Passer le test
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  if (phase === "result" && result) {
    const level = chosen ?? result.estimate;
    const confidence = PLACEMENT_CONFIDENCE_LABELS[result.confidence];
    return (
      <div>
        {header}
        <Columns
          main={
            <section>
              <Eyebrow>Niveau estimé</Eyebrow>
              <p className="sd-stamp sd-display mt-4 inline-block border-4 border-accent-strong px-6 py-2 text-7xl leading-none text-accent-strong">
                {result.estimate}
              </p>
              <p className="mt-5 font-serif text-2xl font-bold italic">Confiance {confidence.title}</p>
              <p className="mt-1 max-w-[68ch] font-serif text-lg leading-relaxed text-ink-soft">{confidence.hint}</p>
            </section>
          }
          aside={
            <div className="space-y-6 border-t border-ink pt-5 lg:border-t-0 lg:pt-0">
              <label className="block">
                <span className="kicker mb-1 block text-muted">Niveau à retenir</span>
                <select
                  value={level}
                  onChange={(e) => setChosen(e.target.value as CefrLevel)}
                  className="min-h-11 w-full appearance-none rounded-xl border border-ink bg-surface px-3.5 py-2.5 text-base font-semibold focus:outline-none"
                >
                  {CEFR_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <p className="-mt-4 text-xs text-muted">
                Niveau déclaré actuellement : {startLevel}. Tu peux garder l’estimation ou choisir un autre niveau.
              </p>
              <div className="space-y-3">
                {persist && assessmentAvailable ? (
                  <>
                    <p className="text-sm leading-relaxed text-ink-soft">
                      Pour aller plus loin, le bilan complet mesure chaque compétence (lire, écouter, écrire, parler) : compte 20 à 25
                      minutes. Ton niveau est enregistré dans les deux cas.
                    </p>
                    <button type="button" onClick={() => save("assessment")} disabled={saving} className={`${buttonClass.primary} w-full`}>
                      {saving ? "Enregistrement…" : "Faire mon bilan complet"}
                    </button>
                    <button type="button" onClick={() => save()} disabled={saving} className={`${buttonClass.secondary} w-full`}>
                      Plus tard
                    </button>
                  </>
                ) : persist ? (
                  <button type="button" onClick={() => save()} disabled={saving} className={`${buttonClass.primary} w-full`}>
                    {saving ? "Enregistrement…" : "Enregistrer ce niveau"}
                  </button>
                ) : (
                  <p className="border-y border-dashed border-line py-2.5 text-sm text-muted">
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
                <button type="button" onClick={restart} disabled={saving} className={`${buttonClass.quiet} w-full`}>
                  Recommencer
                </button>
              </div>
            </div>
          }
        />
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
      <div className="mb-6">
        <Eyebrow>
          Question {answers.length + 1} sur {PLACEMENT_MAX_ITEMS} max
        </Eyebrow>
        <div
          role="progressbar"
          aria-label="Progression du test"
          aria-valuemin={0}
          aria-valuemax={PLACEMENT_MAX_ITEMS}
          aria-valuenow={answers.length}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunk"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${(answers.length / PLACEMENT_MAX_ITEMS) * 100}%` }}
          />
        </div>
      </div>
      <div className="grid gap-8 border-t border-ink pt-6 lg:grid-cols-2 lg:gap-0">
        <section className="lg:pr-10">
          {current.context && (
            <p
              lang={info.code}
              dir={info.dir}
              className="mb-4 max-w-[68ch] border-y border-line py-3 text-[15px] leading-relaxed text-ink-soft"
            >
              {current.context}
            </p>
          )}
          <p lang={info.code} dir={info.dir} className="max-w-[68ch] font-serif text-2xl leading-snug font-medium sm:text-3xl">
            <Prompt text={current.prompt} />
          </p>
        </section>
        <div key={current.id} className="space-y-2.5 lg:border-l lg:border-line lg:pl-10">
          {current.options.map((option, index) => (
            <button
              key={index}
              type="button"
              lang={info.code}
              dir={info.dir}
              onClick={() => answer(index)}
              className="min-h-11 w-full rounded-xl border border-line bg-surface px-4 py-3 text-start text-base leading-snug transition-colors hover:border-ink"
            >
              {option}
            </button>
          ))}
          <button
            type="button"
            onClick={() => answer(null)}
            className="flex min-h-11 w-full items-center justify-center gap-1 rounded-xl px-4 py-3 text-sm font-medium text-muted hover:text-ink"
          >
            Je ne sais pas
            <ArrowRightIcon width={14} height={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
