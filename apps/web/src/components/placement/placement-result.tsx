"use client";

import { cefrLevels, type CefrLevel, type PlacementConfidence } from "@dailylingua/schemas";
import { useTranslations } from "next-intl";
import { confidenceBars } from "@/lib/placement/progress";

const OTHER_SKILLS = ["listening", "writing", "speaking"] as const;

/** Three bars, 1 to 3 filled; named for assistive technology. */
export function ConfidenceBars({ confidence }: { confidence: PlacementConfidence }) {
  const t = useTranslations("placement.result.confidence");
  const filled = confidenceBars(confidence);
  return (
    <span role="img" aria-label={t(confidence)} className="ms-3 inline-flex items-center gap-1 align-middle">
      {[1, 2, 3].map((bar) => <i key={bar} className={`h-1.5 w-3.5 rounded-sm ${bar <= filled ? "bg-accent" : "bg-line"}`} />)}
    </span>
  );
}

/** A1 to C2 as six buttons: below the selection soft, the selection solid, above plain. Touching a level selects it. */
export function LevelScale({ selected, onSelect }: { selected: CefrLevel; onSelect(level: CefrLevel): void }) {
  const t = useTranslations("placement.result");
  const at = cefrLevels.indexOf(selected);
  return (
    <div role="group" aria-label={t("scale")} className="my-5 grid grid-cols-6 gap-1">
      {cefrLevels.map((level, index) => (
        <button
          key={level}
          type="button"
          aria-pressed={level === selected}
          onClick={() => onSelect(level)}
          className={`relative min-h-11 rounded-lg pt-9 pb-3 text-center text-[13px] font-semibold before:absolute before:inset-x-0 before:top-0 before:h-[26px] before:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${index < at ? "text-muted before:bg-accent-soft" : index === at ? "text-ink before:bg-accent" : "text-muted before:bg-line"}`}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

/**
 * The result: the estimated level with its confidence, the scale to keep it or pick another level, and the skills (only
 * reading is measured by this test). The footer button lives in the flow.
 */
export function PlacementResult({ estimate, confidence, answered, selected, onSelect }: {
  estimate: CefrLevel;
  confidence: PlacementConfidence;
  answered: number;
  selected: CefrLevel;
  onSelect(level: CefrLevel): void;
}) {
  const t = useTranslations("placement.result");
  const progress = useTranslations("progress");
  return (
    <div className="pt-4">
      <p className="meta">{t("estimated")}</p>
      <p className="font-display text-[64px] leading-none font-medium">
        {estimate}
        <ConfidenceBars confidence={confidence} />
      </p>
      <p className="mt-3 text-muted">{t(`summary.${confidence}`, { count: answered })}</p>
      <LevelScale selected={selected} onSelect={onSelect} />
      {selected !== estimate && <p className="-mt-2 mb-4 text-muted" role="status">{t("estimate", { level: estimate })}</p>}
      <ul className="rounded-3xl border border-line bg-surface px-6 py-2">
        <li className="flex min-h-14 items-center justify-between gap-3">
          <span>{progress("reading")}</span>
          <span className="font-semibold text-success">{t("measured", { level: selected })}</span>
        </li>
        {OTHER_SKILLS.map((skill) => (
          <li key={skill} className="flex min-h-14 items-center justify-between gap-3 border-t border-line">
            <span>{progress(skill)}</span>
            <span className="meta rounded-full bg-surface-2 px-2.5 py-1">{progress("unmeasured")}</span>
          </li>
        ))}
      </ul>
      <p className="pt-4 text-muted">{t("readingNote")}</p>
    </div>
  );
}
