import { useTranslations } from "next-intl";
import type { RailState, SegmentState } from "@/lib/placement/progress";

const SEGMENT: Record<SegmentState, string> = { done: "bg-accent", current: "bg-lang", todo: "bg-line" };

/** Six segments, one per block of five questions. Decorative: the real progress is the text "Question 7". */
export function PlacementSteps({ segments }: { segments: SegmentState[] }) {
  return (
    <div aria-hidden="true" className="flex min-w-0 flex-1 gap-1.5">
      {segments.map((state, index) => <i key={index} className={`h-1.5 flex-1 rounded-full ${SEGMENT[state]}`} />)}
    </div>
  );
}

/** The levels visited, on a wide screen only (a phone has the steps). */
export function LevelsRail({ levels }: { levels: { level: string; state: RailState }[] }) {
  const t = useTranslations("placement.rail");
  return (
    <aside className="sticky top-6 hidden self-start min-[900px]:block">
      <p className="meta">{t("title")}</p>
      <ol className="mt-4">
        {levels.map(({ level, state }) => (
          <li key={level} aria-current={state === "current" ? "step" : undefined}
            className={`flex items-center gap-3 py-2.5 ${state === "idle" ? "text-muted" : "text-ink"}`}>
            <b className={`grid size-9 place-items-center rounded-[10px] text-[13px] ${state === "mastered" ? "bg-accent text-accent-ink" : state === "current" ? "bg-lang text-on-lang" : "bg-surface-2"}`}>{level}</b>
            {state === "mastered" ? t("mastered") : state === "current" ? t("current") : null}
          </li>
        ))}
      </ol>
    </aside>
  );
}
