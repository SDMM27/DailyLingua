"use client";

import { MAX_ANSWER_CHARS, type UnitItem } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { matchRightOrder, misplacedTiles, orderTiles, sentenceOf, serializeMatch, type Tile } from "@/lib/units/flow";
import { Icon } from "./icons";
import { useClip } from "./use-clip";

type Of<K extends UnitItem["kind"]> = Extract<UnitItem, { kind: K }>;

interface ViewProps<K extends UnitItem["kind"]> {
  item: Of<K>;
  language: string;
  locale: "fr" | "en";
  /** The item is not editable (feedback is open, or the step is over). */
  locked: boolean;
  /** The last try was wrong: the wrong parts are marked (by a border and a word, never by colour alone). */
  wrong: boolean;
  /** Called with the answer in the format `gradeUnitItem` reads, or null while the item is incomplete. */
  onAnswer(answer: string | null): void;
}

/** The instruction (meta line) of an item. */
export function useKindLabel() {
  const t = useTranslations("exercise.kinds");
  const order = useTranslations("wordOrder");
  return (kind: UnitItem["kind"]) => (kind === "order" ? order("instruction") : t(kind));
}

/** An item to answer: its prompt and the widget of its kind. Remount it (change its `key`) to start it over. */
export function ItemView(props: ViewProps<UnitItem["kind"]> & { item: UnitItem }) {
  const { item } = props;
  switch (item.kind) {
    case "mcq":
    case "listen_mcq":
      return <ChoiceItem {...props} item={item} />;
    case "order":
      return <OrderItem {...props} item={item} />;
    case "cloze":
      return <ClozeItem {...props} item={item} />;
    case "type":
      return <TypeItem {...props} item={item} />;
    case "match":
      return <MatchItem {...props} item={item} />;
  }
}

const OPTION = "flex min-h-14 w-full items-center gap-3 rounded-xl border-[1.5px] bg-surface px-4 py-2 text-start text-[17px]";

/** A play button that tells why it does not play (audio not made yet, or failed to load). */
export function ClipButton({ path, label, className = "", quiet = false }: { path: string | null; label: string; className?: string; quiet?: boolean }) {
  const reader = useTranslations("reader");
  const unit = useTranslations("unit");
  const clip = useClip();
  const unavailable = clip.state === "unavailable";
  const disabled = path === null || unavailable;
  return (
    <div className={className}>
      <button
        type="button"
        aria-label={label}
        aria-disabled={disabled}
        onClick={() => path && !unavailable && clip.play(path)}
        className={`grid size-[52px] place-items-center rounded-full text-accent-strong shadow-[inset_0_0_0_1.5px_var(--sd-border-strong)] ${disabled ? "opacity-60" : ""}`}
      >
        <Icon name="speaker" />
      </button>
      {disabled && !quiet && <p role="status" className="mt-1 text-sm text-muted">{path === null ? reader("audioPending") : unit("audioUnavailable")}</p>}
    </div>
  );
}

function ChoiceItem({ item, language, locale, locked, wrong, onAnswer }: ViewProps<"mcq" | "listen_mcq">) {
  const t = useTranslations("exercise");
  const [chosen, setChosen] = useState<string | null>(null);
  const prompt = typeof item.prompt === "string" ? { text: item.prompt, lang: language } : { text: item.prompt[locale], lang: locale };
  return (
    <div className="space-y-5">
      <p className="font-display text-[26px] leading-tight" lang={prompt.lang} dir="auto">{prompt.text}</p>
      {item.kind === "listen_mcq" ? <ClipButton path={item.audio} label={t("listen")} /> : item.audio ? <ClipButton path={item.audio} label={t("listen")} /> : null}
      <div role="radiogroup" aria-label={t(`kinds.${item.kind}`)} className="space-y-2.5">
        {item.options.map((option) => {
          const selected = chosen === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={locked}
              lang={language}
              dir="auto"
              onClick={() => { setChosen(option.id); onAnswer(option.id); }}
              className={`${OPTION} ${selected ? (wrong ? "border-error" : "border-accent shadow-[0_0_0_1px_var(--sd-accent)]") : "border-border-strong"}`}
            >
              <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-accent" : "border-border-strong"}`}>
                {selected && <span className="size-2.5 rounded-full bg-accent" />}
              </span>
              <span className="min-w-0 break-words">{option.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrderItem({ item, language, locale, locked, wrong, onAnswer }: ViewProps<"order">) {
  const t = useTranslations("wordOrder");
  const [tiles] = useState<Tile[]>(() => orderTiles(item));
  const [placed, setPlaced] = useState<Tile[]>([]);
  const [said, setSaid] = useState("");
  const bad = wrong ? misplacedTiles(item, placed) : new Set<string>();
  const placedIds = new Set(placed.map((tile) => tile.id));

  function change(next: Tile[], message: string) {
    setPlaced(next);
    setSaid(message);
    onAnswer(next.length > 0 ? sentenceOf(next) : null);
  }
  const tileClass = (state: "base" | "bad") =>
    `inline-flex min-h-[52px] items-center rounded-[10px] border-[1.5px] bg-surface px-4 font-display text-[22px] leading-none ${state === "bad" ? "border-error shadow-[0_2px_0_var(--sd-error)]" : "border-border-strong shadow-[0_2px_0_var(--sd-border-strong)]"}`;

  return (
    <div className="space-y-7">
      <p className="font-display text-[26px] leading-tight" lang={locale}>{item.prompt[locale]}</p>
      <ol aria-label={t("answer")} lang={language} dir="auto" className="flex min-h-[136px] flex-wrap content-end gap-2.5 border-b-2 border-ink pb-3">
        {placed.map((tile, position) => (
          <li key={tile.id}>
            <button
              type="button"
              disabled={locked}
              className={tileClass(bad.has(tile.id) ? "bad" : "base")}
              onClick={() => change(placed.filter((entry) => entry.id !== tile.id), t("removed", { word: tile.text }))}
            >
              {tile.text}
              {bad.has(tile.id) && <span className="sr-only"> ({position + 1})</span>}
            </button>
          </li>
        ))}
      </ol>
      <ul aria-label={t("bank")} lang={language} dir="auto" className="flex flex-wrap gap-2.5">
        {tiles.map((tile) =>
          placedIds.has(tile.id) ? (
            <li key={tile.id} aria-hidden="true" className="min-h-[52px] rounded-[10px] border-[1.5px] border-dashed border-border-strong px-4 font-display text-[22px] leading-[49px] text-transparent">
              {tile.text}
            </li>
          ) : (
            <li key={tile.id}>
              <button
                type="button"
                disabled={locked}
                className={tileClass("base")}
                onClick={() => change([...placed, tile], t("placed", { word: tile.text, position: placed.length + 1 }))}
              >
                {tile.text}
              </button>
            </li>
          ),
        )}
      </ul>
      <p role="status" aria-live="polite" className="sr-only">{said}</p>
    </div>
  );
}

const FIELD = "min-h-12 w-full rounded-xl border-[1.5px] bg-surface px-3 text-xl";

function ClozeItem({ item, language, locale, locked, wrong, onAnswer }: ViewProps<"cloze">) {
  const t = useTranslations("dailySession");
  const [value, setValue] = useState("");
  return (
    <div className="space-y-5">
      <p className="font-display text-[26px] leading-snug" lang={language} dir="auto">
        {item.before}
        <span aria-hidden="true" className="mx-1 inline-block min-w-14 border-b-2 border-ink h-[1.1em] align-baseline"> </span>
        {item.after}
      </p>
      {item.hint && <p className="text-sm text-muted" lang={locale}>{item.hint[locale]}</p>}
      <label className="block space-y-2">
        <span className="text-sm text-muted">{t("answer")}</span>
        <input
          className={`${FIELD} ${wrong ? "border-error" : "border-border-strong"}`}
          value={value}
          disabled={locked}
          lang={language}
          dir="auto"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={MAX_ANSWER_CHARS}
          onChange={(event) => { setValue(event.target.value); onAnswer(event.target.value.trim() || null); }}
        />
      </label>
    </div>
  );
}

function TypeItem({ item, language, locale, locked, wrong, onAnswer }: ViewProps<"type">) {
  const t = useTranslations("dailySession");
  const [value, setValue] = useState("");
  return (
    <div className="space-y-5">
      <p className="font-display text-[26px] leading-tight" lang={locale}>{item.prompt[locale]}</p>
      <label className="block space-y-2">
        <span className="text-sm text-muted">{t("answer")}</span>
        <input
          className={`${FIELD} ${wrong ? "border-error" : "border-border-strong"}`}
          value={value}
          disabled={locked}
          lang={language}
          dir="auto"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={MAX_ANSWER_CHARS}
          onChange={(event) => { setValue(event.target.value); onAnswer(event.target.value.trim() || null); }}
        />
      </label>
    </div>
  );
}

/** Touch a phrase, then its translation, to pair them; a paired phrase is touched again to undo. */
function MatchItem({ item, language, locale, locked, wrong, onAnswer }: ViewProps<"match">) {
  const t = useTranslations("exercise.match");
  const [rights] = useState(() => matchRightOrder(item));
  const [pairing, setPairing] = useState<Record<number, number>>({});
  const [leftPick, setLeftPick] = useState<number | null>(null);
  const [said, setSaid] = useState("");
  const rightTaken = new Set(Object.values(pairing));

  function commit(next: Record<number, number>, message: string) {
    setPairing(next);
    setLeftPick(null);
    setSaid(message);
    onAnswer(Object.keys(next).length === item.pairs.length ? serializeMatch(next) : null);
  }
  function pickLeft(left: number) {
    if (locked) return;
    if (left in pairing) {
      const { [left]: removed, ...rest } = pairing;
      void removed;
      commit(rest, "");
    } else setLeftPick(left === leftPick ? null : left);
  }
  function pickRight(right: number) {
    if (locked || leftPick === null || rightTaken.has(right)) return;
    commit({ ...pairing, [leftPick]: right }, t("paired", { left: item.pairs[leftPick]!.left, right: item.pairs[right]!.right[locale] }));
  }
  // Pair `i` goes with answer `i`. Once the item is locked, a pair that does not match is marked as wrong, never green.
  const pairWrong = (left: number) => wrong || (locked && pairing[left] !== left);
  const side = (state: "idle" | "picked" | "paired", failed = false) =>
    `flex min-h-14 w-full items-center rounded-xl border-[1.5px] bg-surface px-3 py-2 text-start text-base ${
      state === "picked" ? "border-accent shadow-[0_0_0_1px_var(--sd-accent)]" : state === "paired" ? (failed ? "border-error" : "border-success") : "border-border-strong"
    }`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <ul aria-label={t("left")} lang={language} dir="auto" className="space-y-2.5">
          {item.pairs.map((pair, left) => (
            <li key={pair.left}>
              <button type="button" disabled={locked} aria-pressed={leftPick === left || left in pairing} className={side(left in pairing ? "paired" : leftPick === left ? "picked" : "idle", pairWrong(left))} onClick={() => pickLeft(left)}>
                {left in pairing && <b aria-hidden="true" className="me-2 font-mono text-xs">{left + 1}</b>}
                {pair.left}
              </button>
            </li>
          ))}
        </ul>
        <ul aria-label={t("right")} lang={locale} className="space-y-2.5">
          {rights.map((right) => (
            <li key={right}>
              <button type="button" disabled={locked || rightTaken.has(right)} className={side(rightTaken.has(right) ? "paired" : "idle", pairWrong(Number(Object.entries(pairing).find(([, taken]) => taken === right)?.[0])))} onClick={() => pickRight(right)}>
                {rightTaken.has(right) && <b aria-hidden="true" className="me-2 font-mono text-xs">{Number(Object.entries(pairing).find(([, taken]) => taken === right)?.[0]) + 1}</b>}
                {item.pairs[right]!.right[locale]}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <button type="button" disabled={locked || Object.keys(pairing).length === 0} onClick={() => commit({}, "")} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-accent-strong underline underline-offset-4 disabled:opacity-40">
        {t("reset")}
      </button>
      <p role="status" aria-live="polite" className="sr-only">{said}</p>
    </div>
  );
}
