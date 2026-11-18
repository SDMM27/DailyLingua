import type { ReactNode } from "react";

export interface Choice {
  value: string;
  label: ReactNode;
  /** Secondary line or tag, shown before the label (e.g. the CEFR code). */
  meta?: ReactNode;
}

/**
 * A single choice among a few or many rows: native radio buttons (keyboard and screen readers for
 * free) drawn as 48 px rows with a filled dot on the selected one.
 */
export function ChoiceList({
  name,
  labelledBy,
  choices,
  value,
  onChange,
  className = "",
}: {
  name: string;
  labelledBy: string;
  choices: readonly Choice[];
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className={`divide-y divide-line ${className}`.trim()}>
      {choices.map((choice) => (
        <label
          key={choice.value}
          className="flex min-h-12 cursor-pointer items-center gap-3 px-2 py-2 has-[:checked]:bg-surface-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
        >
          <input
            type="radio"
            name={name}
            value={choice.value}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="size-5 shrink-0 rounded-full border-2 border-muted peer-checked:border-[6px] peer-checked:border-accent"
          />
          <span className="min-w-0 flex-1">
            {choice.meta && <span className="meta me-2">{choice.meta}</span>}
            {choice.label}
          </span>
        </label>
      ))}
    </div>
  );
}
